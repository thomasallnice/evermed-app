'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [doc, setDoc] = useState<any>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [structured, setStructured] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [textPreview, setTextPreview] = useState<string | null>(null)
  const [ragInfo, setRagInfo] = useState<{ chunks?: number } | null>(null)
  const [ragError, setRagError] = useState<string | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)
  const [snippet, setSnippet] = useState<{ index: number; content: string } | null>(null)
  const snippetRef = useState<HTMLDivElement | null>(null)[0] as any

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const supabase = getSupabase()
      const { data } = await supabase.from('documents').select('*').eq('id', id).single()
      setDoc(data)
      const { data: s } = await supabase.from('summaries').select('summary_text, structured_json').eq('document_id', id).maybeSingle()
      setSummary((s as any)?.summary_text || null)
      setStructured((s as any)?.structured_json || null)
      // Create a temporary signed URL for preview/download
      if ((data as any)?.storage_path) {
        const { data: urlData } = await supabase.storage.from('documents').createSignedUrl((data as any).storage_path, 60 * 60)
        const url = (urlData as any)?.signedUrl || (urlData as any)?.signedURL || null
        setSignedUrl(url)
        // For text files, fetch content for inline preview
        if (url && typeof (data as any).file_type === 'string' && (data as any).file_type.startsWith('text/')) {
          try {
            const res = await fetch(url)
            if (res.ok) setTextPreview(await res.text())
          } catch {}
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    ;(async () => {
      if (!id) return
      try {
        const res = await fetch(`/api/rag/status?documentId=${id}`)
        const j = await res.json()
        if (res.ok) setRagInfo({ chunks: j.chunks || 0 })
      } catch {}
    })()
  }, [id])

  // If navigated with #c{index}, fetch and show the specific chunk snippet
  useEffect(() => {
    (async () => {
      if (!id) return
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const m = hash.match(/^#c(\d+)$/)
      if (!m) return
      const idx = Number(m[1])
      try {
        const supabase = getSupabase()
        const { data: ragDoc } = await supabase.from('rag_documents').select('id').eq('document_id', id).maybeSingle()
        const ragId = (ragDoc as any)?.id
        if (!ragId) return
        const { data: chunk } = await supabase.from('rag_chunks').select('content').eq('document_id', ragId).eq('chunk_index', idx).maybeSingle()
        const content = (chunk as any)?.content || ''
        if (content) {
          setSnippet({ index: idx, content })
          setTimeout(() => {
            try { document.querySelector('#snippet')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
          }, 100)
        }
      } catch {}
    })()
  }, [id])

  async function explain() {
    if (!id) return
    setBusy(true)
    setExplainError(null)
    try {
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: id }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setExplainError((data as any)?.error || 'Explain failed')
        } else {
          setSummary((data as any).summary)
          setStructured((data as any).structured || null)
        }
      } catch (e: any) {
        setExplainError(e?.message || 'Network error')
      }
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    if (!id) return
    setBusy(true)
    setShareUrl(null)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docIds: [id], ttlHours: 24 }),
      })
      const data = await res.json()
      setShareUrl(data.url || null)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p>Loading…</p>
  if (!doc) return <p>Not found</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{doc.file_name}</h1>
      <div className="text-sm text-neutral-600">{doc.file_type}</div>
      <div className="flex gap-2 items-center flex-wrap">
        <button onClick={explain} disabled={busy}>{busy ? 'Explaining…' : 'Explain this document'}</button>
        <button onClick={share} disabled={busy}>Share link</button>
        {signedUrl && (
          <a className="button" href={signedUrl} target="_blank" rel="noreferrer">Open original</a>
        )}
        <button
          onClick={async () => {
            if (!id) return
            setBusy(true)
            setRagError(null)
            try {
              const r = await fetch('/api/rag/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: id }) })
              const j = await r.json().catch(() => ({}))
              if (r.ok) {
                setRagInfo({ chunks: ((j as any).chunks || ragInfo?.chunks || 0) })
              } else {
                setRagError((j as any)?.error || 'Indexing failed')
              }
            } catch (e: any) {
              setRagError(e?.message || 'Network error')
            } finally { setBusy(false) }
          }}
          disabled={busy}
        >{busy ? 'Indexing…' : 'Rebuild RAG'}</button>
        {ragInfo?.chunks !== undefined && (
          <span className="text-sm text-neutral-600">Indexed chunks: {ragInfo.chunks}</span>
        )}
        {ragError && (
          <span className="text-sm text-red-600">{ragError}</span>
        )}
        {shareUrl && (
          <span className="text-sm">
            <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
            <button className="ml-2" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</button>
          </span>
        )}
      </div>
      {/* Inline Preview */}
      {signedUrl && (
        <div className="border rounded-md bg-white p-2">
          {typeof doc.file_type === 'string' && doc.file_type.startsWith('image/') && (
            <img src={signedUrl} alt={doc.file_name} className="max-w-full h-auto rounded" />
          )}
          {doc.file_type === 'application/pdf' && (
            <iframe src={signedUrl} className="w-full h-[70vh]" title="PDF preview" />
          )}
          {typeof doc.file_type === 'string' && doc.file_type.startsWith('text/') && (
            <pre className="whitespace-pre-wrap text-sm text-neutral-800 max-h-[70vh] overflow-auto p-3">{textPreview || 'Loading preview…'}</pre>
          )}
          {(!doc.file_type || (!doc.file_type.startsWith('image/') && doc.file_type !== 'application/pdf' && !doc.file_type.startsWith('text/'))) && (
            <div className="text-sm text-neutral-700 p-3">
              No inline preview available. Use “Open original” to view or download.
            </div>
          )}
        </div>
      )}
      {structured ? (
        <div className="border rounded-md p-3 bg-white">
          <h2 className="font-medium mb-1">{structured.title || 'AI Summary'}</h2>
          {snippet && (
            <div id="snippet" className="my-3 rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <div className="text-xs text-yellow-700 mb-1">Relevant snippet (chunk #{snippet.index})</div>
              <p className="whitespace-pre-wrap text-sm text-neutral-800">{snippet.content}</p>
            </div>
          )}
          {Array.isArray(structured.key_points) && structured.key_points.length > 0 && (
            <ul className="list-disc ml-5 space-y-1">
              {structured.key_points.map((p: string, i: number) => (
                <li key={i} className="text-neutral-800">{p}</li>
              ))}
            </ul>
          )}
          {Array.isArray(structured.risks) && structured.risks.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium">Risks</h3>
              <ul className="list-disc ml-5 space-y-1">
                {structured.risks.map((p: string, i: number) => (
                  <li key={i} className="text-neutral-800">{p}</li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(structured.next_steps) && structured.next_steps.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium">Next Steps</h3>
              <ul className="list-disc ml-5 space-y-1">
                {structured.next_steps.map((p: string, i: number) => (
                  <li key={i} className="text-neutral-800">{p}</li>
                ))}
              </ul>
            </div>
          )}
          {summary && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-neutral-600">Show raw summary</summary>
              <div className="prose prose-neutral max-w-none mt-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkCitations as any]}
                  components={{
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
                >{summary}</ReactMarkdown>
              </div>
            </details>
          )}
        </div>
      ) : summary ? (
        <div className="border rounded-md p-3 bg-white">
          <h2 className="font-medium mb-1">AI Summary</h2>
          <div className="prose prose-neutral max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkCitations as any]}
              components={{
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
            >{summary}</ReactMarkdown>
          </div>
        </div>
      ) : null}
      {explainError && (
        <p className="text-sm text-red-600">{explainError}</p>
      )}
    </div>
  )
}

// Remark plugin to render numeric citations like [1] as subtle superscripts (matches chat behavior)
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
