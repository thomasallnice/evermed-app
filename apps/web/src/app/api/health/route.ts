import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const openaiKey = process.env.OPENAI_API_KEY || ''

const B4 = (process.env.MEDGEMMA_B4_URL || process.env.MEDGEMMA_API_URL || '').replace(/\/$/, '')
const AUTH_SCHEME = (process.env.MEDGEMMA_AUTH_SCHEME || '').toLowerCase()
const TOKEN = process.env.MEDGEMMA_TOKEN || ''
const TIMEOUT_MS = Number(process.env.MEDGEMMA_TIMEOUT_MS || 30000)

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  return (p as any).finally(() => clearTimeout(t))
}

export async function GET() {
  const result: any = {
    env: {
      supabaseUrl: Boolean(supabaseUrl),
      serviceKey: Boolean(serviceKey),
      openaiKey: Boolean(openaiKey),
      medgemmaUrl: Boolean(B4),
      medgemmaToken: Boolean(TOKEN),
    },
    checks: {},
  }

  // Supabase check (optional query)
  try {
    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey)
      const { error } = await admin.from('documents').select('id', { count: 'exact', head: true }).limit(1)
      result.checks.supabase = error ? { ok: false, error: error.message } : { ok: true }
    } else {
      result.checks.supabase = { ok: false, error: 'missing env' }
    }
  } catch (e: any) {
    result.checks.supabase = { ok: false, error: e?.message || 'supabase error' }
  }

  // OpenAI check (env presence only)
  result.checks.openai = { ok: Boolean(openaiKey) }

  // MedGemma check is opt-in to avoid warming endpoints
  try {
    const shouldCheck = String(process.env.HEALTH_CHECK_MEDGEMMA || '').toLowerCase() === 'true'
    if (shouldCheck && B4) {
      const headers: Record<string, string> = {}
      if (AUTH_SCHEME === 'bearer' && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
      const res = await withTimeout(fetch(`${B4}/info`, { headers }), TIMEOUT_MS)
      result.checks.medgemma = { ok: res.ok, status: res.status }
    } else {
      result.checks.medgemma = { ok: false, skipped: true }
    }
  } catch (e: any) {
    result.checks.medgemma = { ok: false, error: e?.message || 'medgemma error' }
  }

  return NextResponse.json(result)
}
