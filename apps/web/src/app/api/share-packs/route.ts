import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { hashPasscode } from '@/lib/passcode';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type NormalizedItem = { documentId?: string; observationId?: string };

function normalizeItems(raw: unknown[]): NormalizedItem[] {
  const result: NormalizedItem[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      result.push({ documentId: entry });
      continue;
    }
    if (entry && typeof entry === 'object') {
      const maybe = entry as Record<string, unknown>;
      const documentId = typeof maybe.documentId === 'string' ? maybe.documentId : undefined;
      const observationId = typeof maybe.observationId === 'string' ? maybe.observationId : undefined;
      if (documentId) result.push({ documentId });
      else if (observationId) result.push({ observationId });
    }
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personId, title, audience, items = [], expiryDays, passcode } = body || {};
    if (!personId || !title || !audience) {
      return NextResponse.json({ error: 'personId, title, audience required' }, { status: 400 });
    }
    if (!passcode || String(passcode).length < 4) {
      return NextResponse.json({ error: 'passcode required' }, { status: 400 });
    }

    const pepper = process.env.SHARE_LINK_PEPPER;
    if (!pepper) {
      return NextResponse.json({ error: 'SHARE_LINK_PEPPER missing' }, { status: 500 });
    }

    const passcodeHash = hashPasscode(String(passcode), pepper);
    const expiresAt = new Date(Date.now() + Math.max(1, Number(expiryDays || 7)) * 24 * 3600 * 1000);
    const normalizedItems = normalizeItems(Array.isArray(items) ? items : []);

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
              },
            },
          },
        },
      },
    });

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
          return {
            id: doc.id,
            filename: doc.filename,
            storagePath: doc.storagePath,
            signedUrl,
          };
        }),
    );

    const observations = pack.items
      .filter((item) => item.observation)
      .map((item) => {
        const o = item.observation!;
        return {
          id: o.id,
          code: o.code,
          display: o.display,
          valueNum: o.valueNum,
          unit: o.unit,
          effectiveAt: o.effectiveAt,
          refLow: o.refLow,
          refHigh: o.refHigh,
          sourceDocId: o.sourceDocId,
        };
      });

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
