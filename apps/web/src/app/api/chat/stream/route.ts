import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { maybeExtractAndUpsertProfile } from '@/lib/profile/update'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_MODEL_SUMMARY = process.env.OPENAI_MODEL_SUMMARY || process.env.OPENAI_MODEL || 'gpt-5-mini'
const OPENAI_MODEL_INTERPRET = process.env.OPENAI_MODEL_INTERPRET || 'gpt-5'
const OPENAI_MODEL_IMAGE_LIGHT = process.env.OPENAI_MODEL_IMAGE_LIGHT || 'gpt-5-mini'
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || process.env.OPENAI_ORGANIZATION || ''
const OPENAI_PROJECT_ID = process.env.OPENAI_PROJECT_ID || ''
const OPENAI_STREAM = String(process.env.OPENAI_STREAM || 'false').toLowerCase() === 'true'
const CHAT_MAX_REQUESTS = Number(process.env.CHAT_MAX_REQUESTS_PER_DAY || 0)
const IMAGE_MAX_REQUESTS = Number(process.env.IMAGE_MAX_REQUESTS_PER_DAY || 0)

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function retrieveRagWithScore(userId: string, question: string) {
  try {
    const admin = adminClient()
    if (!admin || !OPENAI_API_KEY) return { rag: '', best: 0, n: 0 }
    // Use existing embeddings helper via the /embeddings endpoint
    const embRes = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL_EMBED || 'text-embedding-3-small', input: question })
    })
    if (!embRes.ok) return { rag: '', best: 0, n: 0 }
    const emb = (await embRes.json()).data?.[0]?.embedding as number[]
    const vectorText = `[${(emb || []).join(',')}]`
    const { data } = await (admin as any).rpc('match_rag_chunks', { p_user: userId, p_query_embedding: vectorText, p_match_count: 6 })
    const rows = (data || []) as any[]
    if (!rows.length) return { rag: '', best: 0, n: 0 }
    const lines = rows.map((r: any, i: number) => `[${i + 1}] ${r.file_name} (#${r.chunk_index}): ${r.content}`)
    const rag = `Use ONLY the following context. Cite [n] after claims.\n\n${lines.join('\n\n')}`
    const best = Math.max(...rows.map((r: any) => Number(r.similarity) || 0))
    const sources = rows.map((r: any, i: number) => ({ i: i + 1, file: r.file_name, chunk: r.chunk_index, docId: r.app_document_id }))
    return { rag, best, n: rows.length, sources }
  } catch {
    return { rag: '', best: 0, n: 0 }
  }
}

async function buildContext(userId?: string) {
  if (!userId) return ''
  const admin = adminClient()
  if (!admin) return ''
  try {
    const [{ data: docs }, { data: sums }, { data: graph }, { data: factsRows }] = await Promise.all([
      admin.from('documents').select('id,file_name').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(10),
      admin.from('summaries').select('document_id,summary_text').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      admin.from('user_graph').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('doc_facts').select('facts,extracted_at').eq('user_id', userId).order('extracted_at', { ascending: false }).limit(5),
    ])
    const docList = (docs || []).map((d: any) => `- ${d.file_name} (id: ${d.id})`).join('\n')
    const sumList = (sums || []).map((s: any) => `- Doc ${s.document_id}: ${s.summary_text?.slice(0, 400)}`).join('\n')
    const conditions = Array.isArray(graph?.conditions) ? graph.conditions.join(', ') : ''
    const medications = Array.isArray(graph?.medications) ? graph.medications.join(', ') : ''
    const profile = (graph as any)?.profile || {}
    const age = profile?.age
    const h = profile?.height_cm
    const w = profile?.weight_kg
    const bmi = profile?.bmi
    const diet = Array.isArray(profile?.diet) ? String(profile.diet.join(', ')) : ''
    const behaviors = Array.isArray(profile?.behaviors) ? String(profile.behaviors.slice(0, 3).join(', ')) : ''
    const profileLine = [
      (age ? `age ${age}` : ''),
      (h ? `height ${h}cm` : ''),
      (w ? `weight ${w}kg` : ''),
      (bmi ? `BMI ${bmi}` : ''),
      (diet ? `diet: ${diet}` : ''),
      (behaviors ? `behaviors: ${behaviors}` : ''),
    ].filter(Boolean).join('; ')
    // Weight trend (last 3)
    let trendLine = ''
    try {
      const { data: weights } = await (admin as any)
        .from('user_metrics')
        .select('value_num,unit,recorded_at')
        .eq('user_id', userId)
        .eq('kind', 'weight_kg')
        .order('recorded_at', { ascending: false })
        .limit(3)
      const arr = Array.isArray(weights) ? weights as any[] : []
      if (arr.length >= 2) {
        const latest = Number(arr[0].value_num)
        const earliest = Number(arr[arr.length - 1].value_num)
        const delta = latest - earliest
        const sign = delta > 0 ? '+' : ''
        const days = Math.max(1, Math.round((new Date(arr[0].recorded_at).getTime() - new Date(arr[arr.length - 1].recorded_at).getTime()) / (1000*60*60*24)))
        const rapidLoss = earliest > 0 && ((earliest - latest) / earliest) >= 0.05 && days <= 30
        trendLine = `Weight trend: ${earliest.toFixed(1)}kg → ${latest.toFixed(1)}kg (${sign}${delta.toFixed(1)}kg / ${days}d${rapidLoss ? '; rapid loss' : ''})`
      }
    } catch {}

    // Aggregate recent doc facts (allergies, meds, conditions)
    let factsLine = ''
    try {
      const arr = Array.isArray(factsRows) ? (factsRows as any[]) : []
      const A = new Set<string>(), M = new Set<string>(), C = new Set<string>()
      for (const r of arr) {
        const f = (r as any)?.facts || {}
        for (const x of (Array.isArray(f.allergies) ? f.allergies : [])) A.add(String(x))
        for (const x of (Array.isArray(f.medications) ? f.medications : [])) M.add(String(x))
        for (const x of (Array.isArray(f.conditions) ? f.conditions : [])) C.add(String(x))
      }
      const partsFacts: string[] = []
      if (A.size) partsFacts.push(`allergies: ${Array.from(A).slice(0,5).join(', ')}`)
      if (M.size) partsFacts.push(`medications: ${Array.from(M).slice(0,5).join(', ')}`)
      if (C.size) partsFacts.push(`conditions: ${Array.from(C).slice(0,5).join(', ')}`)
      factsLine = partsFacts.join(' | ')
    } catch {}

    const parts = [
      docList && `Recent documents:\n${docList}`,
      sumList && `Recent summaries:\n${sumList}`,
      (conditions || medications) && `Known conditions: ${conditions || 'n/a'}; Medications: ${medications || 'n/a'}`,
      profileLine && `Profile: ${profileLine}`,
      trendLine && trendLine,
      factsLine && `Recent facts: ${factsLine}`,
    ].filter(Boolean)
    return parts.join('\n\n')
  } catch {
    return ''
  }
}

function buildTranscript(messages: any[]) {
  const lines: string[] = []
  for (const m of messages) {
    if (!m || !m.role || !m.content) continue
    const role = m.role === 'assistant' ? 'Assistant' : 'User'
    lines.push(`${role}: ${m.content}`)
  }
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) return new Response('Missing OPENAI_API_KEY', { status: 500 })
    const { messages = [], userId, stream, previousResponseId } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('messages required', { status: 400 })
    }
    const lastMsgRaw = messages[messages.length - 1]
    const last = String(lastMsgRaw?.content || '')
    const att = lastMsgRaw && typeof lastMsgRaw === 'object' ? (lastMsgRaw as any).attachment : null
    const hasImage = Boolean(att && typeof att.type === 'string' && att.type.startsWith('image/'))
    const emptyRag: any = { rag: '', best: 0, n: 0, sources: [] as any[] }
    // Fire-and-forget profile extraction for user messages without images
    try { if (userId && !hasImage && last) { void maybeExtractAndUpsertProfile(userId, last) } } catch {}

    const trimLast = last.trim()
    const [{ rag, best, n, sources }, profile] = await Promise.all([
      userId ? (trimLast ? retrieveRagWithScore(userId, last) as any : Promise.resolve(emptyRag)) : Promise.resolve(emptyRag),
      buildContext(userId),
    ])

    // Basic per-user daily rate limit
    if (userId && (CHAT_MAX_REQUESTS > 0 || IMAGE_MAX_REQUESTS > 0)) {
      try {
        const admin = adminClient()
        if (admin) {
          const { data: row } = await (admin as any)
            .from('user_graph')
            .select('chat_requests_today,image_requests_today,last_usage_reset')
            .eq('user_id', userId)
            .maybeSingle()
          const today = new Date().toISOString().slice(0,10)
          let chatC = Number((row as any)?.chat_requests_today || 0)
          let imgC = Number((row as any)?.image_requests_today || 0)
          let lastReset = String((row as any)?.last_usage_reset || today).slice(0,10)
          if (lastReset !== today) { chatC = 0; imgC = 0; lastReset = today }
          if (hasImage) {
            imgC++
            if (IMAGE_MAX_REQUESTS > 0 && imgC > IMAGE_MAX_REQUESTS) {
              return new Response('Rate limit exceeded for image requests', { status: 429 })
            }
          } else {
            chatC++
            if (CHAT_MAX_REQUESTS > 0 && chatC > CHAT_MAX_REQUESTS) {
              return new Response('Rate limit exceeded for chat requests', { status: 429 })
            }
          }
          await (admin as any)
            .from('user_graph')
            .upsert({ user_id: userId, chat_requests_today: chatC, image_requests_today: imgC, last_usage_reset: today })
        }
      } catch {}
    }

    const transcript = buildTranscript(messages)
    const preface: string[] = []
    if (profile) preface.push(`User profile context (may help):\n\n${profile}`)
    // If the last message includes an image, avoid injecting RAG to keep the answer focused on the picture
    if (!hasImage && trimLast && rag) preface.push(rag)
    const formatting = `\n\nPlease answer in GitHub‑flavored Markdown with clear headings, bullet lists, and tables when helpful. When you use the numbered context snippets, cite them inline as [n] next to the specific claim. Only cite numbers that you actually used. Do not add a trailing Sources section.`
    const finalPrompt = [preface.join('\n\n'), transcript, formatting].filter(Boolean).join('\n\n')

    // Simple routing: escalate to interpret model for longer inputs or poor RAG confidence
    const longInput = last.length > 400
    const poorRag = n > 0 && best < 0.6
    // Prefer higher-quality model for image understanding; use light model for short image Qs
    const shortImageQ = hasImage && trimLast.length < 140
    let model = hasImage ? (shortImageQ ? OPENAI_MODEL_IMAGE_LIGHT : OPENAI_MODEL_INTERPRET) : ((longInput || poorRag) ? OPENAI_MODEL_INTERPRET : OPENAI_MODEL_SUMMARY)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Accept': 'text/event-stream',
    }
    if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID
    if (OPENAI_PROJECT_ID) headers['OpenAI-Project'] = OPENAI_PROJECT_ID

    const streamWanted = typeof stream === 'boolean' ? stream : OPENAI_STREAM
    let payload: any
    if (hasImage && att?.url) {
      // Try to ensure the image is accessible: convert local/signed URLs into a data URI
      let imageUrl: string = String(att.url || '')
      try {
        const host = imageUrl ? new URL(imageUrl).hostname : ''
        const isLocal = !imageUrl || host === '127.0.0.1' || host === 'localhost'
        if (isLocal && imageUrl) {
          const res = await fetch(imageUrl)
          if (res.ok) {
            const arr = await res.arrayBuffer()
            const b64 = Buffer.from(arr).toString('base64')
            const ctype = att.type || res.headers.get('content-type') || 'image/jpeg'
            imageUrl = `data:${ctype};base64,${b64}`
          }
        }
      } catch {}
      const focus = `You have been provided an image. Base your answer primarily on that image. If any retrieved text context conflicts with what is visible in the image, the image takes precedence.`
      // Optionally include a small snippet of extracted text/caption for the attached document to enable citations
      let extractedSnippet = ''
      try {
        if (att?.id) {
          const admin = adminClient()
          if (admin) {
            const { data: row } = await (admin as any).from('doc_texts').select('text').eq('document_id', att.id).maybeSingle()
            const t = String((row as any)?.text || '')
            if (t) extractedSnippet = t.slice(0, 1000)
          }
        }
      } catch {}
      const helper = extractedSnippet ? `\n\nExtracted text/caption (for reference):\n${extractedSnippet}` : ''
      // If user sent only an image with no text, avoid repeating transcript; focus on image
      const includeTranscript = Boolean(trimLast)
      payload = {
        model,
        stream: streamWanted,
        reasoning: { effort: 'minimal' },
        text: { verbosity: 'low' },
        input: [
          { role: 'user', content: [
            { type: 'input_text', text: [preface.join('\n\n'), includeTranscript ? transcript : '', focus, helper, formatting].filter(Boolean).join('\n\n') },
            { type: 'input_image', image_url: imageUrl },
          ]}
        ],
      }
    } else if (att?.id) {
      // Non-image attachment present: fetch a snippet and focus on summarizing the document
      let docSnippet = ''
      try {
        const admin = adminClient()
        if (admin) {
          const { data: row } = await (admin as any).from('doc_texts').select('text').eq('document_id', att.id).maybeSingle()
          const t = String((row as any)?.text || '')
          if (t) docSnippet = t.slice(0, 8000)
          if (!docSnippet) {
            const { data: sum } = await (admin as any).from('summaries').select('summary_text').eq('document_id', att.id).maybeSingle()
            const s = String((sum as any)?.summary_text || '')
            if (s) docSnippet = s.slice(0, 4000)
          }
        }
      } catch {}
      const docFocus = `You have been provided a document. Summarize it clearly, list key findings, and note any clinically relevant details.`
      const includeTranscript = Boolean(trimLast)
      // Prefer stronger model when summarizing a document with no user question
      if (!includeTranscript) { model = OPENAI_MODEL_INTERPRET }
      payload = {
        model,
        stream: streamWanted,
        reasoning: { effort: 'minimal' },
        text: { verbosity: 'low' },
        input: [
          { role: 'user', content: [
            { type: 'input_text', text: [preface.join('\n\n'), includeTranscript ? transcript : '', docFocus, (docSnippet ? `Document excerpt:\n${docSnippet}` : ''), formatting].filter(Boolean).join('\n\n') },
          ]}
        ],
      }
    } else {
      payload = {
        model,
        input: finalPrompt,
        stream: streamWanted,
        reasoning: { effort: 'minimal' },
        text: { verbosity: 'low' },
      }
    }
    if (previousResponseId && typeof previousResponseId === 'string') {
      payload.previous_response_id = previousResponseId
    }

    async function postResponses(body: any) {
      const doFetch = async (b: any) => fetch(`${OPENAI_BASE_URL}/responses`, { method: 'POST', headers, body: JSON.stringify(b) })
      let res = await doFetch(body)
      if (res.ok) return res
      // Adapt if model does not support reasoning/text params
      try {
        const err = await res.clone().json()
        const code = String(err?.error?.code || '')
        const param = String(err?.error?.param || '')
        const msg = String(err?.error?.message || '').toLowerCase()
        const isUnsupportedParam = code === 'unsupported_parameter' && (param.startsWith('reasoning') || param.startsWith('text'))
        const mentionsReasoning = msg.includes('reasoning') || msg.includes('verbosity') || msg.includes('text')
        if (isUnsupportedParam || mentionsReasoning) {
          const cleaned: any = { ...body }
          try { delete cleaned.reasoning } catch {}
          try { delete cleaned.text } catch {}
          res = await doFetch(cleaned)
        }
      } catch {}
      return res
    }

    let upstream = await postResponses(payload)

    // Fallback: streaming unsupported – retry without stream
    if (!upstream.ok && streamWanted) {
      let errJson: any = null
      try { errJson = await upstream.clone().json() } catch {}
      const msg = String(errJson?.error?.message || '').toLowerCase()
      const code = String(errJson?.error?.code || '')
      const param = String(errJson?.error?.param || '')
      if (code === 'unsupported_value' && (param === 'stream' || msg.includes('stream'))) {
        const noStream = await postResponses({ ...payload, stream: false })
        if (noStream.ok) {
          const j = await noStream.json()
          // Prefer output_text if provided by Responses API
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
            // De-duplicate identical segments
            const uniq = Array.from(new Set(parts))
            text = uniq.join('') || ''
          }
          if (Array.isArray(sources) && sources.length) {
            const jsonLine = `\nSOURCES_JSON: ${JSON.stringify(sources)}`
            text += jsonLine
          }
          const respId = (j as any)?.id || ''
          return new Response(text || '[no content]', {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'X-Accel-Buffering': 'no',
              'X-OpenAI-Stream': 'false',
              ...(respId ? { 'X-Responses-Id': String(respId) } : {}),
            }
          })
        }
      }
    }
    // If streaming is disabled via env, immediately return full text body
    if (!streamWanted) {
      if (!upstream.ok) {
        const t = await upstream.text().catch(() => 'Upstream error')
        return new Response(t || 'Upstream error', { status: 500 })
      }
      const j = await upstream.json()
      // Prefer output_text if provided
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
      if (Array.isArray(sources) && sources.length) {
        const jsonLine = `\nSOURCES_JSON: ${JSON.stringify(sources)}`
        text += jsonLine
      }
      const respId2 = (j as any)?.id || ''
      return new Response(text || '[no content]', {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
          'X-OpenAI-Stream': 'false',
          ...(respId2 ? { 'X-Responses-Id': String(respId2) } : {}),
        }
      })
    }
    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text().catch(() => 'Upstream error')
      return new Response(t || 'Upstream error', { status: 500 })
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = upstream.body!.getReader()
    let buffer = ''
    let responseId: string | undefined
    let sentAny = false
    let collected = ''
    let lastAddition = ''

    // Pre-read a small portion to capture response id and possibly first delta(s)
    const pendingChunks: Uint8Array[] = []
    for (let i = 0; i < 2; i++) {
      const { done, value } = await reader.read()
      if (done || !value) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      let broke = false
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const lines = block.split(/\n/)
        let eventType = ''
        let dataParts: string[] = []
        for (const raw of lines) {
          const l = raw.trim()
          if (!l) continue
          if (l.startsWith('event:')) { eventType = l.slice(6).trim(); continue }
          if (l.startsWith('data:')) { dataParts.push(l.slice(5).trim()); continue }
        }
        const dataStr = dataParts.join('\n')
        if (!dataStr || dataStr === '[DONE]') continue
        try {
          const evt = JSON.parse(dataStr)
          const type = eventType || String((evt as any)?.type || '')
          if (!responseId && (type === 'response.created' || type.includes('response.created'))) {
            const rid = (evt as any)?.response?.id || (evt as any)?.id
            if (typeof rid === 'string') responseId = rid
          }
          const isTextDelta = type === 'response.output_text.delta' || type.endsWith('response.output_text.delta') || type.includes('output_text.delta')
          if (isTextDelta) {
            const delta = typeof evt?.delta === 'string' ? evt.delta : ''
            if (delta) {
              let addition = delta.startsWith(collected) ? delta.slice(collected.length) : delta
              if (addition && addition !== lastAddition) {
                collected += addition
                sentAny = true
                lastAddition = addition
                pendingChunks.push(encoder.encode(addition))
              }
            }
          }
        } catch {}
        // If we have either an id or some initial text to flush, stop pre-read
        if (responseId || pendingChunks.length) { broke = true; break }
      }
      if (broke) break
      // Limit pre-read to avoid delaying TTFB
      if (buffer.length > 8192) break
    }

    const outStream = new ReadableStream<Uint8Array>({
      start(controller) {
        const readLoop = async () => {
          try {
            // Flush any pending chunks captured before returning the Response
            if (pendingChunks.length) {
              for (const c of pendingChunks) controller.enqueue(c)
              ;(pendingChunks as any).length = 0
            }
            const { done, value } = await reader.read()
            if (done) {
              // If nothing was streamed, fallback to non-stream response inline
              if (!sentAny) {
                try {
                  const noStream = await fetch(`${OPENAI_BASE_URL}/responses`, {
                    method: 'POST', headers, body: JSON.stringify({ ...payload, stream: false })
                  })
                  if (noStream.ok) {
                    const j = await noStream.json()
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
                    if (Array.isArray(sources) && sources.length) {
                      const src = `\n\nSources:\n` + sources.map((s: any) => `[${s.i}] ${s.file} (#${s.chunk})`).join('\n')
                      text += src
                    }
                    if (text) controller.enqueue(encoder.encode(text))
                  }
                } catch {}
              }
              // If we streamed content, append sources mapping before close
              if (sentAny && Array.isArray(sources) && sources.length) {
                const jsonLine = `\nSOURCES_JSON: ${JSON.stringify(sources)}`
                controller.enqueue(encoder.encode(jsonLine))
              }
              controller.close()
              return
            }
            buffer += decoder.decode(value, { stream: true })
            let idx: number
            while ((idx = buffer.indexOf('\n\n')) !== -1) {
              const block = buffer.slice(0, idx)
              buffer = buffer.slice(idx + 2)

              // Parse one SSE block: capture event type and concatenate data lines
              const lines = block.split(/\n/)
              let eventType = ''
              let dataParts: string[] = []
              for (const raw of lines) {
                const l = raw.trim()
                if (!l) continue
                if (l.startsWith(':')) continue // comments/heartbeat
                if (l.startsWith('event:')) { eventType = l.slice(6).trim(); continue }
                if (l.startsWith('data:')) { dataParts.push(l.slice(5).trim()); continue }
              }
              const dataStr = dataParts.join('\n')
              if (!dataStr || dataStr === '[DONE]') continue

              try {
                const evt = JSON.parse(dataStr)
                const type = eventType || String((evt as any)?.type || '')
                // Accept only output_text.delta events to avoid duplication
                const isTextDelta = type === 'response.output_text.delta' || type.endsWith('response.output_text.delta') || type.includes('output_text.delta')
                if (!isTextDelta) continue
                const delta = typeof evt?.delta === 'string' ? evt.delta : ''
                if (!delta) continue

                // Trim cumulative deltas and drop immediate duplicates
                let addition = delta.startsWith(collected) ? delta.slice(collected.length) : delta
                if (!addition || addition === lastAddition) continue

                collected += addition
                sentAny = true
                lastAddition = addition
                controller.enqueue(encoder.encode(addition))
                
              } catch {
                // ignore JSON parse errors
              }
            }
            readLoop()
          } catch {
            controller.close()
          }
        }
        readLoop()
      }
    })

    return new Response(outStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'X-OpenAI-Stream': 'true',
        ...(responseId ? { 'X-Responses-Id': responseId } : {}),
      },
    })
  } catch (e: any) {
    return new Response(e?.message || 'Unexpected error', { status: 500 })
  }
}

export const runtime = 'nodejs'
