import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const a = admin()
    if (!a) return NextResponse.json({ error: 'missing supabase env' }, { status: 500 })

    // Best-effort: delete Storage objects under userId prefix
    try {
      const bucket = (a as any).storage.from('documents')
      async function delPrefix(prefix: string) {
        const { data: list } = await bucket.list(prefix, { limit: 1000, offset: 0 })
        const files = (list || []).filter((x: any) => x?.name).map((x: any) => `${prefix ? prefix + '/' : ''}${x.name}`)
        if (files.length) await bucket.remove(files)
      }
      await delPrefix(userId)
    } catch {}

    // Optional sanity check on email match (non-blocking)
    try {
      const { data } = await (a as any).auth.admin.listUsers({ perPage: 1, page: 1 })
      // Skip: listUsers can’t filter; deletion will proceed regardless
    } catch {}

    // Delete auth user (cascades to app tables)
    await (a as any).auth.admin.deleteUser(userId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

