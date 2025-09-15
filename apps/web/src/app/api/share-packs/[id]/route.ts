import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

function cookieName(id: string) { return `sp_${id}`; }
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const pack = await prisma.sharePack.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            document: true,
            observation: true,
          },
        },
      },
    });
    if (!pack) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (pack.revokedAt) return NextResponse.json({ error: 'revoked' }, { status: 403 });
    if (pack.expiresAt && pack.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: 'expired' }, { status: 403 });

    const cookie = req.cookies.get(cookieName(id));
    if (!cookie || cookie.value !== 'ok') return NextResponse.json({ error: 'verify required' }, { status: 401 });

    // Shape response strictly to selected items; no vault exposure
    const documents = pack.items
      .filter((i) => i.document)
      .map((i) => ({ id: i.document!.id, filename: i.document!.filename, storagePath: i.document!.storagePath }));
    const observations = pack.items
      .filter((i) => i.observation)
      .map((i) => ({ id: i.observation!.id, code: i.observation!.code, display: i.observation!.display, valueNum: i.observation!.valueNum }));

    const ip = req.headers.get('x-forwarded-for') || '';
    const pepper = process.env.SHARE_LINK_PEPPER || '';
    const ipHash = crypto.createHash('sha256').update(pepper + ip).digest('hex');
    await prisma.shareEvent.create({ data: { packId: id, kind: 'view', ipHash } });
    await prisma.sharePack.update({ where: { id }, data: { viewsCount: (pack.viewsCount || 0) + 1 } });

    return NextResponse.json({ id, title: pack.title, audience: pack.audience, expiresAt: pack.expiresAt, documents, observations });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
