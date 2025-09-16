import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { createDocument } from '@/lib/documents';
import { runOcr } from '@/lib/ocr';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

function kindFromMime(m: string) {
  if (m.includes('pdf')) return 'pdf';
  if (m.startsWith('image/')) return 'image';
  return 'note';
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as unknown as File;
    const personId = String(form.get('personId') || '');
    if (!file || !personId) return NextResponse.json({ error: 'file and personId required' }, { status: 400 });
    const fileName = (file as any).name || 'upload.bin';
    const mime = (file as any).type || 'application/octet-stream';
    const ab = await (file as any).arrayBuffer();
    const buf = Buffer.from(ab);
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const storagePath = `${personId}/${Date.now()}-${fileName}`;

    const admin = getAdmin();
    const { error: upErr } = await (admin as any).storage.from('documents').upload(storagePath, buf, { contentType: mime, upsert: false });
    if (upErr) return NextResponse.json({ error: 'upload failed', details: upErr.message || '' }, { status: 500 });

    const kind = kindFromMime(mime);
    const doc = await createDocument({ personId, kind, filename: fileName, storagePath, sha256, topic: null });

    if (kind === 'pdf' || kind === 'image') {
      try {
        const ocrResult = await runOcr(buf, mime);
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
            }
          }
        }
      } catch (error: any) {
        console.warn('[uploads] failed to store OCR text', error?.message || error);
      }
    }

    return NextResponse.json({ documentId: doc.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
