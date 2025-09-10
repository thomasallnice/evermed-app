import { createClient } from '@supabase/supabase-js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || process.env.OPENAI_ORGANIZATION || ''
const MODEL_NANO = process.env.OPENAI_MODEL_NANO || process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function looksLikeProfileMessage(text: string) {
  const t = (text || '').toLowerCase()
  if (!t || t.length < 8) return false
  const hints = [
    'i am ', 'i’m ', 'im ', 'my age', 'years old', 'i weigh', 'weight', 'kg', 'lbs', 'pounds',
    'height', 'cm', 'meters', 'diet', 'vegetarian', 'vegan', 'keto', 'smoke', 'alcohol', 'drink',
    'exercise', 'workout', 'pregnant', 'allergies', 'allergic to'
  ]
  return hints.some((h) => t.includes(h))
}

export async function extractProfileFromText(text: string): Promise<any | null> {
  // Start with a regex fallback we can use if the model call fails or returns non‑JSON
  const base = regexProfile(text)
  if (!OPENAI_API_KEY) return Object.keys(base).length ? base : null
  const schema = {
    name: 'UserProfile',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        age: { type: 'integer', minimum: 0, maximum: 130 },
        sex: { type: 'string' },
        height_cm: { type: 'number', minimum: 0, maximum: 300 },
        weight_kg: { type: 'number', minimum: 0, maximum: 500 },
        diet: { type: 'array', items: { type: 'string' } },
        behaviors: { type: 'array', items: { type: 'string' } },
        allergies: { type: 'array', items: { type: 'string' } }
      }
    },
    strict: true
  }
  const body = {
    model: MODEL_NANO,
    input: `Extract any explicit user profile facts from the following message. Only include fields that are directly stated (do not guess). Return a compact JSON.\n\n${text.slice(0, 4000)}`,
    response_format: { type: 'json_schema', json_schema: schema },
    reasoning: { effort: 'minimal' },
    text: { verbosity: 'low' }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  }
  if (OPENAI_ORG_ID) headers['OpenAI-Organization'] = OPENAI_ORG_ID
  // Send with graceful fallback if model doesn't support reasoning/text params
  const send = async (bb: any) => fetch(`${OPENAI_BASE_URL}/responses`, { method: 'POST', headers, body: JSON.stringify(bb) })
  let res: Response
  try {
    res = await send(body)
    if (!res.ok) {
      try {
        const err = await res.clone().json()
        const code = String(err?.error?.code || '')
        const param = String(err?.error?.param || '')
        const msg = String(err?.error?.message || '').toLowerCase()
        const unsupported = code === 'unsupported_parameter' && (param.startsWith('reasoning') || param.startsWith('text'))
        if (unsupported || msg.includes('reasoning') || msg.includes('verbosity')) {
          const cleaned: any = { ...body }
          try { delete cleaned.reasoning } catch {}
          try { delete cleaned.text } catch {}
          res = await send(cleaned)
        }
      } catch {}
    }
  } catch {
    // Network or provider error — fall back to regex
    return Object.keys(base).length ? base : null
  }
  if (!res.ok) return Object.keys(base).length ? base : null
  const j = await res.json()
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
  if (!textOut) return Object.keys(base).length ? base : null
  let parsed: any = null
  try { parsed = JSON.parse(textOut) } catch { parsed = null }
  if (!parsed || typeof parsed !== 'object') return Object.keys(base).length ? base : null
  // Compute BMI if possible
  const merged: any = { ...base, ...parsed }
  const h = Number(merged.height_cm)
  const w = Number(merged.weight_kg)
  if (h > 0 && w > 0) {
    const bmi = w / Math.pow(h / 100, 2)
    merged.bmi = Math.round(bmi * 10) / 10
  }
  return merged
}

export async function upsertUserProfile(userId: string, partial: any) {
  const admin = adminClient()
  if (!admin) return
  try {
    const { data: row } = await (admin as any).from('user_graph').select('profile').eq('user_id', userId).maybeSingle()
    const current = (row as any)?.profile || {}
    const merged: any = { ...(current || {}) }
    for (const k of Object.keys(partial || {})) {
      const v = (partial as any)[k]
      if (Array.isArray(v)) {
        const prev = Array.isArray(merged[k]) ? merged[k] : []
        merged[k] = Array.from(new Set([...(prev as any[]), ...v].map((x) => String(x))))
      } else if (v !== null && v !== undefined && v !== '') {
        merged[k] = v
      }
    }
    merged.updated_at = new Date().toISOString()
    await (admin as any).from('user_graph').upsert({ user_id: userId, profile: merged }, { onConflict: 'user_id' })
  } catch {}
}

export async function maybeExtractAndUpsertProfile(userId: string | null | undefined, text: string) {
  try {
    if (!userId) return
    if (!looksLikeProfileMessage(text)) return
    const extracted = await extractProfileFromText(text)
    if (extracted && Object.keys(extracted).length > 0) {
      await upsertUserProfile(String(userId), extracted)
      // Record metrics for time-series tracking
      const admin = adminClient()
      if (admin) {
        // Update auth user metadata with name if present
        try {
          if (typeof (extracted as any).name === 'string' && (extracted as any).name.trim()) {
            await (admin as any).auth.admin.updateUserById(String(userId), { user_metadata: { name: String((extracted as any).name).trim() } })
          }
        } catch {}
        const w = Number(extracted.weight_kg)
        if (Number.isFinite(w) && w > 0) {
          try { await (admin as any).from('user_metrics').insert({ user_id: userId, kind: 'weight_kg', value_num: w, unit: 'kg', source: 'chat' }) } catch {}
        }
        const h = Number(extracted.height_cm)
        if (Number.isFinite(h) && h > 0) {
          try { await (admin as any).from('user_metrics').insert({ user_id: userId, kind: 'height_cm', value_num: h, unit: 'cm', source: 'chat' }) } catch {}
        }
        const b = Number(extracted.bmi)
        if (Number.isFinite(b) && b > 0) {
          try { await (admin as any).from('user_metrics').insert({ user_id: userId, kind: 'bmi', value_num: b, unit: '', source: 'chat' }) } catch {}
        }
      }
    }
  } catch {}
}

function regexProfile(text: string) {
  const t = String(text || '').toLowerCase()
  const res: any = {}
  try {
    const nameM = t.match(/\bmy name is\s+([a-zA-Z][a-zA-Z\-']+)/)
    if (nameM) res.name = nameM[1]
    const ageM = t.match(/\b(\d{1,3})\s*(?:years old|yo|y\.?o\.?)\b/) || t.match(/\bi am\s+(\d{1,3})\b/)
    if (ageM) res.age = Number(ageM[1])
    const hM = t.match(/\b(\d{2,3})\s*cm\b/)
    if (hM) res.height_cm = Number(hM[1])
    const wM = t.match(/\b(\d{2,3})\s*(?:kg|kilograms?)\b/)
    if (wM) res.weight_kg = Number(wM[1])
    // Basic alcohol / injury signal
    if (/\b(alcohol|drink|beer|wine|spirits)\b/.test(t)) {
      res.behaviors = Array.from(new Set([...(Array.isArray(res.behaviors) ? res.behaviors : []), 'alcohol use']))
    }
    if (/\b(injury|wound|sprain|cut|fracture)\b/.test(t)) {
      res.behaviors = Array.from(new Set([...(Array.isArray(res.behaviors) ? res.behaviors : []), 'injury noted']))
    }
    if (res.height_cm && res.weight_kg) {
      const bmi = res.weight_kg / Math.pow(res.height_cm / 100, 2)
      res.bmi = Math.round(bmi * 10) / 10
    }
  } catch {}
  return res
}
