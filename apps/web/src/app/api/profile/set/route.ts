import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUserId } from '@/lib/auth'

export const runtime = 'nodejs'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    // Auth check - validate session instead of trusting body userId
    const authenticatedUserId = await requireUserId(req)

    const { profilePartial } = await req.json()
    if (!profilePartial || typeof profilePartial !== 'object') {
      return NextResponse.json({ error: 'profilePartial required' }, { status: 400 })
    }

    // Use authenticated userId instead of accepting it from request body
    const userId = authenticatedUserId
    const admin = adminClient()
    if (!admin) return NextResponse.json({ error: 'missing supabase env' }, { status: 500 })
    const { data: row } = await (admin as any).from('user_graph').select('profile').eq('user_id', userId).maybeSingle()
    const current = (row as any)?.profile || {}
    const merged: any = { ...(current || {}) }
    for (const k of Object.keys(profilePartial)) {
      merged[k] = (profilePartial as any)[k]
    }
    merged.updated_at = new Date().toISOString()
    await (admin as any).from('user_graph').upsert({ user_id: userId, profile: merged }, { onConflict: 'user_id' })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

