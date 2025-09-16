import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { createDocument } from '@/lib/documents';
import { runOcr } from '@/lib/ocr';
import { embedBatch } from '@/lib/embedding';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key, { auth: { persistSession: false } });
}

function kindFromMime(m: string) {
  if (m.includes('pdf')) return 'pdf';
  if (m.startsWith('image/')) return 'image';
  return 'note';
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const form = await req.formData();
    const file = form.get('file') as unknown as File;
    const personId = String(form.get('personId') || '');
    if (!file || !personId) {
      return NextResponse.json({ error: 'file and personId required' }, { status: 400 });
    }

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const fileName = (file as any).name || 'upload.bin';
    const mime = (file as any).type || 'application/octet-stream';
    const ab = await (file as any).arrayBuffer();
    const buffer = Buffer.from(ab);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const storagePath = `${personId}/${Date.now()}-${fileName}`;

    const admin = getAdmin();
    const { error: upErr } = await admin.storage.from('documents').upload(storagePath, buffer, { contentType: mime, upsert: false });
    if (upErr) {
      return NextResponse.json({ error: 'upload failed', details: upErr.message || '' }, { status: 500 });
    }

    const kind = kindFromMime(mime);
    const doc = await createDocument({ personId, kind, filename: fileName, storagePath, sha256, topic: null });

    if (kind === 'pdf' || kind === 'image') {
      try {
        const ocrResult = await runOcr(buffer, mime);
        if (ocrResult?.text) {
          const normalized = ocrResult.text.replace(/\r\n/g, '\n').trim();
          if (normalized) {
            const CHUNK_SIZE = 4000;
            const chunks: string[] = [];
            for (let i = 0; i < normalized.length; i += CHUNK_SIZE) {
              chunks.push(normalized.slice(i, i + CHUNK_SIZE));
            }
            if (chunks.length) {
              await prisma.docChunk.createMany({
                data: chunks.map((text, idx) => ({
                  documentId: doc.id,
                  chunkId: idx,
                  text,
                  sourceAnchor: null,
                })),
              });

              const embeddings = await embedBatch(chunks);
              for (let idx = 0; idx < embeddings.length; idx += 1) {
                const embedding = embeddings[idx];
                if (!embedding) continue;
                const vectorLiteral = `[${embedding.join(',')}]`;
                await prisma.$executeRawUnsafe(
                  `UPDATE "DocChunk" SET embedding = '${vectorLiteral}'::vector WHERE "documentId" = $1 AND "chunkId" = $2`,
                  doc.id,
                  idx,
                );
              }
            }
          }
        }
      } catch (error: any) {
        console.warn('[uploads] OCR/embedding pipeline failed', error?.message || error);
      }
    }

    return NextResponse.json({ documentId: doc.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
