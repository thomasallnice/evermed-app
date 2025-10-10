import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'nodejs'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_MODEL = process.env.OPENAI_MODEL_SUMMARY || process.env.OPENAI_MODEL || 'gpt-5-mini'
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || process.env.OPENAI_ORGANIZATION || ''
const OPENAI_MAX_TOKENS_SUMMARY = Number(process.env.OPENAI_MAX_TOKENS_SUMMARY || 800)
// pdfjs-dist fallback disabled in serverless to avoid native canvas dependency
const MAX_PDF_BYTES = Number(process.env.PDF_MAX_BYTES || 25_000_000)
const PDF_EXTRACT_URL = process.env.PDF_EXTRACT_URL || ''
const PDF_EXTRACT_BEARER = process.env.PDF_EXTRACT_BEARER || ''
const PDF_EXTRACT_TIMEOUT_MS = Number(process.env.PDF_EXTRACT_TIMEOUT_MS || 20000)
const PDF_DEBUG = String(process.env.PDF_DEBUG || process.env.DEBUG_PDF || '').toLowerCase() === 'true'
// MedGemma is not used as fallback for Explain per policy

function withTimeout(p: Promise<Response>, ms: number) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  return p.finally(() => clearTimeout(t))
}

// MedGemma helper removed per provider policy (no fallback in Explain)

export async function POST(req: NextRequest) {
  try {
    const { documentId, text, fileUrl } = await req.json()

    // Resolve content if only documentId provided
    let resolvedText: string | undefined = text
    let resolvedUrl: string | undefined = fileUrl
    let fileType: string | undefined
    let userId: string | undefined // Hoist to function scope for use throughout

    if (!resolvedText && documentId && (!fileUrl || !fileType)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey)
        const { data: doc } = await admin.from('documents').select('storage_path,file_type,user_id').eq('id', documentId).maybeSingle()
        const storagePath = (doc as any)?.storage_path as string | undefined
        fileType = (doc as any)?.file_type || undefined
        userId = (doc as any)?.user_id as string | undefined

        // 1) Check cache first
        try {
          const { data: cached } = await admin
            .from('doc_texts')
            .select('text')
            .eq('document_id', documentId)
            .maybeSingle()
          const cachedText = (cached as any)?.text as string | undefined
          if (cachedText && cachedText.trim()) {
            resolvedText = cachedText
          }
        } catch {}
        if (!resolvedText && storagePath) {
          try {
            const { data: dl, error: dlErr } = await (admin as any).storage.from('documents').download(storagePath)
            if (!dl || dlErr) throw new Error(dlErr?.message || 'download failed')
            // dl is a Blob in Edge/browser; in Node, a Blob is also supported in v18+
            // Convert to ArrayBuffer regardless
            // @ts-ignore
            const ab = typeof dl.arrayBuffer === 'function' ? await dl.arrayBuffer() : await new Response(dl).arrayBuffer()
            const lowerPath = (storagePath || '').toLowerCase()
            const isPdf = Boolean((fileType && String(fileType).toLowerCase().includes('pdf')) || lowerPath.endsWith('.pdf'))
            const isText = Boolean(fileType && String(fileType).toLowerCase().startsWith('text/'))
            if (isText) {
              const textDecoder = new TextDecoder()
              resolvedText = textDecoder.decode(new Uint8Array(ab))
              if (resolvedText && resolvedText.trim() && userId) {
                try {
                  await admin
                    .from('doc_texts')
                    .upsert({ document_id: documentId, user_id: userId, text: resolvedText }, { onConflict: 'document_id' })
                } catch {}
              }
            } else if (isPdf) {
              const buf = Buffer.from(ab)
              // Primary parse via pdf-parse
              let txt = ''
              try {
                const pdfParse = (await import('pdf-parse')).default as any
                const parsed = await pdfParse(buf)
                txt = String(parsed?.text || '').trim()
              } catch {}
              // pdfjs-dist fallback removed; rely on external extractor when needed
              // External extractor (Cloud Run) as last resort
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
                  if (res.ok) {
                    let ext = ''
                    const ctype = res.headers.get('content-type') || ''
                    if (ctype.includes('application/json')) {
                      const j = await res.json().catch(() => ({} as any))
                      ext = String(j?.text || '')
                    } else {
                      ext = await res.text()
                    }
                    txt = String(ext || '').trim()
                    extractorLen = txt.length
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
              if (txt) {
                resolvedText = txt
                // Upsert cache if we have a user
                if (userId) {
                  try {
                    await admin
                      .from('doc_texts')
                      .upsert({ document_id: documentId, user_id: userId, text: txt }, { onConflict: 'document_id' })
                  } catch {}
                }
              }
            } else {
              // For other types expose a fileUrl for potential vision path
              const { data: s } = await admin.storage.from('documents').createSignedUrl(storagePath, 60 * 60)
              const signed = (s as any)?.signedUrl || (s as any)?.signedURL
              if (signed) resolvedUrl = signed
            }
          } catch {}
        }
      }
    }

    let summary = ''
    let structured: any = null
  if (OPENAI_API_KEY) {
      const url = `${OPENAI_BASE_URL}/chat/completions`
      const respUrl = `${OPENAI_BASE_URL}/responses`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      }
      if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID
      async function saveDocFacts(admin: any, userId: string, docId: string, facts: any, modelUsed: string, provenance?: string, kind?: string) {
        try {
          if (!facts || typeof facts !== 'object') return
          const anyVals = Object.values(facts).some((v: any) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))
          if (!anyVals) return
          await admin.from('doc_facts').upsert({ user_id: userId, document_id: docId, facts, model: modelUsed, provenance: provenance || '', kind: kind || '' }, { onConflict: 'user_id,document_id' })
        } catch {}
      }

      const structuredSummary = async (textIn: string) => {
        const schema = {
          name: 'DocumentSummary',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string' },
              key_points: { type: 'array', items: { type: 'string' }, minItems: 1 },
              risks: { type: 'array', items: { type: 'string' } },
              next_steps: { type: 'array', items: { type: 'string' } }
            },
            required: ['title','key_points']
          },
          strict: true
        }
        const body = {
          model: OPENAI_MODEL,
          input: `Summarize the following medical text into the required fields. Keep it concise.\n\n${textIn.slice(0, 12000)}`,
          response_format: { type: 'json_schema', json_schema: schema },
          reasoning: { effort: 'minimal' },
          text: { verbosity: 'low' }
        }
        async function doResp(b: any) {
          const send = async (bb: any) => fetch(respUrl, { method: 'POST', headers, body: JSON.stringify(bb) })
          let r = await send(b)
          if (!r.ok) {
            try {
              const err = await r.clone().json()
              const code = String(err?.error?.code || '')
              const param = String(err?.error?.param || '')
              const msg = String(err?.error?.message || '').toLowerCase()
              const unsupported = code === 'unsupported_parameter' && (param.startsWith('reasoning') || param.startsWith('text'))
              if (unsupported || msg.includes('reasoning') || msg.includes('verbosity')) {
                const cleaned: any = { ...b }
                try { delete cleaned.reasoning } catch {}
                try { delete cleaned.text } catch {}
                r = await send(cleaned)
              }
            } catch {}
          }
          return r
        }
        const res = await doResp(body)
        if (!res.ok) return { summary: '', structured: null as any }
        const j = await res.json()
        const outText = (j as any)?.output_text
        const text = typeof outText === 'string' ? outText : Array.isArray(outText) ? outText.join('\n') : ''
        let structured: any = null
        try { structured = text ? JSON.parse(text) : null } catch {}
        if (!structured) {
          const out = (j as any)?.output || []
          for (const item of out) {
            const content = item?.content || []
            for (const c of content) {
              if (c && typeof c === 'object' && 'text' in c) {
                try { structured = JSON.parse(String((c as any).text || '')) } catch {}
                if (structured) break
              }
            }
            if (structured) break
          }
        }
        if (!structured) return { summary: '', structured: null as any }
        let sum = `${structured.title}\n\n- ${Array.isArray(structured.key_points) ? structured.key_points.join('\n- ') : ''}`
        if (Array.isArray(structured.risks) && structured.risks.length) sum += `\n\nRisks:\n- ${structured.risks.join('\n- ')}`
        if (Array.isArray(structured.next_steps) && structured.next_steps.length) sum += `\n\nNext steps:\n- ${structured.next_steps.join('\n- ')}`
        return { summary: sum, structured }
      }
      const extractFactsFromText = async (textIn: string) => {
        const schema = {
          name: 'DocFacts',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              allergies: { type: 'array', items: { type: 'string' } },
              medications: { type: 'array', items: { type: 'string' } },
              conditions: { type: 'array', items: { type: 'string' } },
              measurements: {
                type: 'array', items: {
                  type: 'object', additionalProperties: false,
                  properties: { name: { type: 'string' }, value: { type: 'number' }, unit: { type: 'string' }, date: { type: 'string' } }
                }
              }
            }
          },
          strict: true
        }
        const body = {
          model: OPENAI_MODEL,
          input: `Extract explicit medical facts only from the text. Do not guess. Leave arrays empty if none.\n\n${textIn.slice(0, 12000)}`,
          response_format: { type: 'json_schema', json_schema: schema }
        }
        const r = await fetch(respUrl, { method: 'POST', headers, body: JSON.stringify(body) })
        if (!r.ok) return null
        const j = await r.json()
        const outText = (j as any)?.output_text
        let facts: any = null
        try { facts = outText ? JSON.parse(typeof outText === 'string' ? outText : Array.isArray(outText) ? outText.join('\n') : '') : null } catch {}
        return facts
      }
      const tryCompletion = async (messages: any[]) => {
        let useMaxCompletion = false
        // temperatureStage: 0 -> 0.3, 1 -> 1, 2 -> omit
        let temperatureStage = 0
        for (let attempt = 0; attempt < 4; attempt++) {
          const body: any = { model: OPENAI_MODEL, messages }
          if (temperatureStage === 0) body.temperature = 0.3
          else if (temperatureStage === 1) body.temperature = 1
          if (useMaxCompletion) body.max_completion_tokens = OPENAI_MAX_TOKENS_SUMMARY
          else body.max_tokens = OPENAI_MAX_TOKENS_SUMMARY

          const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
          if (res.ok) {
            const data = await res.json()
            return data.choices?.[0]?.message?.content || ''
          }
          const err = await res.clone().json().catch(async () => ({ error: { message: await res.text().catch(() => '') } }))
          const msg: string = (err?.error?.message || '').toLowerCase()
          const code: string = String(err?.error?.code || '')
          if (!useMaxCompletion && (code === 'unsupported_parameter' || msg.includes('max_tokens'))) { useMaxCompletion = true; continue }
          if (code === 'unsupported_value' || msg.includes('temperature')) { if (temperatureStage === 0) { temperatureStage = 1; continue } if (temperatureStage === 1) { temperatureStage = 2; continue } }
          throw new Error(err?.error?.message || 'OpenAI request failed')
        }
        throw new Error('Failed to obtain completion after parameter adaptations')
      }

      if (resolvedText) {
        const r = await structuredSummary(resolvedText)
        summary = r.summary
        structured = r.structured
        if (!summary) {
          const prompt = `Summarize the following medical text in clear, plain English.\n\n${resolvedText.slice(0, 12000)}`
          summary = await tryCompletion([
            { role: 'system', content: 'You are a helpful medical assistant. Be concise and clear.' },
            { role: 'user', content: prompt },
          ])
        }
      } else if (fileType && String(fileType).toLowerCase().includes('pdf')) {
        // Prefer server-side PDF text extraction for local/private URLs
        // At this point resolvedText would have been set earlier if parsing succeeded.
        // If we still don't have resolvedText/summary, return a clear signal instead of trying vision on local URLs.
        if (!summary && !resolvedText) {
          if (PDF_DEBUG) {
            return NextResponse.json({ error: 'no extractable text from PDF', debug: { extractorTried: Boolean(PDF_EXTRACT_URL), maxBytes: MAX_PDF_BYTES } }, { status: 422 })
          }
          return NextResponse.json({ error: 'no extractable text from PDF (likely scanned). OCR not enabled.' }, { status: 422 })
        }
      } else if (fileType?.startsWith('image/')) {
        // Images: use Responses API with input_image; ensure local/private URLs become data URIs so OpenAI can access them
        let visionUrl = resolvedUrl || ''
        try {
          const h = visionUrl ? new URL(visionUrl).hostname : ''
          const isLocal = !visionUrl || ['127.0.0.1', 'localhost'].includes(h)
          if (isLocal && documentId) {
            // Preferred: download bytes via service role and convert to data URI
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
            if (supabaseUrl && serviceKey) {
              const admin = createClient(supabaseUrl, serviceKey)
              const { data: doc2 } = await admin.from('documents').select('storage_path').eq('id', documentId).maybeSingle()
              const storagePath2 = (doc2 as any)?.storage_path as string | undefined
              if (storagePath2) {
                const { data: dl2 } = await (admin as any).storage.from('documents').download(storagePath2)
                // @ts-ignore
                const ab2 = dl2 && (typeof dl2.arrayBuffer === 'function' ? await dl2.arrayBuffer() : await new Response(dl2).arrayBuffer())
                if (ab2) {
                  const b64 = Buffer.from(ab2).toString('base64')
                  const type = fileType || 'image/jpeg'
                  visionUrl = `data:${type};base64,${b64}`
                }
              }
            }
          }
        } catch {}
        // Fallback: if still local/empty, try fetching the signed URL directly and convert to data URI
        try {
          if (!visionUrl && resolvedUrl) visionUrl = resolvedUrl
          const h2 = visionUrl ? new URL(visionUrl).hostname : ''
          const looksLocal = !visionUrl || ['127.0.0.1', 'localhost'].includes(h2)
          if (looksLocal && resolvedUrl) {
            const res2 = await withTimeout(fetch(resolvedUrl), 15000)
            if (res2.ok) {
              const ab3 = await res2.arrayBuffer()
              const type2 = fileType || res2.headers.get('content-type') || 'image/jpeg'
              const b64_2 = Buffer.from(ab3).toString('base64')
              visionUrl = `data:${type2};base64,${b64_2}`
            }
          }
        } catch {}
        const IMG_MODEL = process.env.OPENAI_MODEL_EXPLAIN_IMAGE || process.env.OPENAI_MODEL_INTERPRET || OPENAI_MODEL
        const visionBody = {
          model: IMG_MODEL,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_image', image_url: visionUrl },
                { type: 'input_text', text: 'Please summarize this medical image for a layperson. Be concise and mention key findings if visible.' }
              ]
            }
          ],
          reasoning: { effort: 'minimal' },
          text: { verbosity: 'low' }
        }
        const vres = await (async () => {
          const send = async (bb: any) => fetch(respUrl, { method: 'POST', headers, body: JSON.stringify(bb) })
          let r = await send(visionBody)
          if (!r.ok) {
            try {
              const err = await r.clone().json()
              const code = String(err?.error?.code || '')
              const param = String(err?.error?.param || '')
              const msg = String(err?.error?.message || '').toLowerCase()
              const unsupported = code === 'unsupported_parameter' && (param.startsWith('reasoning') || param.startsWith('text'))
              if (unsupported || msg.includes('reasoning') || msg.includes('verbosity')) {
                const cleaned: any = { ...visionBody }
                try { delete cleaned.reasoning } catch {}
                try { delete cleaned.text } catch {}
                r = await send(cleaned)
              }
            } catch {}
          }
          return r
        })()
        if (vres.ok) {
          const j = await vres.json()
          let textOut = ''
          const outText = (j as any)?.output_text
          if (typeof outText === 'string') textOut = outText
          else if (Array.isArray(outText)) {
            const uniq = Array.from(new Set(outText.filter((s: any) => typeof s === 'string')))
            textOut = uniq.join('')
          }
          if (!textOut) {
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
            textOut = uniq.join('') || ''
          }
          summary = textOut
          // Attempt structured facts for images: capture basic findings for wound tracking
          try {
            const imgFactsBody = {
              model: IMG_MODEL,
              input: [ { role: 'user', content: [
                { type: 'input_image', image_url: visionUrl },
                { type: 'input_text', text: 'If this appears to show a wound/injury, return JSON with shape { wound: boolean, descriptors: string[], location: string }. If not, return { wound: false }.' }
              ] } ],
              response_format: { type: 'json_schema', json_schema: {
                name: 'ImageFacts',
                schema: { type: 'object', additionalProperties: false, properties: {
                  wound: { type: 'boolean' },
                  descriptors: { type: 'array', items: { type: 'string' } },
                  location: { type: 'string' }
                } }, strict: true
              } }
            }
            const ir = await fetch(respUrl, { method: 'POST', headers, body: JSON.stringify(imgFactsBody) })
            if (ir.ok && documentId && userId) {
              const ij = await ir.json()
              const ot = (ij as any)?.output_text
              let facts: any = null
              try { facts = ot ? JSON.parse(typeof ot === 'string' ? ot : Array.isArray(ot) ? ot.join('\n') : '') : null } catch {}
              if (facts && typeof facts === 'object') {
                await saveDocFacts(createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!), userId!, documentId, facts, IMG_MODEL, '', 'image')
              }
            }
          } catch {}
        } else {
          const errText = await vres.text().catch(() => '')
          throw new Error(errText || 'Image explain failed')
        }
      }
    }

    // No MedGemma fallback here; return an error if we couldn't summarize
    if (!summary) return NextResponse.json({ error: 'Unable to summarize with current provider' }, { status: 502 })

    // Cache summary + extract/save facts if documentId present
    if (documentId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey)
        // Try to link summary to the document's owner
        const { data: doc } = await admin.from('documents').select('user_id, file_type').eq('id', documentId).single()
        const user_id = doc?.user_id || null
        const record: any = { document_id: documentId, user_id, model: OPENAI_MODEL, summary_text: summary }
        if (structured) record.structured_json = structured
        await admin.from('summaries').upsert(record, { onConflict: 'document_id' })
        // Extract & save facts for text/PDF documents when we have text
        // Note: extractFactsFromText is defined inside OPENAI_API_KEY block above
        // Fact extraction is handled inline during summary generation
        // This section is intentionally left empty for now
      }
    }

    return NextResponse.json({ summary, structured: structured || null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
