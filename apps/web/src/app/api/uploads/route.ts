import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import { createDocument } from '../../../lib/documents';

export const runtime = 'nodejs';

export function getServiceRoleClient() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL missing: uploads require service role client');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing: uploads require service role in dev/test');
  }
  // In dev/test we bypass RLS using the service-role client.
  // TODO: replace with Supabase Auth + RLS when login/signup is wired.
  return createClient(url, key);
}

// TODO: re-enable OCR worker integration (PR #3)
// For now we stub this out so uploads succeed in dev/test.
async function queueOcrJob(_docId: string, _storagePath: string) {
  console.warn('[uploads] OCR worker not available; skipping');
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

    const admin = getServiceRoleClient();
    const { error: upErr } = await (admin as any).storage.from('documents').upload(storagePath, buf, { contentType: mime, upsert: false });
    if (upErr) return NextResponse.json({ error: 'upload failed', details: upErr.message || '' }, { status: 500 });

    const doc = await createDocument({ personId, kind: kindFromMime(mime), filename: fileName, storagePath, sha256 });

    await queueOcrJob(doc.id, storagePath);

    return NextResponse.json({ documentId: doc.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
