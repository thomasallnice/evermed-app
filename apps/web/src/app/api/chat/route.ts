import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_MODEL_SUMMARY = process.env.OPENAI_MODEL_SUMMARY || process.env.OPENAI_MODEL || 'gpt-5-mini'
const OPENAI_MODEL_EMBED = process.env.OPENAI_MODEL_EMBED || 'text-embedding-3-small'
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || process.env.OPENAI_ORGANIZATION || ''
const OPENAI_MAX_TOKENS_SUMMARY = Number(process.env.OPENAI_MAX_TOKENS_SUMMARY || 800)
// const OPENAI_MODEL_INTERPRET = process.env.OPENAI_MODEL_INTERPRET || 'gpt-5' // unused
// const OPENAI_MAX_TOKENS_INTERPRET = Number(process.env.OPENAI_MAX_TOKENS_INTERPRET || 3000) // unused
// MedGemma is disabled by default to avoid costs. No fallback.

async function callOpenAI(messages: any[], model: string, maxTokens: number) {
  const url = `${OPENAI_BASE_URL}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  }
  if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID

  let useMaxCompletion = false
  // temperatureStage: 0 -> 0.3, 1 -> 1, 2 -> omit
  let temperatureStage = 0

  for (let attempt = 0; attempt < 4; attempt++) {
    const body: any = { model, messages }
    if (temperatureStage === 0) body.temperature = 0.3
    else if (temperatureStage === 1) body.temperature = 1
    // stage 2 omits temperature entirely
    if (useMaxCompletion) body.max_completion_tokens = maxTokens
    else body.max_tokens = maxTokens

    let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content || String(content).trim() === '') throw new Error('Empty response from model')
      return content
    }

    // Try to adapt based on error
    const err = await res.clone().json().catch(async () => ({ error: { message: await res.text().catch(() => '') } }))
    const msg: string = (err?.error?.message || '').toLowerCase()
    const code: string = String(err?.error?.code || '')

    // Adjust tokens param once if unsupported
    if (!useMaxCompletion && (code === 'unsupported_parameter' || msg.includes('max_tokens'))) {
      useMaxCompletion = true
      continue
    }
    // Adjust temperature if unsupported: 0.3 -> 1 -> omit
    if (code === 'unsupported_value' || msg.includes('temperature')) {
      if (temperatureStage === 0) { temperatureStage = 1; continue }
      if (temperatureStage === 1) { temperatureStage = 2; continue }
    }

    // No known adaptation: surface provider error
    throw new Error(err?.error?.message || 'OpenAI request failed')
  }

  throw new Error('Failed to obtain completion after parameter adaptations')
}

// Note: MedGemma helpers removed to avoid accidental usage/costs.

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function embedQuery(text: string) {
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}`, ...(OPENAI_ORG_ID ? { 'OpenAI-Organization': OPENAI_ORG_ID } : {}) },
    body: JSON.stringify({ model: OPENAI_MODEL_EMBED, input: text })
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.data?.[0]?.embedding as number[]
}

async function retrieveContext(userId: string, question: string) {
  try {
    const admin = adminClient()
    if (!admin || !OPENAI_API_KEY) return ''
    const emb = await embedQuery(question)
    const vectorText = `[${emb.join(',')}]`
    const { data } = await (admin as any).rpc('match_rag_chunks', { p_user: userId, p_query_embedding: vectorText, p_match_count: 6 })
    const rows = (data || []) as any[]
    if (!rows.length) return ''
    const lines = rows.map((r, i) => `[${i + 1}] ${r.file_name} (#${r.chunk_index}): ${r.content}`)
    return `Use ONLY the following context. Cite [n] after claims.\n\n${lines.join('\n\n')}`
  } catch {
    return ''
  }
}

async function buildContext(userId?: string) {
  if (!userId) return ''
  const admin = adminClient()
  if (!admin) return ''
  try {
    const [{ data: docs }, { data: sums }, { data: graph }] = await Promise.all([
      admin.from('documents').select('id,file_name').eq('user_id', userId).order('uploaded_at', { ascending: false }).limit(10),
      admin.from('summaries').select('document_id,summary_text').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      admin.from('user_graph').select('*').eq('user_id', userId).maybeSingle(),
    ])
    const docList = (docs || []).map((d: any) => `- ${d.file_name} (id: ${d.id})`).join('\n')
    const sumList = (sums || []).map((s: any) => `- Doc ${s.document_id}: ${s.summary_text?.slice(0, 400)}`).join('\n')
    const conditions = Array.isArray(graph?.conditions) ? graph.conditions.join(', ') : ''
    const medications = Array.isArray(graph?.medications) ? graph.medications.join(', ') : ''
    const parts = [
      docList && `Recent documents:\n${docList}`,
      sumList && `Recent summaries:\n${sumList}`,
      (conditions || medications) && `Known conditions: ${conditions || 'n/a'}; Medications: ${medications || 'n/a'}`,
    ].filter(Boolean)
    return parts.join('\n\n')
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages = [], userId, model: _model, providerOverride, delayMs } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    try {
      if (typeof delayMs === 'number' && delayMs > 0 && delayMs < 60000) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      if (providerOverride === 'mock') {
        return NextResponse.json({ answer: 'This is a mocked response for rapid iteration.', provider: 'mock' })
      }
      if (providerOverride === 'medgemma') {
        // Explicitly disabled for cost control. Will be re-enabled for paying users.
        return NextResponse.json({ error: 'MedGemma is disabled in this environment' }, { status: 403 })
      }
      // Build optional context (skips RAG if OpenAI embeddings are not available)
      const rag = OPENAI_API_KEY && userId
        ? await retrieveContext(userId, messages[messages.length - 1]?.content || '')
        : ''
      const context = await buildContext(userId)
      const augmented = context
        ? [{ role: 'system', content: `User profile context (may help):\n\n${context}` }, ...messages]
        : [...messages]
      const finalMessages = rag
        ? [{ role: 'system', content: rag }, ...augmented]
        : augmented

      // Provider selection: OpenAI only (no fallback to MedGemma)
      if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
      const chosenModel = OPENAI_MODEL_SUMMARY
      const maxTok = OPENAI_MAX_TOKENS_SUMMARY
      const answer = await callOpenAI(finalMessages, chosenModel, maxTok)
      return NextResponse.json({ answer, provider: 'openai' })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Provider failed'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
