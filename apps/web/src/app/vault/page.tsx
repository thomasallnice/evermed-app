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

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
      setDocs(data || [])
      setLoading(false)
    }
    load()
  }, [])

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
      <ul className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}>
        {filtered.map((d) => (
          <li key={d.id} className="border rounded-md p-3 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{d.file_name}</div>
                <div className="text-sm text-neutral-600">{d.file_type}</div>
                <div className="text-xs text-neutral-500">{new Date(d.uploaded_at || '').toLocaleString()}</div>
              </div>
              {selectMode && (
                <input
                  type="checkbox"
                  aria-label={`select ${d.file_name}`}
                  checked={!!selected[d.id]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [d.id]: e.target.checked }))}
                />
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <a className="button" href={`/doc/${d.id}`}>Open</a>
              <button
                className="button-quiet ml-auto text-sm"
                disabled={deletingId === d.id}
                onClick={async () => {
                  if (deletingId) return
                  if (!confirm(`Delete ${d.file_name}? This cannot be undone.`)) return
                  setError(null)
                  setDeletingId(d.id)
                  try {
                    const supabase = getSupabase()
                    // Delete storage object first (safe to ignore if already missing)
                    const sp = d.storage_path
                    if (sp) {
                      await supabase.storage.from('documents').remove([sp])
                    }
                    // Delete DB row (cascades remove summaries, rag, cache)
                    const { error: delErr } = await supabase.from('documents').delete().eq('id', d.id)
                    if (delErr) throw new Error(delErr.message)
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
          </li>
        ))}
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
