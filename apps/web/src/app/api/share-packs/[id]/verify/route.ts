import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPasscode } from '@/lib/passcode';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

function cookieName(id: string) { return `sp_${id}`; }

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const { passcode } = await req.json();
    const pack = await prisma.sharePack.findUnique({ where: { id } });
    if (!pack) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (pack.revokedAt) return NextResponse.json({ error: 'revoked' }, { status: 403 });
    if (pack.expiresAt && pack.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: 'expired' }, { status: 403 });
    const ok = verifyPasscode(String(passcode || ''), pack.passcodeHash, process.env.SHARE_LINK_PEPPER || '');
    if (!ok) return NextResponse.json({ error: 'invalid' }, { status: 401 });
    const res = NextResponse.json({ ok: true });
    const maxAge = Math.max(1, Math.floor((pack.expiresAt.getTime() - Date.now()) / 1000));
    res.cookies.set(cookieName(id), 'ok', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
