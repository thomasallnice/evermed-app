import { NextRequest, NextResponse } from 'next/server'
import { retrieveChunks } from '@/src/lib/rag'
import { ESCALATION_RED_FLAGS, REFUSAL_BANNED } from '@/src/lib/copy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { question, personId } = await req.json()
    if (!question || !personId) {
      return NextResponse.json({ error: 'question and personId required' }, { status: 400 })
    }

    const q = String(question).toLowerCase()
    // Refusal detection
    const banned = ['diagnose', 'diagnosis', 'dose', 'dosage', 'triage', 'interpret image', 'read x-ray']
    if (banned.some((k) => q.includes(k))) {
      return NextResponse.json({ answer: REFUSAL_BANNED, citations: [], safetyTag: 'refusal' })
    }
    // Red-flag escalation
    const red = ['chest pain', 'trouble breathing', 'severe bleeding']
    if (red.some((k) => q.includes(k))) {
      return NextResponse.json({ answer: ESCALATION_RED_FLAGS, citations: [], safetyTag: 'escalation' })
    }

    const chunks = await retrieveChunks(personId, question, 6)
    if (!chunks.length) {
      return NextResponse.json({ answer: "I don’t have that in your records.", citations: [], safetyTag: 'refusal' })
    }

    // Deterministic, template-style answer using retrieved chunks with citations
    const top = chunks.slice(0, 3)
    const bullets = top.map((c) => `- ${c.text}`).join('\n')
    const answer = `Here’s what I found in your records:\n\n${bullets}`
    const citations = top.map((c) => ({ documentId: c.documentId, sourceAnchor: c.sourceAnchor || '' }))
    return NextResponse.json({ answer, citations, safetyTag: 'ok' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
