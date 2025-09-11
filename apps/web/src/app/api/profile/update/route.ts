import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractProfileFromText } from '@/lib/profile/update'

export const runtime = 'nodejs'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json()
    if (!userId || !message) {
      return NextResponse.json({ error: 'userId and message required' }, { status: 400 })
    }
    const admin = adminClient()
    if (!admin) return NextResponse.json({ error: 'missing supabase env' }, { status: 500 })

    // Read current profile
    const { data: row } = await (admin as any).from('user_graph').select('profile').eq('user_id', userId).maybeSingle()
    const current = (row as any)?.profile || {}

    const partial = await extractProfileFromText(String(message || ''))
    if (!partial || Object.keys(partial).length === 0) {
      return NextResponse.json({ saved: {}, previous: {} })
    }

    // Compute merged and changes
    const merged: any = { ...(current || {}) }
    const previous: any = {}
    const saved: any = {}
    for (const k of Object.keys(partial)) {
      const v = (partial as any)[k]
      const cur = (current as any)[k]
      if (Array.isArray(v)) {
        const prevArr = Array.isArray(cur) ? cur : []
        const next = Array.from(new Set([...(prevArr as any[]), ...v].map((x) => String(x))))
        if (JSON.stringify(next) !== JSON.stringify(prevArr)) {
          previous[k] = prevArr
          saved[k] = v
          merged[k] = next
        }
      } else if (v !== null && v !== undefined && v !== '') {
        if (v !== cur) {
          previous[k] = cur
          saved[k] = v
          merged[k] = v
        }
      }
    }

    if (Object.keys(saved).length === 0) {
      return NextResponse.json({ saved: {}, previous: {} })
    }

    merged.updated_at = new Date().toISOString()
    await (admin as any).from('user_graph').upsert({ user_id: userId, profile: merged }, { onConflict: 'user_id' })

    // If name was provided/changed, also update auth user metadata so it shows in Profile
    try {
      if (typeof saved.name === 'string' && saved.name.trim()) {
        await (admin as any).auth.admin.updateUserById(userId, { user_metadata: { name: String(saved.name).trim() } })
      }
    } catch {}

    return NextResponse.json({ saved, previous })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
