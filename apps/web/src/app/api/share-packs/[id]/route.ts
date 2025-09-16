import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { computeTrendSnippet } from '@/lib/trends';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

function cookieName(id: string) { return `sp_${id}`; }
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const pack = await prisma.sharePack.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            document: { select: { id: true, filename: true, storagePath: true } },
            observation: {
              select: {
                id: true,
                code: true,
                display: true,
                valueNum: true,
                unit: true,
                effectiveAt: true,
                refLow: true,
                refHigh: true,
                sourceDocId: true,
                personId: true,
              },
            },
          },
        },
      },
    });
    if (!pack) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (pack.revokedAt) return NextResponse.json({ error: 'revoked' }, { status: 403 });
    if (pack.expiresAt && pack.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: 'expired' }, { status: 403 });

    const cookie = req.cookies.get(cookieName(id));
    if (!cookie || cookie.value !== 'ok') return NextResponse.json({ error: 'verify required' }, { status: 401 });

    const admin = getAdmin();
    const documents = await Promise.all(
      pack.items
        .filter((item) => item.document)
        .map(async (item) => {
          const doc = item.document!;
          let signedUrl: string | null = null;
          if (admin) {
            const { data } = await (admin as any).storage.from('documents').createSignedUrl(doc.storagePath, 3600);
            signedUrl = data?.signedUrl ?? null;
          }
          return { id: doc.id, filename: doc.filename, storagePath: doc.storagePath, signedUrl };
        }),
    );
    const documentUrlById = new Map(documents.map((doc) => [doc.id, { signedUrl: doc.signedUrl, storagePath: doc.storagePath }]));

    const observationItems = pack.items.filter((item) => item.observation);
    const codes = Array.from(new Set(observationItems.map((item) => item.observation!.code).filter(Boolean)));
    const historyByCode = new Map<string, Array<{ valueNum: number | null; effectiveAt: Date | null; refLow: number | null; refHigh: number | null }>>();

    if (codes.length) {
      const history = await prisma.observation.findMany({
        where: { personId: pack.personId, code: { in: codes } },
        orderBy: { effectiveAt: 'asc' },
      });
      for (const entry of history) {
        if (!historyByCode.has(entry.code)) historyByCode.set(entry.code, []);
        historyByCode.get(entry.code)!.push({
          valueNum: entry.valueNum,
          effectiveAt: entry.effectiveAt,
          refLow: entry.refLow ?? null,
          refHigh: entry.refHigh ?? null,
        });
      }
    }

    const observations = await Promise.all(
      observationItems.map(async (item) => {
        const obs = item.observation!;
        const history = historyByCode.get(obs.code) || [{
          valueNum: obs.valueNum,
          effectiveAt: obs.effectiveAt,
          refLow: obs.refLow ?? null,
          refHigh: obs.refHigh ?? null,
        }];
        const trend = computeTrendSnippet(history);

        let sourceDocumentSignedUrl = obs.sourceDocId ? documentUrlById.get(obs.sourceDocId)?.signedUrl ?? null : null;
        if (!sourceDocumentSignedUrl && admin && obs.sourceDocId) {
          const source = await prisma.document.findUnique({ where: { id: obs.sourceDocId } });
          if (source) {
            const { data } = await (admin as any).storage.from('documents').createSignedUrl(source.storagePath, 3600);
            sourceDocumentSignedUrl = data?.signedUrl ?? null;
            if (sourceDocumentSignedUrl) {
              documentUrlById.set(source.id, { signedUrl: sourceDocumentSignedUrl, storagePath: source.storagePath });
            }
          }
        }

        return {
          id: obs.id,
          code: obs.code,
          display: obs.display,
          valueNum: obs.valueNum,
          unit: obs.unit,
          effectiveAt: obs.effectiveAt,
          refLow: obs.refLow,
          refHigh: obs.refHigh,
          sourceDocId: obs.sourceDocId,
          trend,
          sourceDocumentSignedUrl,
        };
      }),
    );

    const ip = req.headers.get('x-forwarded-for') || '';
    const pepper = process.env.SHARE_LINK_PEPPER || '';
    const ipHash = crypto.createHash('sha256').update(pepper + ip).digest('hex');
    await prisma.shareEvent.create({ data: { packId: id, kind: 'view', ipHash } });
    await prisma.sharePack.update({ where: { id }, data: { viewsCount: (pack.viewsCount || 0) + 1 } });

    return NextResponse.json({
      id,
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
