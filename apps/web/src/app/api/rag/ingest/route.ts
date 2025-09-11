import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_EMBED_MODEL = process.env.OPENAI_MODEL_EMBED || 'text-embedding-3-small'
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_MODEL_OCR = process.env.OPENAI_MODEL_SUMMARY || process.env.OPENAI_MODEL || 'gpt-5-mini'
const PDF_EXTRACT_URL = process.env.PDF_EXTRACT_URL || ''
const PDF_EXTRACT_BEARER = process.env.PDF_EXTRACT_BEARER || ''
const PDF_EXTRACT_TIMEOUT_MS = Number(process.env.PDF_EXTRACT_TIMEOUT_MS || 20000)
const PDF_DEBUG = String(process.env.PDF_DEBUG || process.env.DEBUG_PDF || '').toLowerCase() === 'true'
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || process.env.OPENAI_ORGANIZATION || ''
const EXPECTED_EMBED_DIM = 1536 // matches `vector(1536)` in 002_rag.sql

async function embedBatch(texts: string[]) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}`, ...(OPENAI_ORG_ID ? { 'OpenAI-Organization': OPENAI_ORG_ID } : {}) },
    body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: texts })
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.data.map((d: any) => d.embedding as number[])
}

function chunkText(text: string, size = 1500, overlap = 150) {
  // Ensure forward progress and avoid infinite loops for short texts
  if (size <= 0) size = 1500
  if (overlap < 0) overlap = 0
  if (overlap >= size) overlap = Math.floor(size / 3)
  const step = Math.max(1, size - overlap)
  const chunks: string[] = []
  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(text.length, start + size)
    chunks.push(text.slice(start, end))
    if (end === text.length) break
  }
  return chunks
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: doc, error: docErr } = await admin.from('documents').select('id,user_id,storage_path,file_name,file_type').eq('id', documentId).single()
    if (docErr || !doc) return NextResponse.json({ error: 'doc not found', details: docErr?.message || '' }, { status: 404 })

    // Only ingest text/pdf
    let text = ''
    // 1) Try cached extracted text first
    try {
      const { data: cached } = await admin
        .from('doc_texts')
        .select('text')
        .eq('document_id', documentId)
        .maybeSingle()
      const cachedText = (cached as any)?.text as string | undefined
      if (cachedText && cachedText.trim()) {
        text = cachedText
      }
    } catch {}
    const lowerPath = String(doc.storage_path || '').toLowerCase()
    const fileType = String(doc.file_type || '')
    let isPdf = Boolean(fileType.toLowerCase().includes('pdf') || lowerPath.endsWith('.pdf'))
    const isText = Boolean(fileType.toLowerCase().startsWith('text/') || fileType === 'application/rtf' || fileType === 'text/html')
    const isImage = Boolean(fileType.toLowerCase().startsWith('image/'))
    // Debug trackers
    let lastPdfSize = 0
    let extractorTried = false
    let extractorStatusDbg: number | null = null
    let extractorLenDbg = 0
    if (!text && isText) {
      const { data: dl, error: dlErr } = await (admin as any).storage.from('documents').download(doc.storage_path)
      if (!dl || dlErr) return NextResponse.json({ error: 'download failed', details: dlErr?.message || '' }, { status: 500 })
      // @ts-ignore
      const ab = typeof dl.arrayBuffer === 'function' ? await dl.arrayBuffer() : await new Response(dl).arrayBuffer()
      const dec = new TextDecoder()
      text = dec.decode(new Uint8Array(ab))
      if (text && text.trim()) {
        try {
          await admin
            .from('doc_texts')
            .upsert({ document_id: documentId, user_id: doc.user_id, text }, { onConflict: 'document_id' })
        } catch {}
      }
    } else if (!text && (isPdf)) {
      try {
        const { data: dl, error: dlErr } = await (admin as any).storage.from('documents').download(doc.storage_path)
        if (!dl || dlErr) return NextResponse.json({ error: 'download failed', details: dlErr?.message || '' }, { status: 500 })
        // @ts-ignore
        const ab = typeof dl.arrayBuffer === 'function' ? await dl.arrayBuffer() : await new Response(dl).arrayBuffer()
        const buf = Buffer.from(ab)
        lastPdfSize = ab.byteLength || 0
        let txt = ''
        try {
          const pdfParse = (await import('pdf-parse')).default as any
          const parsed = await pdfParse(buf)
          txt = String(parsed?.text || '')
        } catch {}
        // pdfjs-dist fallback removed in serverless; external extractor will be used if pdf-parse fails
        let extractorStatus: number | null = null
        let extractorLen = 0
        if (!txt && PDF_EXTRACT_URL && ab.byteLength <= MAX_PDF_BYTES) {
          try {
            const ac = new AbortController()
            const t = setTimeout(() => ac.abort(), PDF_EXTRACT_TIMEOUT_MS)
            const res = await fetch(PDF_EXTRACT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/pdf',
                'Accept': 'application/json,text/plain',
                ...(PDF_EXTRACT_BEARER ? { Authorization: `Bearer ${PDF_EXTRACT_BEARER}` } : {}),
              },
              body: Buffer.from(ab),
              signal: ac.signal,
            })
            clearTimeout(t)
            extractorStatus = res.status
            extractorTried = true
            if (res.ok) {
              let ext = ''
              const ctype = res.headers.get('content-type') || ''
              if (ctype.includes('application/json')) {
                const j = await res.json().catch(() => ({} as any))
                ext = String(j?.text || '')
              } else {
                ext = await res.text()
              }
              txt = String(ext || '')
              extractorLen = txt.length
              extractorLenDbg = extractorLen
              extractorStatusDbg = extractorStatus
            } else if (PDF_DEBUG) {
              const body = await res.text().catch(() => '')
              return NextResponse.json({ error: 'external extractor http error', status: res.status, body }, { status: 502 })
            }
          } catch (e: any) {
            if (PDF_DEBUG) {
              return NextResponse.json({ error: 'external extractor failed', details: e?.message || '' }, { status: 502 })
            }
          }
        }
        text = txt
        // Cache extracted text for future runs
        if (text && text.trim()) {
          try {
            await admin
              .from('doc_texts')
              .upsert({ document_id: documentId, user_id: doc.user_id, text }, { onConflict: 'document_id' })
          } catch {}
        }
      } catch (e: any) {
        return NextResponse.json({ error: 'pdf parse failed', details: e?.message || '' }, { status: 500 })
      }
    } else if (!text && isImage) {
      // OCR or describe images via external extractor or OpenAI Vision
      try {
        const { data: dl, error: dlErr } = await (admin as any).storage.from('documents').download(doc.storage_path)
        if (!dl || dlErr) return NextResponse.json({ error: 'download failed', details: dlErr?.message || '' }, { status: 500 })
        // @ts-ignore
        const ab = typeof dl.arrayBuffer === 'function' ? await dl.arrayBuffer() : await new Response(dl).arrayBuffer()

        async function ocrWithVision(): Promise<string> {
          if (!OPENAI_API_KEY) return ''
          try {
            const b64 = Buffer.from(ab).toString('base64')
            const postType = fileType === 'image/jpg' ? 'image/jpeg' : (fileType || 'image/jpeg')
            const payload = {
              model: OPENAI_MODEL_OCR,
              messages: [
                { role: 'system', content: 'You are a precise OCR engine. Return only the extracted text, no extra words.' },
                { role: 'user', content: [ { type: 'image_url', image_url: { url: `data:${postType};base64,${b64}` } }, { type: 'text', text: 'Extract all readable text. Plain text only.' } ] },
              ],
            }
            const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}`, ...(OPENAI_ORG_ID ? { 'OpenAI-Organization': OPENAI_ORG_ID } : {}) },
              body: JSON.stringify(payload)
            })
            if (!res.ok) return ''
            const j = await res.json()
            const out = String(j?.choices?.[0]?.message?.content || '').trim()
            return out
          } catch { return '' }
        }

        async function describeWithVision(): Promise<string> {
          if (!OPENAI_API_KEY) return ''
          try {
            const b64 = Buffer.from(ab).toString('base64')
            const postType = fileType === 'image/jpg' ? 'image/jpeg' : (fileType || 'image/jpeg')
            const payload = {
              model: OPENAI_MODEL_OCR, // reuse interpret/summary model for description
              input: [
                { role: 'user', content: [
                  { type: 'input_image', image_url: `data:${postType};base64,${b64}` },
                  { type: 'input_text', text: 'Briefly describe this medical image to aid retrieval. Mention the subject (e.g., left forearm skin), visible findings, and likely category (photo/x-ray). Keep to 2-3 sentences.' }
                ]}
              ],
              reasoning: { effort: 'minimal' },
              text: { verbosity: 'low' }
            }
            const send = async (bb: any) => fetch(`${OPENAI_BASE_URL}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}`, ...(OPENAI_ORG_ID ? { 'OpenAI-Organization': OPENAI_ORG_ID } : {}) }, body: JSON.stringify(bb) })
            let res = await send(payload)
            if (!res.ok) {
              try {
                const err = await res.clone().json()
                const code = String(err?.error?.code || '')
                const param = String(err?.error?.param || '')
                const msg = String(err?.error?.message || '').toLowerCase()
                const unsupported = code === 'unsupported_parameter' && (param.startsWith('reasoning') || param.startsWith('text'))
                if (unsupported || msg.includes('reasoning') || msg.includes('verbosity')) {
                  const cleaned: any = { ...payload }
                  try { delete cleaned.reasoning } catch {}
                  try { delete cleaned.text } catch {}
                  res = await send(cleaned)
                }
              } catch {}
            }
            if (!res.ok) return ''
            const j = await res.json()
            let text = ''
            const outText = (j as any)?.output_text
            if (typeof outText === 'string') text = outText
            else if (Array.isArray(outText)) {
              const uniq = Array.from(new Set(outText.filter((s: any) => typeof s === 'string')))
              text = uniq.join('')
            }
            if (!text) {
              const parts: string[] = []
              const out = (j as any)?.output || []
              for (const item of out) {
                const content = item?.content || []
                for (const c of content) {
                  const t = (c && typeof c === 'object' && 'text' in c) ? String((c as any).text || '') : ''
                  if (t) parts.push(t)
                }
              }
              const uniq = Array.from(new Set(parts))
              text = uniq.join('') || ''
            }
            return String(text || '').trim()
          } catch { return '' }
        }

        if (!PDF_EXTRACT_URL) {
          // No extractor configured: try Vision OCR, else image description
          let v = await ocrWithVision()
          if (!v) v = await describeWithVision()
          if (v) {
            text = v
          } else {
            return NextResponse.json({ skipped: true, reason: 'no text from image' })
          }
        } else {
          try {
            const ac = new AbortController()
            const t = setTimeout(() => ac.abort(), PDF_EXTRACT_TIMEOUT_MS)
            // Normalize jpg → jpeg
            const postType = fileType === 'image/jpg' ? 'image/jpeg' : fileType
            const res = await fetch(PDF_EXTRACT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': postType,
                'Accept': 'application/json,text/plain',
                ...(PDF_EXTRACT_BEARER ? { Authorization: `Bearer ${PDF_EXTRACT_BEARER}` } : {}),
              },
              body: Buffer.from(ab),
              signal: ac.signal,
            })
            clearTimeout(t)
            if (!res.ok) {
              // Extractor failed: try Vision OCR or description before surfacing error
              let v = await ocrWithVision()
              if (!v) v = await describeWithVision()
              if (v) {
                text = v
              } else if (PDF_DEBUG) {
                const body = await res.text().catch(() => '')
                return NextResponse.json({ error: 'image ocr http error', status: res.status, body }, { status: 502 })
              }
            } else {
              let ext = ''
              const ctype = res.headers.get('content-type') || ''
              if (ctype.includes('application/json')) {
                const j = await res.json().catch(() => ({} as any))
                ext = String(j?.text || '')
              } else {
                ext = await res.text()
              }
              text = String(ext || '').trim()
              // If extractor yielded nothing (common for photos), try a brief description
              if (!text) {
                const v = await describeWithVision()
                if (v) text = v
              }
              if (text) {
                try {
                  await admin
                    .from('doc_texts')
                    .upsert({ document_id: documentId, user_id: (doc as any).user_id, text }, { onConflict: 'document_id' })
                } catch {}
              }
            }
          } catch (e: any) {
            // Network/timeout error from extractor: attempt OCR or description
            let v = await ocrWithVision()
            if (!v) v = await describeWithVision()
            if (v) {
              text = v
            } else if (PDF_DEBUG) {
              return NextResponse.json({ error: 'image ocr failed', details: e?.message || '' }, { status: 502 })
            }
          }
        }
      } catch (e: any) {
        return NextResponse.json({ error: 'download failed', details: e?.message || '' }, { status: 500 })
      }
      if (!text) {
        return NextResponse.json({ skipped: true, reason: 'no text from image' })
      }
    } else {
      // Unknown content-type: try to sniff if it's a PDF by magic bytes
      try {
        const { data: dl, error: dlErr } = await (admin as any).storage.from('documents').download(doc.storage_path)
        if (!dl || dlErr) return NextResponse.json({ error: 'download failed', details: dlErr?.message || '' }, { status: 500 })
        // @ts-ignore
        const ab = typeof dl.arrayBuffer === 'function' ? await dl.arrayBuffer() : await new Response(dl).arrayBuffer()
        const u8 = new Uint8Array(ab.slice(0, 8))
        const isPdfByMagic = u8.length >= 4 && u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46 // %PDF
        if (!isPdfByMagic) {
          return NextResponse.json({ skipped: true, reason: 'non-text/pdf' })
        }
        // Treat as PDF and parse using same path
        const buf = Buffer.from(ab)
        let txt = ''
        try {
          const pdfParse = (await import('pdf-parse')).default as any
          const parsed = await pdfParse(buf)
          txt = String(parsed?.text || '')
        } catch {}
        // External extractor if needed
        if (!txt && PDF_EXTRACT_URL && ab.byteLength <= MAX_PDF_BYTES) {
          try {
            const ac = new AbortController()
            const t = setTimeout(() => ac.abort(), PDF_EXTRACT_TIMEOUT_MS)
            const res = await fetch(PDF_EXTRACT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/pdf',
                'Accept': 'application/json,text/plain',
                ...(PDF_EXTRACT_BEARER ? { Authorization: `Bearer ${PDF_EXTRACT_BEARER}` } : {}),
              },
              body: Buffer.from(ab),
              signal: ac.signal,
            })
            clearTimeout(t)
            if (res.ok) {
              let ext = ''
              const ctype = res.headers.get('content-type') || ''
              if (ctype.includes('application/json')) {
                const j = await res.json().catch(() => ({} as any))
                ext = String(j?.text || '')
              } else {
                ext = await res.text()
              }
              txt = String(ext || '')
            } else if (PDF_DEBUG) {
              const body = await res.text().catch(() => '')
              return NextResponse.json({ error: 'external extractor http error', status: res.status, body }, { status: 502 })
            }
          } catch (e: any) {
            if (PDF_DEBUG) {
              return NextResponse.json({ error: 'external extractor failed', details: e?.message || '' }, { status: 502 })
            }
          }
        }
        text = (txt || '').trim()
        if (!text) {
          return NextResponse.json({ skipped: true, reason: 'no text from document' })
        }
      } catch (e: any) {
        return NextResponse.json({ error: 'download failed', details: e?.message || '' }, { status: 500 })
      }
    }

    text = (text || '').trim()
    if (!text) {
      if (PDF_DEBUG) {
        return NextResponse.json({ skipped: true, reason: 'no text from document', debug: { isPdf, isText, size: lastPdfSize, maxBytes: MAX_PDF_BYTES, extractorConfigured: Boolean(PDF_EXTRACT_URL), extractorTried, extractorStatus: extractorStatusDbg, extractorLen: extractorLenDbg } })
      }
      return NextResponse.json({ skipped: true, reason: 'no text from document' })
    }

    const chunks = chunkText(text)
    // Generate embeddings
    const embeddings = await embedBatch(chunks)
    const dim = embeddings?.[0]?.length || 0
    if (!dim) return NextResponse.json({ error: 'Embedding generation failed' }, { status: 502 })
    if (dim !== EXPECTED_EMBED_DIM) {
      return NextResponse.json({
        error: 'Embedding dimension mismatch',
        details: {
          model: OPENAI_EMBED_MODEL,
          got: dim,
          expected: EXPECTED_EMBED_DIM,
          hint: 'Ensure 002_rag.sql is applied and OPENAI_MODEL_EMBED matches table dimension. Try `supabase db reset` in local dev.'
        }
      }, { status: 400 })
    }

    // Upsert rag_document
    const { data: rid, error: ridErr } = await admin.rpc('upsert_rag_document', { p_user: doc.user_id, p_document: doc.id, p_file_name: doc.file_name })
    if (ridErr || !rid) {
      return NextResponse.json({ error: 'upsert_rag_document failed', details: ridErr?.message || 'no id returned' }, { status: 500 })
    }
    const ragDocId = String(rid)

    // Insert chunks
    let inserted = 0
    const errors: Array<{ index: number; error: string }> = []
    for (let i = 0; i < chunks.length; i++) {
      const e = embeddings[i]
      const vectorText = `[${e.join(',')}]`
      const { error: insErr } = await admin.rpc('insert_rag_chunk', { p_doc: ragDocId, p_index: i, p_content: chunks[i], p_tokens: Math.ceil(chunks[i].length / 4), p_embedding_text: vectorText })
      if (insErr) {
        errors.push({ index: i, error: insErr.message || 'insert error' })
      } else {
        inserted++
      }
    }

    if (inserted === 0) {
      return NextResponse.json({ error: 'no chunks inserted', details: errors }, { status: 500 })
    }

    return NextResponse.json({ ok: true, chunks: inserted, errors: errors.length ? errors : undefined })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
export const runtime = 'nodejs'
const MAX_PDF_BYTES = Number(process.env.PDF_MAX_BYTES || 25_000_000)
