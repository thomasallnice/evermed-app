import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { createDocument } from '../../../lib/documents';

export const runtime = 'nodejs';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  // TODO: replace service role bypass with proper Supabase Auth + RLS enforcement
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

    const doc = await createDocument({ personId, kind: kindFromMime(mime), filename: fileName, storagePath, sha256 });

    // Best-effort OCR job (dynamic import to avoid test env resolution issues)
    try {
      // @ts-ignore dynamic import for optional worker in tests
      const mod = await import('../../../../../apps/workers/ocr');
      (mod as any).queueOcrJob?.(doc.id, storagePath).catch?.(() => {});
    } catch {}

    return NextResponse.json({ documentId: doc.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
