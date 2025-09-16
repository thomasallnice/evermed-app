import { NextRequest, NextResponse } from 'next/server';
import { getDocumentAuthorized } from '@/lib/documents';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id') || '';
  if (!userId) {
    return NextResponse.json({ status: 'error', error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ status: 'error', error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const data = await getDocumentAuthorized(params.id, userId);
    if (!data) {
      return NextResponse.json({ status: 'error', error: 'not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message || 'Unexpected';
    const normalized = typeof message === 'string' && message.includes('Supabase env missing')
      ? 'Supabase not configured'
      : message;
    console.error('[documents] failed to create signed URL', error);
    return NextResponse.json({ status: 'error', error: normalized || 'Unexpected' }, { status: 500 });
  }
}
