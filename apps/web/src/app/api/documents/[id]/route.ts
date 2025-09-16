import { NextRequest, NextResponse } from 'next/server';
import { getDocumentAuthorized } from '@/lib/documents';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const data = await getDocumentAuthorized(params.id, userId);
    if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

