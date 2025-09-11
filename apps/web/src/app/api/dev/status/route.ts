import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function hostnameFromUrl(u?: string) {
  try { return u ? new URL(u).hostname : '' } catch { return '' }
}

export async function GET(_req: NextRequest) {
  // Optional: restrict on production
  const envName = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development'
  const _isProd = envName.toLowerCase() === 'production'
  // Allow in all envs by default; uncomment to restrict
  // if (isProd) return NextResponse.json({ error: 'disabled in production' }, { status: 403 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null

  const PDF_EXTRACT_URL = process.env.PDF_EXTRACT_URL || ''
  const PDF_EXTRACT_BEARER = process.env.PDF_EXTRACT_BEARER || ''
  const PDF_USE_PDFJS_FALLBACK = String(process.env.PDF_USE_PDFJS_FALLBACK || '').toLowerCase() === 'true'
  const PDF_MAX_BYTES_RAW = process.env.PDF_MAX_BYTES || ''
  const PDF_MAX_BYTES = Number(PDF_MAX_BYTES_RAW || 25_000_000)

  const OPENAI_STREAM = String(process.env.OPENAI_STREAM || '').toLowerCase() === 'true'
  const OPENAI_MODEL = process.env.OPENAI_MODEL || ''
  const OPENAI_MODEL_SUMMARY = process.env.OPENAI_MODEL_SUMMARY || ''
  const OPENAI_MODEL_EMBED = process.env.OPENAI_MODEL_EMBED || ''
  const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

  // Metrics
  let ragChunks = null as number | null
  let ragDocs = null as number | null
  let docTexts = null as number | null
  if (admin) {
    try {
      const { count: c1 } = await admin.from('rag_chunks').select('*', { count: 'exact', head: true })
      ragChunks = c1 ?? 0
    } catch {}
    try {
      const { count: c2 } = await admin.from('rag_documents').select('*', { count: 'exact', head: true })
      ragDocs = c2 ?? 0
    } catch {}
    try {
      const { count: c3 } = await admin.from('doc_texts').select('*', { count: 'exact', head: true })
      docTexts = c3 ?? 0
    } catch {}
  }

  // Extractor health
  let pdfParseOk = false
  let pdfjsOk = false
  try {
    await import('pdf-parse')
    pdfParseOk = true
  } catch {}
  // pdfjs-dist disabled in serverless builds

  let extractorPing: any = { ok: false, skipped: true }
  if (PDF_EXTRACT_URL) {
    try {
      const res = await fetch(PDF_EXTRACT_URL, { method: 'GET', headers: { Accept: 'text/plain' } })
      // Consider any HTTP response as reachability (even 405/404)
      extractorPing = { ok: res.ok || [401,403,404,405].includes(res.status), status: res.status }
    } catch (e: any) {
      extractorPing = { ok: false, error: e?.message || 'fetch failed' }
    }
  }

  return NextResponse.json({
    deployment: {
      vercelEnv: process.env.VERCEL_ENV || '',
      vercelUrl: process.env.VERCEL_URL || '',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || '',
    },
    env: {
      environment: envName,
    },
    openai: {
      stream: OPENAI_STREAM,
      model: OPENAI_MODEL || OPENAI_MODEL_SUMMARY || 'gpt-5-mini',
      model_summary: OPENAI_MODEL_SUMMARY,
      model_embed: OPENAI_MODEL_EMBED,
      base_url: hostnameFromUrl(OPENAI_BASE_URL),
    },
    extractor: {
      configured: Boolean(PDF_EXTRACT_URL),
      url_host: hostnameFromUrl(PDF_EXTRACT_URL),
      bearer_set: Boolean(PDF_EXTRACT_BEARER),
      fallback_enabled: PDF_USE_PDFJS_FALLBACK,
      max_bytes: PDF_MAX_BYTES,
      max_bytes_raw: PDF_MAX_BYTES_RAW,
      libs: { pdf_parse: pdfParseOk, pdfjs: pdfjsOk },
      ping: extractorPing,
    },
    rag: {
      documents: ragDocs,
      chunks: ragChunks,
      cache_texts: docTexts,
    },
  })
}
