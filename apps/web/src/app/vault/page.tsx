'use client'
import { useEffect, useState } from 'react'
import type { Document, Person } from '@/lib/types'

type TopicSuggestion = {
  topic: string
  confidence: number
  reason: string
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

// Google Material Design - Colorful topic badges like Gmail labels
const TOPIC_COLORS: Record<string, string> = {
  'Labs': 'bg-blue-100 text-blue-700 border border-blue-200',
  'Imaging': 'bg-purple-100 text-purple-700 border border-purple-200',
  'Medications': 'bg-orange-100 text-orange-700 border border-orange-200',
  'Immunizations': 'bg-green-100 text-green-700 border border-green-200',
  'Consultations': 'bg-pink-100 text-pink-700 border border-pink-200',
  'Insurance': 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  'Other': 'bg-gray-100 text-gray-700 border border-gray-200'
}

// Document type icons for visual enhancement
const DOC_TYPE_ICONS: Record<string, string> = {
  'PDF': '📄',
  'Image': '🖼️',
  'Document': '📋',
  'default': '📁'
}

function getPersonDisplayName(person: Person | null, index?: number): string {
  if (!person) return 'Unknown Person'
  if (person.givenName || person.familyName) {
    return [person.givenName, person.familyName].filter(Boolean).join(' ')
  }
  return `Person ${index !== undefined ? index + 1 : ''}`
}

function TopicBadge({ topic }: { topic: string | null }) {
  if (!topic) return null
  const colorClass = TOPIC_COLORS[topic] || TOPIC_COLORS['Other']
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>
      {topic}
    </span>
  )
}

function TopicEditor({
  documentId,
  currentTopic,
  onSave,
  onCancel
}: {
  documentId: string
  currentTopic: string | null
  onSave: (topic: string | null) => void
  onCancel: () => void
}) {
  const [topic, setTopic] = useState(currentTopic || '')
  const [saving, setSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Show all topics when input is empty, otherwise filter by input
  const filteredSuggestions = topic.trim() === ''
    ? COMMON_TOPICS
    : COMMON_TOPICS.filter(t =>
        t.toLowerCase().includes(topic.toLowerCase())
      )

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || null })
      })
      if (!res.ok) throw new Error('Failed to update topic')
      onSave(topic.trim() || null)
    } catch (e: any) {
      alert(e?.message || 'Failed to update topic')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative mt-3 space-y-3">
      <div className="relative">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Enter topic (e.g., Labs, Imaging)"
          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
          aria-label="Document topic"
          autoFocus
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {filteredSuggestions.map(suggestion => {
              return (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-900 bg-white hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
                  onMouseDown={() => {
                    setTopic(suggestion)
                    setShowSuggestions(false)
                  }}
                >
                  {suggestion}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Saving...' : 'Save Topic'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function VaultPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [topicFilter, setTopicFilter] = useState<string>('all')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'date' | 'name'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  // UI state
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [suggestingTopicId, setSuggestingTopicId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Record<string, TopicSuggestion[]>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [docsRes, personsRes] = await Promise.all([
          fetch('/api/documents'),
          fetch('/api/persons')
        ])

        if (!docsRes.ok || !personsRes.ok) {
          if (docsRes.status === 401 || personsRes.status === 401) {
            window.location.href = '/login'
            return
          }
          throw new Error('Failed to load data')
        }

        const docsData = await docsRes.json()
        const personsData = await personsRes.json()

        setDocs(docsData.documents || [])
        setPersons(personsData.persons || [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load vault')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Extract unique topics and kinds
  const uniqueTopics = Array.from(new Set(docs.map(d => d.topic).filter(Boolean))) as string[]
  const uniqueKinds = Array.from(new Set(docs.map(d => d.kind).filter(Boolean)))

  // Filter and sort documents
  const filtered = docs
    .filter(d => personFilter === 'all' || d.personId === personFilter)
    .filter(d => topicFilter === 'all' || d.topic === topicFilter)
    .filter(d => kindFilter === 'all' || d.kind === kindFilter)
    .filter(d => query ? d.filename.toLowerCase().includes(query.toLowerCase()) : true)
    .sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.filename.localeCompare(b.filename)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const at = new Date(a.uploadedAt).getTime()
      const bt = new Date(b.uploadedAt).getTime()
      return sortDir === 'asc' ? at - bt : bt - at
    })

  async function handleDeleteDocument(doc: Document) {
    if (deletingId) return
    if (!confirm(`Delete ${doc.filename}? This cannot be undone.`)) return

    setError(null)
    setDeletingId(doc.id)

    try {
      // Note: You'll need to implement DELETE endpoint or use Supabase storage deletion
      // For now, this is a placeholder
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to delete document')

      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (e: any) {
      setError(e?.message || 'Failed to delete document')
    } finally {
      setDeletingId(null)
    }
  }

  function handleTopicSaved(docId: string, newTopic: string | null) {
    setDocs(prev =>
      prev.map(d => (d.id === docId ? { ...d, topic: newTopic } : d))
    )
    setEditingTopicId(null)
    // Clear suggestions for this document
    setSuggestions(prev => {
      const next = { ...prev }
      delete next[docId]
      return next
    })
  }

  async function handleSuggestTopic(doc: Document) {
    if (suggestingTopicId) return // Already suggesting for another doc

    setSuggestingTopicId(doc.id)
    setError(null)

    try {
      const res = await fetch(`/api/documents/${doc.id}/suggest-topic`, {
        method: 'POST'
      })

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a minute.')
        }
        throw new Error('Failed to get topic suggestions')
      }

      const data = await res.json()
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(prev => ({ ...prev, [doc.id]: data.suggestions }))
      } else {
        setError('No suggestions available for this document')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to get topic suggestions')
    } finally {
      setSuggestingTopicId(null)
    }
  }

  function dismissSuggestions(docId: string) {
    setSuggestions(prev => {
      const next = { ...prev }
      delete next[docId]
      return next
    })
  }

  // Empty states
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md animate-pulse">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Loading your vault...</p>
        </div>
      </div>
    )
  }

  if (persons.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto pt-16 px-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Document Vault</h1>
          <div className="bg-white rounded-2xl shadow-md p-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-700 text-base mb-8">
              You need to create a person profile before uploading documents.
            </p>
            <a
              href="/profile"
              className="inline-block px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            >
              Create Person Profile
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl shadow-md">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Document Vault</h1>
              <p className="text-sm text-gray-600 mt-0.5">Organize and access your medical documents</p>
            </div>
          </div>
          <a
            href="/upload"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-blue-600 text-white text-base font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </a>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Person Filter */}
            <div className="space-y-2">
              <label htmlFor="person-filter" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Person
              </label>
              <select
                id="person-filter"
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                aria-label="Filter by person"
              >
                <option value="all">All People</option>
                {persons.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    {getPersonDisplayName(p, idx)}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            <div className="space-y-2">
              <label htmlFor="topic-filter" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Topic
              </label>
              <select
                id="topic-filter"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                aria-label="Filter by topic"
              >
                <option value="all">All Topics</option>
                {uniqueTopics.length === 0 && <option disabled>(No Topics)</option>}
                {uniqueTopics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Kind Filter */}
            <div className="space-y-2">
              <label htmlFor="kind-filter" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Type
              </label>
              <select
                id="kind-filter"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                aria-label="Filter by document type"
              >
                <option value="all">All Types</option>
                {uniqueKinds.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label htmlFor="search-input" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Search
              </label>
              <div className="relative">
                <input
                  id="search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search filename..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  aria-label="Search documents by filename"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort and View Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label htmlFor="sort-key" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Sort by:
                </label>
                <select
                  id="sort-key"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as 'date' | 'name')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  aria-label="Sort documents by"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-dir" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Order:
                </label>
                <select
                  id="sort-dir"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                  aria-label="Sort direction"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView('grid')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all ${
                  view === 'grid'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Grid
              </button>
              <button
                onClick={() => setView('list')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all ${
                  view === 'list'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                aria-label="List view"
                aria-pressed={view === 'list'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                List
              </button>
            </div>
          </div>
        </div>

        {/* Document Count */}
        <div className="px-1">
          <span className="text-sm font-medium text-gray-700">
            Showing {filtered.length} of {docs.length} document{docs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Empty States */}
        {filtered.length === 0 && docs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-1">
              {personFilter !== 'all'
                ? `No documents for ${getPersonDisplayName(
                    persons.find(p => p.id === personFilter) || null
                  )}`
                : topicFilter !== 'all'
                ? `No documents tagged with "${topicFilter}"`
                : 'No documents match your filters.'}
            </p>
            <p className="text-sm text-gray-600">Try adjusting your filters</p>
          </div>
        )}

        {filtered.length === 0 && docs.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your vault is empty</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">Start building your medical document collection by uploading your first document.</p>
            <a
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Your First Document
            </a>
          </div>
        )}

        {/* Documents Grid/List */}
        {filtered.length > 0 && (
          <div
            className={
              view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
                : 'space-y-4'
            }
          >
            {filtered.map((doc, index) => {
              const personIndex = persons.findIndex(p => p.id === doc.personId)
              const docIcon = DOC_TYPE_ICONS[doc.kind] || DOC_TYPE_ICONS['default']

              return (
                <div
                  key={doc.id}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 p-5"
                >
                  {/* Document Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 text-2xl mt-0.5">
                        {docIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-sm mb-1" title={doc.filename}>
                          {doc.filename}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {getPersonDisplayName(doc.person, personIndex)}
                        </p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full border border-gray-200">
                      {doc.kind}
                    </span>
                  </div>

                  {/* Topic Section */}
                  <div className="mb-4">
                    {editingTopicId === doc.id ? null : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {doc.topic ? (
                          <TopicBadge topic={doc.topic} />
                        ) : (
                          <span className="text-xs text-gray-500 italic">No topic</span>
                        )}
                        <button
                          onClick={() => setEditingTopicId(doc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                          aria-label="Edit topic"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {doc.topic ? 'Edit' : 'Add'}
                        </button>
                        {!doc.topic && !suggestions[doc.id] && (
                          <button
                            onClick={() => handleSuggestTopic(doc)}
                            disabled={suggestingTopicId === doc.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            aria-label="Suggest topic"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {suggestingTopicId === doc.id ? 'Suggesting...' : 'AI Suggest'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingTopicId === doc.id && (
                    <TopicEditor
                      documentId={doc.id}
                      currentTopic={doc.topic}
                      onSave={(newTopic) => handleTopicSaved(doc.id, newTopic)}
                      onCancel={() => setEditingTopicId(null)}
                    />
                  )}

                  {/* AI Suggestions */}
                  {suggestions[doc.id] && suggestions[doc.id].length > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                          AI Suggestions
                        </h4>
                        <button
                          onClick={() => dismissSuggestions(doc.id)}
                          className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-900 focus:outline-none"
                          aria-label="Dismiss suggestions"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="space-y-2">
                        {suggestions[doc.id].map((suggestion, idx) => {
                          const colorClass = TOPIC_COLORS[suggestion.topic] || TOPIC_COLORS['Other']
                          return (
                            <div
                              key={idx}
                              className="flex items-start justify-between gap-3 p-3 bg-white rounded-lg border border-blue-200 shadow-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass}`}>
                                    {suggestion.topic}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2" title={suggestion.reason}>
                                  {suggestion.reason}
                                </p>
                              </div>
                              <button
                                onClick={() => handleTopicSaved(doc.id, suggestion.topic)}
                                className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap transition-all"
                                aria-label={`Accept ${suggestion.topic}`}
                              >
                                Accept
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upload Date */}
                  <div className="mb-4 text-xs text-gray-600 font-medium">
                    {new Date(doc.uploadedAt).toLocaleString()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <a
                      href={`/doc/${doc.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Open
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deletingId === doc.id}
                      className="px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      aria-label="Delete document"
                      title="Delete document"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
