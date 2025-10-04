'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'
import { MEDICAL_DISCLAIMER } from '@/lib/copy'

// Google Material Design - Colorful topic badges matching vault page
const TOPIC_COLORS: Record<string, string> = {
  'Labs': 'bg-blue-100 text-blue-700 border border-blue-200',
  'Imaging': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Medications': 'bg-orange-100 text-orange-700 border border-orange-200',
  'Immunizations': 'bg-green-100 text-green-700 border border-green-200',
  'Consultations': 'bg-pink-100 text-pink-700 border border-pink-200',
  'Insurance': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  'Other': 'bg-gray-100 text-gray-700 border border-gray-200'
}

const COMMON_TOPICS = [
  'Labs',
  'Imaging',
  'Medications',
  'Immunizations',
  'Consultations',
  'Insurance',
  'Other'
]

// Document type icons
const getFileTypeIcon = (fileType: string) => {
  if (fileType === 'application/pdf') return '📄'
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType.startsWith('text/')) return '📝'
  return '📁'
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
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
  const [isEditingTopic, setIsEditingTopic] = useState(false)
  const [editTopic, setEditTopic] = useState('')
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false)

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

  async function handleTopicSave() {
    if (!id) return
    setBusy(true)
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: editTopic.trim() || null })
      })
      if (!res.ok) throw new Error('Failed to update topic')
      setDoc({ ...doc, topic: editTopic.trim() || null })
      setIsEditingTopic(false)
    } catch (e: any) {
      alert(e?.message || 'Failed to update topic')
    } finally {
      setBusy(false)
    }
  }

  function startEditTopic() {
    setEditTopic(doc?.topic || '')
    setIsEditingTopic(true)
    setShowTopicSuggestions(true)
  }

  function cancelEditTopic() {
    setIsEditingTopic(false)
    setShowTopicSuggestions(false)
    setEditTopic('')
  }

  const filteredTopics = editTopic.trim() === ''
    ? COMMON_TOPICS
    : COMMON_TOPICS.filter(t => t.toLowerCase().includes(editTopic.toLowerCase()))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Loading document…</p>
        </div>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-2xl shadow-md p-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold text-lg">Document not found</p>
          </div>
        </div>
      </div>
    )
  }

  const topicColorClass = TOPIC_COLORS[doc.topic] || TOPIC_COLORS['Other']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Back button - Gray secondary style */}
        <button
          onClick={() => router.push('/vault')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Vault
        </button>

        {/* Document header card */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 text-3xl mt-1">{getFileTypeIcon(doc.file_type)}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 break-words">{doc.file_name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">{doc.file_type}</span>
                {doc.topic && !isEditingTopic && (
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${topicColorClass}`}>
                    {doc.topic}
                  </span>
                )}
                <button
                  onClick={startEditTopic}
                  disabled={busy || isEditingTopic}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {doc.topic ? 'Edit topic' : 'Add topic'}
                </button>
              </div>
            </div>
          </div>

          {/* Topic editor */}
          {isEditingTopic && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="relative mb-3">
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  onFocus={() => setShowTopicSuggestions(true)}
                  placeholder="Enter topic (e.g., Labs, Imaging)"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  autoFocus
                  aria-label="Document topic"
                />
                {showTopicSuggestions && filteredTopics.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredTopics.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setEditTopic(t)
                          setShowTopicSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-900 bg-white hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleTopicSave}
                  disabled={busy}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                >
                  {busy ? 'Saving...' : 'Save Topic'}
                </button>
                <button
                  onClick={cancelEditTopic}
                  disabled={busy}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons - Blue primary for Explain, Gray for others */}
          <div className="flex gap-2 items-center flex-wrap">
            <button
              onClick={explain}
              disabled={busy}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {busy ? 'Explaining…' : 'Explain Document'}
            </button>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            )}
            <button
              onClick={share}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
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
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {busy ? 'Indexing…' : 'Rebuild Index'}
            </button>
          </div>

          {/* Status messages */}
          <div className="mt-4 flex flex-col gap-2">
            {ragInfo?.chunks !== undefined && (
              <div className="inline-flex items-center gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm w-fit">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Indexed chunks: {ragInfo.chunks}</span>
              </div>
            )}
            {ragError && (
              <div className="inline-flex items-center gap-2 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-sm w-fit">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{ragError}</span>
              </div>
            )}
            {shareUrl && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <a href={shareUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex-1 truncate underline">
                  {shareUrl}
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all shadow-sm"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Inline Preview */}
        {signedUrl && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            </div>
            <div className="p-0">
              {typeof doc.file_type === 'string' && doc.file_type.startsWith('image/') && (
                <img src={signedUrl} alt={doc.file_name} className="max-w-full h-auto" />
              )}
              {doc.file_type === 'application/pdf' && (
                <iframe src={signedUrl} className="w-full h-[70vh]" title="PDF preview" />
              )}
              {typeof doc.file_type === 'string' && doc.file_type.startsWith('text/') && (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 max-h-[70vh] overflow-auto p-6 bg-gray-50">{textPreview || 'Loading preview…'}</pre>
              )}
              {(!doc.file_type || (!doc.file_type.startsWith('image/') && doc.file_type !== 'application/pdf' && !doc.file_type.startsWith('text/'))) && (
                <div className="text-sm text-gray-600 p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-medium">No inline preview available</p>
                  <p className="text-xs text-gray-500 mt-1">Use the Download button to view the file</p>
                </div>
              )}
            </div>
          </div>
        )}
        {structured ? (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{structured.title || 'AI Summary'}</h2>

            {/* Medical Disclaimer */}
            <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-800 leading-relaxed">
                <span className="font-semibold">Medical Disclaimer:</span> {structured.disclaimer || MEDICAL_DISCLAIMER}
              </p>
            </div>

            {/* Snippet highlight */}
            {snippet && (
              <div id="snippet" className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-blue-700 font-semibold mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Relevant snippet (chunk #{snippet.index})
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{snippet.content}</p>
              </div>
            )}

            {/* Key Findings */}
            {Array.isArray(structured.key_points) && structured.key_points.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Key Findings
                </h3>
                <ul className="list-disc ml-5 space-y-2">
                  {structured.key_points.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Questions for Clinician */}
            {Array.isArray(structured.questions_for_clinician) && structured.questions_for_clinician.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Questions for Your Clinician
                </h3>
                <ul className="list-disc ml-5 space-y-2">
                  {structured.questions_for_clinician.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* What to Watch */}
            {Array.isArray(structured.what_to_watch) && structured.what_to_watch.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  What to Watch
                </h3>
                <ul className="list-disc ml-5 space-y-2">
                  {structured.what_to_watch.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources */}
            {Array.isArray(structured.sources) && structured.sources.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Sources
                </h3>
                <ul className="list-disc ml-5 space-y-2">
                  {structured.sources.map((s: any, i: number) => (
                    <li key={i} className="text-sm text-gray-600 leading-relaxed">
                      {s.section ? `${s.reference} (${s.section})` : s.reference}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Legacy fields for backward compatibility */}
            {Array.isArray(structured.risks) && structured.risks.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Risks
                </h3>
                <ul className="list-disc ml-5 space-y-2">
                  {structured.risks.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {Array.isArray(structured.next_steps) && structured.next_steps.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Next Steps
                </h3>
                <ul className="list-disc ml-5 space-y-2">
                  {structured.next_steps.map((p: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 leading-relaxed">{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Raw summary (collapsible) */}
            {summary && (
              <details className="border-t border-gray-200 pt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show raw summary
                </summary>
                <div className="prose prose-sm prose-gray max-w-none mt-4 text-gray-700 leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkCitations as any]}
                    components={{
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
                  >{summary}</ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ) : summary ? (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Summary</h2>

            {/* Medical Disclaimer */}
            <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-800 leading-relaxed">
                <span className="font-semibold">Medical Disclaimer:</span> {MEDICAL_DISCLAIMER}
              </p>
            </div>

            <div className="prose prose-sm prose-gray max-w-none text-gray-700 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkCitations as any]}
                components={{
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
              >{summary}</ReactMarkdown>
            </div>
          </div>
        ) : null}

        {/* Error message */}
        {explainError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-800">{explainError}</p>
            </div>
          </div>
        )}
      </div>
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
