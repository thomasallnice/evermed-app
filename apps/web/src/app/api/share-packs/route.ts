import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPasscode } from '../../../lib/passcode';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personId, title, audience, items = [], expiryDays, passcode } = body || {};
    if (!personId || !title || !audience) return NextResponse.json({ error: 'personId, title, audience required' }, { status: 400 });
    if (!passcode || String(passcode).length < 4) return NextResponse.json({ error: 'passcode required' }, { status: 400 });

    const passcodeHash = hashPasscode(String(passcode), process.env.SHARE_LINK_PEPPER || '');
    const expiresAt = new Date(Date.now() + (Math.max(1, Number(expiryDays || 7)) * 24 * 3600 * 1000));

    // Normalize items: support strings (documentId) or objects {documentId}|{observationId}
    const normalized = (Array.isArray(items) ? items : [])
      .map((it: any) => (typeof it === 'string' ? { documentId: it } : it))
      .filter((it: any) => it && (it.documentId || it.observationId))
      .map((it: any) => ({ documentId: it.documentId ?? undefined, observationId: it.observationId ?? undefined }));

    const pack = await prisma.sharePack.create({
      data: {
        personId,
        title,
        audience,
        passcodeHash,
        expiresAt,
        ...(normalized.length
          ? { items: { create: normalized } }
          : {}),
      },
      include: { items: { include: { document: true, observation: true } } },
    });

    const documents = pack.items
      .filter((i) => i.document)
      .map((i) => ({ id: i.document!.id, filename: i.document!.filename, storagePath: i.document!.storagePath }));
    const observations = pack.items
      .filter((i) => i.observation)
      .map((i) => ({ id: i.observation!.id, code: i.observation!.code, display: i.observation!.display, valueNum: i.observation!.valueNum }));

    return NextResponse.json({ shareId: pack.id, id: pack.id, title: pack.title, audience: pack.audience, expiresAt: pack.expiresAt, documents, observations });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
