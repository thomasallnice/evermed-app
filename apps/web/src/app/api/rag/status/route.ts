import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUserId } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const userId = await requireUserId(req)

    const documentId = req.nextUrl.searchParams.get('documentId')
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return NextResponse.json({ error: 'missing supabase env' }, { status: 500 })
    const admin = createClient(url, key)
    const { data: doc } = await admin.from('rag_documents').select('id').eq('document_id', documentId).maybeSingle()
    if (!doc) return NextResponse.json({ chunks: 0 })
    const { count } = await admin.from('rag_chunks').select('*', { count: 'exact', head: true }).eq('document_id', (doc as any).id)
    return NextResponse.json({ chunks: count || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}

