import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPasscode } from '@/lib/passcode';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personId, title, audience, items = [], expiryDays, passcode } = body || {};
    if (!personId || !title || !audience) return NextResponse.json({ error: 'personId, title, audience required' }, { status: 400 });
    if (!passcode || String(passcode).length < 4) return NextResponse.json({ error: 'passcode required' }, { status: 400 });

    const pepper = process.env.SHARE_LINK_PEPPER;
    if (!pepper) return NextResponse.json({ error: 'SHARE_LINK_PEPPER missing' }, { status: 500 });

    const passcodeHash = hashPasscode(String(passcode), pepper);
    const expiresAt = new Date(Date.now() + (Math.max(1, Number(expiryDays || 7)) * 24 * 3600 * 1000));
    const normalizedItems = (Array.isArray(items) ? items : [])
      .map((raw) => {
        if (typeof raw === 'string') {
          return { documentId: raw };
        }
        const documentId = raw?.documentId ? String(raw.documentId) : undefined;
        const observationId = raw?.observationId ? String(raw.observationId) : undefined;
        if (documentId) return { documentId };
        if (observationId) return { observationId };
        return null;
      })
      .filter(Boolean) as Array<{ documentId?: string; observationId?: string }>;

    const pack = await prisma.sharePack.create({
      data: {
        personId,
        title,
        audience,
        passcodeHash,
        expiresAt,
        items: normalizedItems.length ? { create: normalizedItems } : undefined,
      },
      include: {
        items: {
          include: {
            document: { select: { id: true, filename: true, storagePath: true } },
            observation: { select: { id: true, code: true, display: true, valueNum: true } },
          },
        },
      },
    });

    const documents = pack.items
      .filter((item) => item.document)
      .map((item) => ({
        id: item.document!.id,
        filename: item.document!.filename,
        storagePath: item.document!.storagePath,
      }));

    const observations = pack.items
      .filter((item) => item.observation)
      .map((item) => ({
        id: item.observation!.id,
        code: item.observation!.code,
        display: item.observation!.display,
        valueNum: item.observation!.valueNum,
      }));

    return NextResponse.json({
      shareId: pack.id,
      id: pack.id,
      title: pack.title,
      audience: pack.audience,
      expiresAt: pack.expiresAt,
      documents,
      observations,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
