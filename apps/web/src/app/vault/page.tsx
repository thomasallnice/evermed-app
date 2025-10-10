'use client'
import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { DocumentRow } from '@/lib/types'

export default function VaultPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<'date' | 'name'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      // Check authentication
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      // Fetch documents via API route
      try {
        const response = await fetch('/api/documents')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load documents' }))
          setError(errorData.error || 'Failed to load documents')
          setLoading(false)
          return
        }

        const documents = await response.json()

        // Map Prisma fields to DocumentRow format
        const mappedDocs: DocumentRow[] = documents.map((doc: any) => ({
          id: doc.id,
          user_id: '', // Not needed for display
          storage_path: doc.storagePath,
          file_name: doc.filename,
          file_type: getMimeType(doc.kind),
          tags: [], // Not stored in current schema
          uploaded_at: doc.uploadedAt,
        }))

        setDocs(mappedDocs)

        // Fetch preview URLs for documents
        const supabase = getSupabase()
        const urlMap: Record<string, string> = {}
        for (const doc of mappedDocs) {
          if (doc.storage_path) {
            try {
              const { data: urlData } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.storage_path, 60 * 60) // 1 hour expiry
              const url = (urlData as any)?.signedUrl || (urlData as any)?.signedURL
              if (url) {
                urlMap[doc.id] = url
              }
            } catch {
              // Silently fail for individual documents
            }
          }
        }
        setPreviewUrls(urlMap)
      } catch (e: any) {
        setError(e?.message || 'Network error')
      }

      setLoading(false)
    }
    load()
  }, [])

  function getMimeType(kind: string): string {
    switch (kind) {
      case 'pdf': return 'application/pdf'
      case 'image': return 'image/jpeg'
      case 'note': return 'text/plain'
      default: return 'application/octet-stream'
    }
  }

  const fileTypes = Array.from(new Set((docs || []).map((d) => d.file_type || '').filter(Boolean)))
  const filtered = (docs || [])
    .filter((d) => (typeFilter === 'all' ? true : (d.file_type || '') === typeFilter))
    .filter((d) => (query ? d.file_name.toLowerCase().includes(query.toLowerCase()) : true))
    .sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.file_name.localeCompare(b.file_name)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const at = new Date(a.uploaded_at || 0).getTime()
      const bt = new Date(b.uploaded_at || 0).getTime()
      return sortDir === 'asc' ? at - bt : bt - at
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Document Vault</h1>
        <div className="flex gap-2">
          <button onClick={() => setSelectMode((v) => !v)}>{selectMode ? 'Cancel' : 'Select'}</button>
          <a className="button" href="/upload">Upload</a>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Search
          <input className="ml-2" placeholder="filename" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="text-sm">Type
          <select className="ml-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            {fileTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Sort
          <select className="ml-2" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
            <option value="date">Date</option>
            <option value="name">Name</option>
          </select>
        </label>
        <label className="text-sm">Dir
          <select className="ml-2" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>
        <div className="ml-auto flex gap-1 text-sm">
          <button onClick={() => setView('grid')} disabled={view==='grid'}>Grid</button>
          <button onClick={() => setView('list')} disabled={view==='list'}>List</button>
        </div>
      </div>
      {loading && <p>Loading…</p>}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {!loading && filtered.length === 0 && <p>No documents match.</p>}
      <ul className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
        {filtered.map((d) => {
          const previewUrl = previewUrls[d.id]
          const isImage = d.file_type?.startsWith('image/')
          const isPdf = d.file_type === 'application/pdf'

          return (
            <li key={d.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
              {/* Preview Image Section */}
              {view === 'grid' && (
                <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {previewUrl && isImage ? (
                    <img
                      src={previewUrl}
                      alt={d.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : previewUrl && isPdf ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full pointer-events-none"
                      title={`Preview of ${d.file_name}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm">{isPdf ? 'PDF' : isImage ? 'Image' : 'Document'}</span>
                    </div>
                  )}
                  {selectMode && (
                    <div className="absolute top-3 right-3">
                      <input
                        type="checkbox"
                        aria-label={`select ${d.file_name}`}
                        checked={!!selected[d.id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [d.id]: e.target.checked }))}
                        className="w-5 h-5 rounded border-2 border-white shadow-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Document Info Section */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-gray-900 truncate mb-1">{d.file_name}</div>
                    <div className="text-xs text-gray-500">{new Date(d.uploaded_at || '').toLocaleString()}</div>
                  </div>
                  {view === 'list' && selectMode && (
                    <input
                      type="checkbox"
                      aria-label={`select ${d.file_name}`}
                      checked={!!selected[d.id]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [d.id]: e.target.checked }))}
                      className="w-5 h-5 mt-1"
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <a
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg text-center transition-colors shadow-md"
                    href={`/doc/${d.id}`}
                  >
                    Open
                  </a>
                  <button
                    className="bg-white border border-gray-300 hover:bg-gray-50 hover:border-red-400 hover:text-red-600 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={deletingId === d.id}
                    onClick={async () => {
                      if (deletingId) return
                      if (!confirm(`Delete ${d.file_name}? This cannot be undone.`)) return
                      setError(null)
                      setDeletingId(d.id)
                      try {
                        // Delete via API route (handles both storage and database)
                        const response = await fetch(`/api/documents/${d.id}`, {
                          method: 'DELETE',
                        })
                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({ error: 'Failed to delete document' }))
                          throw new Error(errorData.error || 'Failed to delete document')
                        }
                        // Remove from local state
                        setDocs((prev) => prev.filter((x) => x.id !== d.id))
                      } catch (e: any) {
                        setError(e?.message || 'Failed to delete document')
                      } finally {
                        setDeletingId(null)
                      }
                    }}
                  >
                    {deletingId === d.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {selectMode && (
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const ids = Object.keys(selected).filter((k) => selected[k])
              if (ids.length === 0) return
              setShareUrl(null)
              const res = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docIds: ids, ttlHours: 24 }),
              })
              const json = await res.json()
              setShareUrl(json.url || null)
            }}
            disabled={Object.values(selected).every((v) => !v)}
          >
            Create share link
          </button>
          {shareUrl && (
            <div className="text-sm">
              <span className="mr-2">Share URL:</span>
              <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
              <button
                className="ml-2"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
