import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const userId = req.headers.get('x-user-id') || '';
    const pack = await prisma.sharePack.findUnique({ where: { id }, include: { person: true } });
    if (!pack) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (!pack.person || pack.person.ownerId !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    await prisma.sharePack.update({ where: { id }, data: { revokedAt: new Date() } });
    await prisma.shareEvent.create({ data: { packId: id, kind: 'revoke' } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

