import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: { person: true },
    });
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (!doc.person || doc.person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(doc.storagePath, 600);
    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || 'failed to create signed url' }, { status: 500 });
    }

    return NextResponse.json({
      id: doc.id,
      filename: doc.filename,
      signedUrl: data.signedUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
