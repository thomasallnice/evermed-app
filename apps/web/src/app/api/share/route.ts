import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase admin env')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })
    const admin = adminClient()
    const { data: share } = await admin.from('shares').select('*').eq('token', token).maybeSingle()
    if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Expired' }, { status: 410 })
    }
    const docIds: string[] = share.payload?.docIds || []
    if (docIds.length === 0) return NextResponse.json({ documents: [] })
    const { data: documents } = await admin.from('documents').select('*').in('id', docIds)
    return NextResponse.json({ documents })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const docIds: string[] = body.docIds || []
    const ttlHours = Number(body.ttlHours || 24)
    if (docIds.length === 0) return NextResponse.json({ error: 'docIds required' }, { status: 400 })
    const token = crypto.randomUUID().replace(/-/g, '')
    const expires_at = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
    const admin = adminClient()
    const { error } = await admin.from('shares').insert({ token, expires_at, payload: { docIds } })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const base = process.env.NEXT_PUBLIC_APP_URL || ''
    return NextResponse.json({ token, url: `${base}/share/${token}` })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}

