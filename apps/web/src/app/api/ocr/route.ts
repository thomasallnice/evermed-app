import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUserId } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const userId = await requireUserId(req)

    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createClient(url, key)
    const { data: doc, error: docErr } = await admin
      .from('documents')
      .select('id,user_id,storage_path,file_name,file_type')
      .eq('id', documentId)
      .single()
    if (docErr || !doc) return NextResponse.json({ error: 'doc not found' }, { status: 404 })

    const fileType = String((doc as any).file_type || '')
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ skipped: true, reason: 'not an image' })
    }

    const { data: dl, error: dlErr } = await (admin as any).storage.from('documents').download((doc as any).storage_path)
    if (!dl || dlErr) return NextResponse.json({ error: 'download failed', details: dlErr?.message || '' }, { status: 500 })
    // @ts-ignore
    const ab = typeof dl.arrayBuffer === 'function' ? await dl.arrayBuffer() : await new Response(dl).arrayBuffer()

    const EXTRACT_URL = process.env.PDF_EXTRACT_URL || ''
    const EXTRACT_BEARER = process.env.PDF_EXTRACT_BEARER || ''
    // Normalize common non-standard type
    const postType = fileType === 'image/jpg' ? 'image/jpeg' : fileType
    if (!EXTRACT_URL) return NextResponse.json({ error: 'extractor not configured' }, { status: 500 })

    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), Number(process.env.PDF_EXTRACT_TIMEOUT_MS || 20000))
    const res = await fetch(EXTRACT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': postType,
        'Accept': 'application/json,text/plain',
        ...(EXTRACT_BEARER ? { Authorization: `Bearer ${EXTRACT_BEARER}` } : {}),
      },
      body: Buffer.from(ab),
      signal: ac.signal,
    })
    clearTimeout(t)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json({ error: 'ocr http error', status: res.status, body }, { status: 502 })
    }
    let text = ''
    const ctype = res.headers.get('content-type') || ''
    if (ctype.includes('application/json')) {
      const j = await res.json().catch(() => ({} as any))
      text = String(j?.text || '')
    } else {
      text = await res.text()
    }
    text = (text || '').trim()
    if (!text) return NextResponse.json({ skipped: true, reason: 'no text from image' })

    await admin
      .from('doc_texts')
      .upsert({ document_id: documentId, user_id: (doc as any).user_id, text }, { onConflict: 'document_id' })

    return NextResponse.json({ ok: true, chars: text.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
