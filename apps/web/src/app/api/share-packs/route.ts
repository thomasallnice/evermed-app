import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { hashPasscode } from '@/lib/passcode';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';
const prisma = new PrismaClient();

type NormalizedItem = { documentId?: string; observationId?: string };

function normalizeItems(items: unknown[]): NormalizedItem[] {
  const normalized: NormalizedItem[] = [];
  for (const raw of items) {
    if (typeof raw === 'string') {
      normalized.push({ documentId: raw });
      continue;
    }
    if (raw && typeof raw === 'object') {
      const entry = raw as Record<string, unknown>;
      const documentId = typeof entry.documentId === 'string' ? entry.documentId : undefined;
      const observationId = typeof entry.observationId === 'string' ? entry.observationId : undefined;
      if (documentId) normalized.push({ documentId });
      else if (observationId) normalized.push({ observationId });
    }
  }
  return normalized;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();
    const { personId, title, audience, items = [], expiryDays, passcode } = body || {};
    if (!personId || !title || !audience) return NextResponse.json({ error: 'personId, title, audience required' }, { status: 400 });
    if (!passcode || String(passcode).length < 4) return NextResponse.json({ error: 'passcode required' }, { status: 400 });

    const pepper = process.env.SHARE_LINK_PEPPER;
    if (!pepper) return NextResponse.json({ error: 'SHARE_LINK_PEPPER missing' }, { status: 500 });
    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const passcodeHash = hashPasscode(String(passcode), pepper);
    const expiresAt = new Date(Date.now() + (Math.max(1, Number(expiryDays || 7)) * 24 * 3600 * 1000));
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
            observation: { select: { id: true, code: true, display: true, valueNum: true, unit: true, effectiveAt: true } },
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
            const { data } = await admin.storage.from('documents').createSignedUrl(doc.storagePath, 3600);
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
      .map((item: any) => {
        const obs = item.observation!;
        return {
          id: obs.id,
          code: obs.code,
          display: obs.display,
          valueNum: obs.valueNum,
          unit: obs.unit,
          effectiveAt: obs.effectiveAt,
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
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
