'use client'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { getSupabase } from '@/lib/supabase/client'

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
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)]">
      <div className="mb-1"><h1 className="text-2xl font-semibold">AI Chat</h1></div>
      <div ref={scrollRef} className="flex-1 overflow-auto border rounded-md bg-white">
        <div className="p-2 sm:p-3 space-y-4">
          {messages.length === 0 && <p className="text-neutral-600">Ask about your documents, medications, or conditions.</p>}
          {messages.map((m, i) => {
            if (m.role === 'user') {
              if (m.attachment) {
                const att = m.attachment
                const isImg = att.type?.startsWith('image/')
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl px-3 py-2 bg-neutral-900 text-white">
                      {m.content?.trim() && (
                        <div className="mb-2 whitespace-pre-wrap">{m.content}</div>
                      )}
                      <div className="text-xs mb-1 opacity-80">{att.name}</div>
                      {isImg ? (
                        <img src={att.url} alt={att.name} className="max-h-40 rounded" />
                      ) : (
                        <a href={att.url} target="_blank" rel="noreferrer" className="underline">Open</a>
                      )}
                    </div>
                  </div>
                )
              }
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-neutral-900 text-white">{m.content}</div>
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
                <div className="prose prose-neutral max-w-none">
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
                        if (target) return <a href={`/doc/${target}#c${num}`} className="citation-link"><sup {...props}>{children}</sup></a>
                        return <sup {...props}>{children}</sup>
                      },
                      // @ts-ignore simplify types for custom code renderer
                      code({ inline, children, ...props }: any) {
                        const text = String(children || '')
                        if (inline) return <code {...props}>{children}</code>
                        return (
                          <div className="relative group">
                            <pre {...props}>{children}</pre>
                            <button
                              type="button"
                              className="absolute top-2 right-2 rounded-md border border-neutral-300 bg-white/80 px-2 py-1 text-xs text-neutral-700 hover:bg-white"
                              onClick={() => navigator.clipboard.writeText(text)}
                            >Copy</button>
                          </div>
                        )
                      }
                    }}
                  >{clean}</ReactMarkdown>
                  {cited && cited.length > 0 && (
                    <span className="not-prose ml-2 inline-flex flex-wrap gap-2 align-middle">
                      {cited.map((s) => (
                        s.docId ? (
                          <a key={s.i} href={`/doc/${s.docId}`} className="pill">[{s.i}] {s.file} #{s.chunk}</a>
                        ) : (
                          <span key={s.i} className="pill">[{s.i}] {s.file} #{s.chunk}</span>
                        )
                      ))}
                    </span>
                  )}
                </div>
              </div>
            )
            return (
              <div key={`msg-${i}`}>
                {block}
                <hr className="my-6 border-neutral-200" />
              </div>
            )
          })}
          <div ref={bottomRef} />
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <span className="inline-block h-2 w-2 rounded-full bg-neutral-400 animate-pulse"></span>
              <span className="inline-block h-2 w-2 rounded-full bg-neutral-400 animate-pulse [animation-delay:150ms]"></span>
              <span className="inline-block h-2 w-2 rounded-full bg-neutral-400 animate-pulse [animation-delay:300ms]"></span>
              <span>Thinking…</span>
            </div>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 pt-2 bg-neutral-50 border-t pb-[env(safe-area-inset-bottom,0px)]">
        <div className="relative flex gap-2 items-center">
          {/* Attach document */}
          <AttachButton onUploaded={async (doc) => {
            // Hold as pending attachment (show chip until send)
            setPendingAttach(doc)
            notify(`Uploaded ${doc.file_name}`, 'success')
            // Kick off Explain in the background so Vault shows a summary for images
            ;(async () => {
              try {
                notify(`Summarizing ${doc.file_name}…`, 'info')
                const e = await fetch('/api/explain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id }) })
                const ej = await e.json().catch(() => ({}))
                if (e.ok) notify(`Summary ready for ${doc.file_name}`, 'success')
                else notify(`Summary failed: ${ej.error || 'error'}`, 'error')
              } catch (err:any) {
                notify(`Summary error: ${err?.message || 'error'}`, 'error')
              }
            })()
            // Then index for RAG
            try {
              notify(`Indexing ${doc.file_name}…`, 'info')
              const r = await fetch('/api/rag/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: doc.id }) })
              const j = await r.json().catch(() => ({}))
              if (r.ok) notify(`Indexed ${doc.file_name} (${j.chunks || 0} chunks)`, 'success')
              else notify(`Indexing failed: ${j.error || 'error'}`, 'error')
            } catch (e:any) {
              notify(`Indexing error: ${e?.message || 'error'}`, 'error')
            }
          }} />
          {/* Pending attachment chip/preview */}
          {pendingAttach && (
            <span className="inline-flex items-center gap-2 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700 shrink-0">
              <span className="truncate max-w-[140px]" title={pendingAttach.file_name}>{pendingAttach.file_name}</span>
              <button className="button-quiet" onClick={() => setPendingAttach(null)} aria-label="Remove attachment">×</button>
            </span>
          )}
          <input className="flex-1 min-w-0 h-10" value={input} onChange={(e) => setInput(e.target.value)} placeholder={editing ? 'Edit your last message' : 'Ask anything'} onKeyDown={(e) => { if (e.key === 'Enter' && (e.shiftKey || e.metaKey)) { e.preventDefault(); send() } }} />
          {!loading ? (
            <button className="shrink-0" onClick={send} disabled={loading || (!input.trim() && !pendingAttach)}>Send</button>
          ) : (
            <button className="button-quiet shrink-0" onClick={() => { if (abortRef.current) { try { abortRef.current.abort() } catch {} } }}>Stop</button>
          )}
          {/* Mobile options toggle */}
          <button className="button-quiet sm:hidden" aria-label="Options" title="Options" onClick={() => setOptsOpen((v) => !v)}>⋯</button>
          {optsOpen && (
            <div className="sm:hidden absolute bottom-12 right-2 z-10 rounded-md border bg-white shadow p-2 text-xs text-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <span>Provider</span>
                <select className="ml-1" value={providerOverride} onChange={(e) => setProviderOverride(e.target.value as any)}>
                  <option value="auto">Auto</option>
                  <option value="openai">OpenAI</option>
                  <option value="mock">Mock</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <span>Streaming</span>
                <input type="checkbox" checked={stream} onChange={async (e) => {
                  const next = e.target.checked; setStream(next); if (userId) { try { const s = getSupabase(); await (s as any).from('user_graph').upsert({ user_id: userId, streaming_default: next }) } catch {} }
                }} />
              </label>
            </div>
          )}

          <div className="ml-auto hidden sm:flex items-center gap-3 text-xs text-neutral-700">
            <label className="flex items-center gap-1">Provider
              <select className="ml-1" value={providerOverride} onChange={(e) => setProviderOverride(e.target.value as any)}>
                <option value="auto">Auto (OpenAI)</option>
                <option value="openai">OpenAI only</option>
                <option value="mock">Mock</option>
              </select>
            </label>
            <label className="flex items-center gap-2">Streaming
              <input
                type="checkbox" checked={stream}
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
        {toast && (
          <div className={`mt-2 text-xs inline-flex items-center gap-2 rounded-md px-2 py-1 ${toast.type==='error' ? 'bg-red-100 text-red-700' : toast.type==='success' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-700'}`}>
            {toast.text}
          </div>
        )}
        {profileToast && (
          <div className={`mt-2 text-xs inline-flex items-center gap-2 rounded-md px-2 py-1 bg-neutral-100 text-neutral-700`}>
            <span>{profileToast.text}</span>
            <button className="button-quiet" onClick={async () => {
              try {
                if (userId) {
                  await fetch('/api/profile/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, profilePartial: profileToast.previous }) })
                  notify('Reverted profile changes', 'success')
                }
              } finally { setProfileToast(null) }
            }}>Undo</button>
            <button className="button-quiet" onClick={() => setProfileToast(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  )
}

function AttachButton({ onUploaded }: { onUploaded: (doc: { id: string; file_name: string; file_type: string; signedUrl: string }) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        setBusy(true)
        try {
          const supabase = getSupabase()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { window.location.href = '/login'; return }
          const path = `${user.id}/${Date.now()}_${f.name}`
          const { error: upErr } = await supabase.storage.from('documents').upload(path, f, { upsert: false })
          if (upErr) { alert(`Upload error: ${upErr.message}`); return }
          const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(path, 60*60)
          const signedUrl = (urlData as any)?.signedUrl || (urlData as any)?.signedURL || ''
          const { data: ins, error: insErr } = await supabase.from('documents').insert({ user_id: user.id, storage_path: path, file_name: f.name, file_type: f.type || 'application/octet-stream', tags: [] } as any).select('id,file_name,file_type').single()
          if (insErr || !ins) { alert(`Insert error: ${insErr?.message || 'failed'}`); return }
          onUploaded({ id: (ins as any).id, file_name: (ins as any).file_name, file_type: (ins as any).file_type || 'application/octet-stream', signedUrl })
        } finally {
          setBusy(false)
          if (inputRef.current) inputRef.current.value = ''
        }
      }} />
      <button type="button" className="button-quiet" onClick={() => inputRef.current?.click()} disabled={busy} aria-label="Add attachment" title="Add attachment">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </button>
    </>
  )
}
