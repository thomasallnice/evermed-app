'use client'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { getSupabase } from '@/lib/supabase/client'
import { MEDICAL_DISCLAIMER } from '@/lib/copy'

type Msg = { role: 'user' | 'assistant'; content: string; attachment?: { id?: string; url: string; type: string; name: string } }

type SourceMap = { i: number; file: string; chunk: number; docId?: string }

function parseSources(text: string): { clean: string; sources: SourceMap[] } {
  let sources: SourceMap[] = []
  let clean = text || ''
  // Extract SOURCES_JSON line if present
  const idx = clean.lastIndexOf('\nSOURCES_JSON: ')
  if (idx !== -1) {
    const jsonPart = clean.slice(idx + '\nSOURCES_JSON: '.length)
    try {
      sources = JSON.parse(jsonPart.trim())
    } catch {}
    clean = clean.slice(0, idx)
  }
  // Remove any trailing textual "Sources:" block (LLM or server formatting)
  const sIdx = clean.lastIndexOf('\nSources:')
  if (sIdx !== -1) {
    const before = clean.slice(0, sIdx)
    const after = clean.slice(sIdx)
    // Heuristic: only remove if block contains bracketed numeric references and no further paragraphs
    if (/^\nSources:\s*(\n|\r\n)([\s\S]*?)$/m.test(after) && /\[\d+\]/.test(after)) {
      clean = before.trimEnd()
    }
  }
  clean = clean.replace(/\n+$/g, '')
  return { clean, sources }
}

// Remark plugin to render numeric citations like [1] as subtle superscripts
function remarkCitations() {
  return (tree: any) => {
    // @ts-ignore – loose visitor typing for simplicity
    visit(tree, 'text', (node: any, index: number, parent: any) => {
      const value: string = node.value
      const re = /\[(\d+)\](?!\()/g // [n] not followed by (
      let match: RegExpExecArray | null
      let last = 0
      const parts: any[] = []
      while ((match = re.exec(value))) {
        const i = match.index
        if (i > last) parts.push({ type: 'text', value: value.slice(last, i) })
        parts.push({
          type: 'element',
          data: { hName: 'sup', hProperties: { className: ['citation'] } },
          children: [{ type: 'text', value: `[${match[1]}]` }],
        })
        last = re.lastIndex
      }
      if (parts.length && typeof index === 'number' && parent && Array.isArray(parent.children)) {
        if (last < value.length) parts.push({ type: 'text', value: value.slice(last) })
        parent.children.splice(index, 1, ...parts)
      }
    })
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  // MedGemma disabled to avoid costs; UI hides related options
  const [providerOverride, setProviderOverride] = useState<'auto' | 'openai' | 'mock'>('auto')
  const inFlightRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const streamBufRef = useRef('')
  const [stream, setStream] = useState(true)
  const [previousResponseId, setPreviousResponseId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const [editing, setEditing] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [toast, setToast] = useState<{ text: string; type?: 'info'|'success'|'error' } | null>(null)
  const notify = (text: string, type?: 'info'|'success'|'error') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }
  const [profileToast, setProfileToast] = useState<{ text: string; previous: any } | null>(null)
  const [pendingAttach, setPendingAttach] = useState<{ id: string; file_name: string; file_type: string; signedUrl: string } | null>(null)
  const [optsOpen, setOptsOpen] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ state: 'uploading' | 'summarizing' | 'indexing' | null; fileName: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserId(user.id)
      // Load per-user streaming default from user_graph
      try {
        const { data: graph } = await supabase.from('user_graph').select('streaming_default').eq('user_id', user.id).maybeSingle()
        if (graph && typeof (graph as any).streaming_default === 'boolean') {
          setStream(Boolean((graph as any).streaming_default))
        } else {
          // Ensure row exists with default
          await (supabase as any).from('user_graph').upsert({ user_id: user.id, streaming_default: stream })
        }
      } catch {}
      // Load persisted chat history including attachments
      try {
        const res = await fetch('/api/chat/messages')
        if (res.ok) {
          const data = await res.json()
          const msgs: Msg[] = Array.isArray(data?.messages)
            ? data.messages.map((m: any) => ({
                role: m.role,
                content: m.content,
                attachment: m.attachment
                  ? {
                      id: m.attachment.id,
                      url: m.attachment.signedUrl,
                      type: m.attachment.fileType,
                      name: m.attachment.filename,
                    }
                  : undefined,
              }))
            : []
          setMessages(msgs)
        }
      } catch {}
    })()
  }, [])

  // Auto-scroll on new tokens/messages
  useEffect(() => {
    const sc = scrollRef.current
    if (!sc) return
    try {
      sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' })
    } catch {}
  }, [messages, thinking])

  async function send() {
    if (!input.trim() && !pendingAttach) return
    if (inFlightRef.current) return
    const originalInput = input
    // Cancel any previous in‑flight request just in case
    if (abortRef.current) try { abortRef.current.abort() } catch {}
    abortRef.current = new AbortController()
    inFlightRef.current = true
    const next: Msg[] = [...messages, { role: 'user' as const, content: originalInput, ...(pendingAttach ? { attachment: { id: pendingAttach.id, url: pendingAttach.signedUrl, type: pendingAttach.file_type, name: pendingAttach.file_name } } : {}) }]
    setMessages(next)
    setInput('')
    setPendingAttach(null)
    setLoading(true)
    try {
      setThinking(true)
      // Persist user message
      if (userId) {
        try {
          await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'user', content: originalInput, documentId: pendingAttach?.id }),
          })
        } catch {}
      }
      // Mock path stays non-streaming for instant UX
      if (providerOverride === 'mock') {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: next,
            userId,
            providerOverride: 'mock',
          }),
        })
        const data = await res.json()
        const answer = data.answer || 'No response'
        setMessages([...next, { role: 'assistant' as const, content: answer }])
        // Persist assistant message
        try {
          if (userId) {
            await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: answer }),
            })
          }
        } catch {}
        return
      }

      // Streaming path (Responses API)
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      streamBufRef.current = ''
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, userId, stream, previousResponseId }),
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => 'Error')
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: `Error: ${text || 'failed to stream'}` }
          return copy
        })
        // Persist error as assistant message
        try {
          if (userId) {
            await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: `Error: ${text || 'failed to stream'}` }),
            })
          }
        } catch {}
        return
      }
      // Fire a background profile update based on this user message
      try {
        if (userId && originalInput.trim()) {
          const u = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, message: originalInput }) })
          const j = await u.json().catch(() => ({}))
          const saved = (j as any)?.saved || {}
          const previous = (j as any)?.previous || {}
          const keys = Object.keys(saved || {})
          if (keys.length) {
            const list = keys.map((k) => `${k}: ${Array.isArray(saved[k]) ? saved[k].join(', ') : saved[k]}`).join('; ')
            setProfileToast({ text: `Saved to profile: ${list}`, previous: previous })
            setTimeout(() => setProfileToast(null), 8000)
          }
        }
      } catch {}
      const isStream = res.headers.get('X-OpenAI-Stream') === 'true'
      const respId = res.headers.get('X-Responses-Id')
      if (respId) setPreviousResponseId(respId)
      if (!isStream) {
        const text = await res.text()
        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length === 0 || copy[copy.length - 1].role !== 'assistant') {
            copy.push({ role: 'assistant', content: text })
          } else {
            copy[copy.length - 1] = { role: 'assistant', content: text }
          }
          return copy
        })
        // Persist assistant message
        try {
          if (userId) {
            await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: text }),
            })
          }
        } catch {}
      } else {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          if (!chunk) continue
          // Accumulate into a single buffer to make updates idempotent under Strict Mode
          streamBufRef.current += chunk
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last && last.role === 'assistant') {
              last.content = streamBufRef.current
            }
            return copy
          })
        }
        // Persist final assistant message after stream completes
        try {
          if (userId) {
            await fetch('/api/chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: streamBufRef.current }),
            })
          }
        } catch {}
      }
    } finally {
      setLoading(false)
      setThinking(false)
      inFlightRef.current = false
      abortRef.current = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) try { abortRef.current.abort() } catch {}
    }
  }, [])

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
      </div>

      {/* Messages Container */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-12 text-center">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Start a conversation</h2>
                <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Ask questions about your medical documents, medications, or general health information.
                </p>
              </div>

              <div className="w-full max-w-xl mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-5 text-left shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">What you can ask:</h3>
                  <ul className="text-sm text-gray-700 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Questions about your uploaded medical documents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Information about medications and interactions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Help understanding medical terminology</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                <p>Type your question below or upload a document to get started</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            if (m.role === 'user') {
              if (m.attachment) {
                const att = m.attachment
                const isImg = att.type?.startsWith('image/')
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 shadow-sm">
                      {m.content?.trim() && (
                        <div className="mb-2 whitespace-pre-wrap text-gray-900">{m.content}</div>
                      )}
                      <div className="text-xs mb-1 text-gray-600 font-medium">{att.name}</div>
                      {isImg ? (
                        <img src={att.url} alt={att.name} className="max-h-40 rounded-lg border border-gray-200" />
                      ) : (
                        <a href={att.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 text-sm font-medium underline">Open</a>
                      )}
                    </div>
                  </div>
                )
              }
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 shadow-sm text-gray-900">{m.content}</div>
                </div>
              )
            }
            const { clean, sources } = parseSources(m.content)
            const cited = (() => {
              const nums = new Set<number>()
              const re = /\[(\d+)\]/g
              let match: RegExpExecArray | null
              while ((match = re.exec(clean))) { const n = Number(match[1]); if (Number.isFinite(n)) nums.add(n) }
              if (!sources || sources.length === 0) return [] as SourceMap[]
              const filtered = sources.filter((s) => nums.has(Number(s.i)))
              return (filtered.length ? filtered : sources)
            })()
            const block = (
              <div className="flex">
                <div className="w-full max-w-none bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-900 prose-p:leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkCitations as any]}
                      components={{
                        sup({node, children, ...props}: any) {
                          const cls = String(props.className || '')
                          if (!cls.includes('citation')) return <sup {...props}>{children}</sup>
                          const raw = String(children?.[0] || '')
                          const m = raw.match(/\[(\d+)\]/)
                          const num = m ? Number(m[1]) : undefined
                          const target = (cited || []).find((s) => Number(s.i) === num)?.docId
                          if (target) return <a href={`/doc/${target}#c${num}`} className="text-blue-600 hover:text-blue-700 no-underline font-medium"><sup {...props}>{children}</sup></a>
                          return <sup {...props}>{children}</sup>
                        },
                        // @ts-ignore simplify types for custom code renderer
                        code({ inline, children, ...props }: any) {
                          const text = String(children || '')
                          if (inline) return <code className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                          return (
                            <div className="relative group">
                              <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto font-mono text-sm" {...props}>{children}</pre>
                              <button
                                type="button"
                                className="absolute top-2 right-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-sm"
                                onClick={() => navigator.clipboard.writeText(text)}
                              >Copy</button>
                            </div>
                          )
                        }
                      }}
                    >{clean}</ReactMarkdown>
                    {cited && cited.length > 0 && (
                      <div className="not-prose mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Sources:</div>
                        <div className="flex flex-wrap gap-2">
                          {cited.map((s) => (
                            s.docId ? (
                              <a
                                key={s.i}
                                href={`/doc/${s.docId}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                              >
                                <span className="font-semibold text-blue-600">[{s.i}]</span>
                                <span className="truncate max-w-[120px]">{s.file}</span>
                                <span className="text-gray-500">#{s.chunk}</span>
                              </a>
                            ) : (
                              <span
                                key={s.i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 shadow-sm"
                              >
                                <span className="font-semibold text-blue-600">[{s.i}]</span>
                                <span className="truncate max-w-[120px]">{s.file}</span>
                                <span className="text-gray-500">#{s.chunk}</span>
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
            return (
              <div key={`msg-${i}`} className="space-y-4">
                {block}
              </div>
            )
          })}
          <div ref={bottomRef} />
          {thinking && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm w-fit">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-pulse"></span>
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-pulse [animation-delay:150ms]"></span>
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400 animate-pulse [animation-delay:300ms]"></span>
              <span className="text-sm text-gray-600 ml-1">Thinking…</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Container */}
      <div className="sticky bottom-0 pt-4 bg-gray-50 pb-[env(safe-area-inset-bottom,0px)]">
        {/* Medical Disclaimer - Keep yellow for safety visibility */}
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2.5 shadow-sm">
          <p className="text-xs text-gray-800 leading-relaxed">
            <span className="font-semibold">Medical Disclaimer:</span> Ask about your uploaded documents. Not for diagnosis, dosing, or emergency advice.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="relative flex gap-2 items-end">
            {/* Attach button - Gray secondary */}
            <AttachButton
              onUploadStart={(fileName) => {
                setUploadProgress({ state: 'uploading', fileName })
              }}
              onUploaded={async (doc) => {
                setPendingAttach(doc)
                setUploadProgress(null)
                notify(`Uploaded ${doc.file_name}`, 'success')
                ;(async () => {
                  try {
                    setUploadProgress({ state: 'summarizing', fileName: doc.file_name })
                    notify(`Summarizing ${doc.file_name}…`, 'info')
                    const e = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id }) })
                    const ej = await e.json().catch(() => ({}))
                    if (e.ok) notify(`Summary ready for ${doc.file_name}`, 'success')
                    else notify(`Summary failed: ${ej.error || 'error'}`, 'error')
                  } catch (err:any) {
                    notify(`Summary error: ${err?.message || 'error'}`, 'error')
                  } finally {
                    setUploadProgress(null)
                  }
                })()
                try {
                  setUploadProgress({ state: 'indexing', fileName: doc.file_name })
                  notify(`Indexing ${doc.file_name}…`, 'info')
                  const r = await fetch('/api/rag/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id }) })
                  const j = await r.json().catch(() => ({}))
                  if (r.ok) notify(`Indexed ${doc.file_name} (${j.chunks || 0} chunks)`, 'success')
                  else notify(`Indexing failed: ${j.error || 'error'}`, 'error')
                } catch (e:any) {
                  notify(`Indexing error: ${e?.message || 'error'}`, 'error')
                } finally {
                  setUploadProgress(null)
                }
              }}
            />

            {/* Upload progress indicator - Gray with blue accents */}
            {uploadProgress && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-xs text-gray-700 shrink-0">
                <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-medium">
                  {uploadProgress.state === 'uploading' && 'Uploading'}
                  {uploadProgress.state === 'summarizing' && 'Summarizing'}
                  {uploadProgress.state === 'indexing' && 'Indexing'}
                </span>
                <span className="truncate max-w-[120px] text-gray-600" title={uploadProgress.fileName}>{uploadProgress.fileName}</span>
              </div>
            )}

            {/* Pending attachment chip - Clean white card */}
            {pendingAttach && !uploadProgress && (
              <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-2.5 py-2 text-xs text-gray-700 shrink-0 shadow-sm">
                {pendingAttach.file_type.startsWith('image/') ? (
                  <img
                    src={pendingAttach.signedUrl}
                    alt={pendingAttach.file_name}
                    className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                  />
                ) : pendingAttach.file_type === 'application/pdf' ? (
                  <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="truncate max-w-[140px] font-medium" title={pendingAttach.file_name}>{pendingAttach.file_name}</span>
                  <span className="text-[10px] text-gray-500">{pendingAttach.file_type.split('/')[1] || 'file'}</span>
                </div>
                <button className="text-gray-400 hover:text-gray-600 ml-1" onClick={() => setPendingAttach(null)} aria-label="Remove attachment">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Input field - Blue focus ring */}
            <input
              className="flex-1 min-w-0 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-gray-50 transition-colors"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={editing ? 'Edit your last message' : 'Ask anything'}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.shiftKey || e.metaKey)) { e.preventDefault(); send() } }}
            />

            {/* Send/Stop buttons */}
            {!loading ? (
              <button
                className="shrink-0 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                onClick={send}
                disabled={loading || (!input.trim() && !pendingAttach)}
              >
                Send
              </button>
            ) : (
              <button
                className="shrink-0 px-5 py-2.5 border border-gray-300 bg-white text-gray-700 text-sm font-semibold rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors shadow-sm"
                onClick={() => { if (abortRef.current) { try { abortRef.current.abort() } catch {} } }}
              >
                Stop
              </button>
            )}

            {/* Mobile options toggle */}
            <button className="text-gray-600 hover:text-gray-900 sm:hidden p-2" aria-label="Options" title="Options" onClick={() => setOptsOpen((v) => !v)}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            {optsOpen && (
              <div className="sm:hidden absolute bottom-16 right-2 z-10 rounded-lg border border-gray-200 bg-white shadow-lg p-4 text-xs text-gray-700 min-w-[200px]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium">Provider</span>
                  <select className="ml-auto border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white" value={providerOverride} onChange={(e) => setProviderOverride(e.target.value as any)}>
                    <option value="auto">Auto</option>
                    <option value="openai">OpenAI</option>
                    <option value="mock">Mock</option>
                  </select>
                </div>
                <label className="flex items-center justify-between gap-2">
                  <span className="font-medium">Streaming</span>
                  <input type="checkbox" className="rounded border-gray-300" checked={stream} onChange={async (e) => {
                    const next = e.target.checked; setStream(next); if (userId) { try { const s = getSupabase(); await (s as any).from('user_graph').upsert({ user_id: userId, streaming_default: next }) } catch {} }
                  }} />
                </label>
              </div>
            )}

            <div className="ml-auto hidden sm:flex items-center gap-4 text-xs text-gray-600">
              <label className="flex items-center gap-2">
                <span className="font-medium">Provider</span>
                <select className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white hover:bg-gray-50 transition-colors" value={providerOverride} onChange={(e) => setProviderOverride(e.target.value as any)}>
                  <option value="auto">Auto (OpenAI)</option>
                  <option value="openai">OpenAI only</option>
                  <option value="mock">Mock</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="font-medium">Streaming</span>
                <input
                  type="checkbox" className="rounded border-gray-300" checked={stream}
                  onChange={async (e) => {
                    const next = e.target.checked
                    setStream(next)
                    if (userId) {
                      try { const supabase = getSupabase(); await (supabase as any).from('user_graph').upsert({ user_id: userId, streaming_default: next }) } catch {}
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Toast notifications */}
        {toast && (
          <div className={`mt-3 text-xs inline-flex items-center gap-2 rounded-lg px-4 py-2.5 shadow-sm ${toast.type==='error' ? 'bg-red-50 border border-red-200 text-red-800' : toast.type==='success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-100 border border-gray-200 text-gray-800'}`}>
            {toast.text}
          </div>
        )}
        {profileToast && (
          <div className="mt-3 text-xs inline-flex items-center gap-3 rounded-lg px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-800 shadow-sm">
            <span>{profileToast.text}</span>
            <button className="text-blue-600 hover:text-blue-700 font-semibold" onClick={async () => {
              try {
                if (userId) {
                  await fetch('/api/profile/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, profilePartial: profileToast.previous }) })
                  notify('Reverted profile changes', 'success')
                }
              } finally { setProfileToast(null) }
            }}>Undo</button>
            <button className="text-gray-400 hover:text-gray-600 ml-auto" onClick={() => setProfileToast(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  )
}

function AttachButton({
  onUploaded,
  onUploadStart,
}: {
  onUploaded: (doc: { id: string; file_name: string; file_type: string; signedUrl: string }) => void
  onUploadStart?: (fileName: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        setBusy(true)
        onUploadStart?.(f.name)
        try {
          const supabase = getSupabase()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { window.location.href = '/login'; return }

          // Get user's Person record
          const personsRes = await fetch('/api/persons')
          if (!personsRes.ok) {
            alert('Failed to load user profile')
            return
          }
          const personsData = await personsRes.json()
          const persons = personsData.persons || []
          if (persons.length === 0) {
            alert('No person profile found. Please complete onboarding.')
            return
          }
          const personId = persons[0].id

          // Upload via API endpoint
          const formData = new FormData()
          formData.append('file', f)
          formData.append('personId', personId)

          const uploadRes = await fetch('/api/uploads', {
            method: 'POST',
            body: formData,
          })

          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}))
            alert(`Upload failed: ${errData.error || 'unknown error'}`)
            return
          }

          const uploadData = await uploadRes.json()
          const docId = uploadData.documentId
          if (!docId) {
            alert('Upload succeeded but no document ID returned')
            return
          }

          // Get document details to create signed URL for preview
          const docRes = await fetch(`/api/documents/${docId}`)
          if (!docRes.ok) {
            alert('Failed to get document details')
            return
          }
          const docData = await docRes.json()

          onUploaded({
            id: docId,
            file_name: f.name,
            file_type: f.type || 'application/octet-stream',
            signedUrl: docData.signedUrl || ''
          })
        } finally {
          setBusy(false)
          if (inputRef.current) inputRef.current.value = ''
        }
      }} />
      <button
        type="button"
        className="shrink-0 p-2.5 border border-gray-300 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Add attachment"
        title="Add attachment"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </>
  )
}
