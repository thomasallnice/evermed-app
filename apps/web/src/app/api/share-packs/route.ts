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

    const passcodeHash = hashPasscode(String(passcode), process.env.SHARE_LINK_PEPPER || '');
    const expiresAt = new Date(Date.now() + (Math.max(1, Number(expiryDays || 7)) * 24 * 3600 * 1000));

    const pack = await prisma.sharePack.create({ data: { personId, title, audience, passcodeHash, expiresAt } });

    // Create items
    for (const it of Array.isArray(items) ? items : []) {
      const documentId = it?.documentId ? String(it.documentId) : undefined;
      const observationId = it?.observationId ? String(it.observationId) : undefined;
      if (!documentId && !observationId) continue;
      await prisma.sharePackItem.create({ data: { packId: pack.id, documentId, observationId } });
    }

    return NextResponse.json({ shareId: pack.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
