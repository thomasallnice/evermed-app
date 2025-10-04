'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { MEDICAL_DISCLAIMER } from '@/lib/copy'

// Types
type Pack = {
  id: string
  title: string
  audience: 'cardiology' | 'school' | 'urgent'
  expiresAt: string
  revokedAt: string | null
  viewsCount: number
  createdAt: string
}

type LogEvent = {
  kind: string
  createdAt: string
  ipHash: string | null
}

type PackStatus = 'active' | 'expiring-soon' | 'expired' | 'revoked'
type FilterStatus = 'all' | PackStatus
type FilterAudience = 'all' | Pack['audience']

// Audience icons and labels
const AUDIENCE_INFO = {
  cardiology: { label: 'Cardiology', icon: '❤️' },
  school: { label: 'School', icon: '🏫' },
  urgent: { label: 'Urgent Care', icon: '🚑' },
}

export default function PacksPage() {
  const router = useRouter()
  const supabase = getSupabase()

  // Authentication
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Packs data
  const [packs, setPacks] = useState<Pack[]>([])
  const [filteredPacks, setFilteredPacks] = useState<Pack[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [audienceFilter, setAudienceFilter] = useState<FilterAudience>('all')

  // Logs modal
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Action states
  const [revokingPackId, setRevokingPackId] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<{ packId: string; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/auth/login')
          return
        }
        setUserId(user.id)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.replace('/auth/login')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [supabase, router])

  // Load packs when userId is available
  useEffect(() => {
    if (!userId) return
    loadPacks()
  }, [userId])

  // Apply filters when packs or filters change
  useEffect(() => {
    applyFilters()
  }, [packs, statusFilter, audienceFilter])

  async function loadPacks() {
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      // Get packs via API endpoint (handles authorization and person lookup)
      const packsRes = await fetch('/api/share-packs')
      if (!packsRes.ok) {
        if (packsRes.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to load packs')
      }

      const packsData = await packsRes.json()
      setPacks((packsData.packs || []) as Pack[])
    } catch (err: any) {
      console.error('Failed to load packs:', err)
      setError(err.message || 'Failed to load appointment packs')
    } finally {
      setLoading(false)
    }
  }

  function getPackStatus(pack: Pack): PackStatus {
    if (pack.revokedAt) return 'revoked'
    const now = new Date()
    const expiresAt = new Date(pack.expiresAt)
    if (expiresAt < now) return 'expired'
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntilExpiry < 24) return 'expiring-soon'
    return 'active'
  }

  function applyFilters() {
    let filtered = [...packs]

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((pack) => getPackStatus(pack) === statusFilter)
    }

    // Audience filter
    if (audienceFilter !== 'all') {
      filtered = filtered.filter((pack) => pack.audience === audienceFilter)
    }

    setFilteredPacks(filtered)
  }

  async function handleCopyLink(packId: string) {
    const link = `${window.location.origin}/share/${packId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopyStatus({ packId, message: 'Link copied!' })
      setTimeout(() => setCopyStatus(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      setCopyStatus({ packId, message: 'Failed to copy' })
      setTimeout(() => setCopyStatus(null), 2000)
    }
  }

  async function handleViewLogs(packId: string) {
    setSelectedPackId(packId)
    setLoadingLogs(true)
    setError(null)

    try {
      const response = await fetch(`/api/share-packs/${packId}/logs`)
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await response.json()
      setLogs(data.events || [])
    } catch (err: any) {
      console.error('Failed to load logs:', err)
      setError(err.message || 'Failed to load activity logs')
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  async function handleRevoke(packId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to revoke this pack? This action cannot be undone, and the pack will no longer be accessible.'
    )
    if (!confirmed) return

    setRevokingPackId(packId)
    setError(null)

    try {
      const response = await fetch(`/api/share-packs/${packId}/revoke`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke pack')
      }

      // Update the pack in the local state
      setPacks((prevPacks) =>
        prevPacks.map((pack) =>
          pack.id === packId ? { ...pack, revokedAt: new Date().toISOString() } : pack
        )
      )
    } catch (err: any) {
      console.error('Failed to revoke pack:', err)
      setError(err.message || 'Failed to revoke pack')
    } finally {
      setRevokingPackId(null)
    }
  }

  function closeLogsModal() {
    setSelectedPackId(null)
    setLogs([])
  }

  function getStatusBadgeClasses(status: PackStatus): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'expiring-soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'revoked':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  function getStatusLabel(status: PackStatus): string {
    switch (status) {
      case 'active':
        return 'Active'
      case 'expiring-soon':
        return 'Expiring Soon'
      case 'expired':
        return 'Expired'
      case 'revoked':
        return 'Revoked'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div
            className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Loading"
          />
          <p className="text-lg text-gray-600">Loading your appointment packs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointment Packs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and share your medical document collections
            </p>
          </div>
          <button
            onClick={() => router.push('/packs/create')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
            aria-label="Create new appointment pack"
          >
            Create New Pack
          </button>
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-white border border-blue-200 rounded-2xl p-6 shadow-md">
          <p className="text-sm text-gray-700">{MEDICAL_DISCLAIMER}</p>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="bg-white border border-red-200 rounded-2xl p-6 shadow-md"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-700 underline hover:text-red-800"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {packs.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Status Filter */}
              <div className="flex-1">
                <label htmlFor="status-filter" className="block text-sm font-semibold text-gray-900 mb-2">
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all duration-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="expiring-soon">Expiring Soon</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>

              {/* Audience Filter */}
              <div className="flex-1">
                <label htmlFor="audience-filter" className="block text-sm font-semibold text-gray-900 mb-2">
                  Filter by Audience
                </label>
                <select
                  id="audience-filter"
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as FilterAudience)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all duration-200"
                >
                  <option value="all">All Audiences</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="school">School</option>
                  <option value="urgent">Urgent Care</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="flex items-end">
                <p className="text-sm text-gray-600 pb-2.5 font-medium">
                  Showing {filteredPacks.length} of {packs.length} packs
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Packs List */}
        {packs.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <div className="max-w-md mx-auto space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">No Appointment Packs Yet</h2>
                <p className="text-gray-600 mt-2">
                  Create your first appointment pack to securely share medical documents and observations
                  with healthcare providers, schools, or urgent care facilities.
                </p>
              </div>
              <button
                onClick={() => router.push('/packs/create')}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
              >
                Create Your First Pack
              </button>
            </div>
          </div>
        ) : filteredPacks.length === 0 ? (
          // No Results from Filters
          <div className="bg-white rounded-2xl p-8 text-center shadow-md">
            <p className="text-gray-600">
              No packs match your current filters. Try adjusting your filter criteria.
            </p>
          </div>
        ) : (
          // Packs Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPacks.map((pack) => {
              const status = getPackStatus(pack)
              const isActionable = status !== 'revoked' && status !== 'expired'
              const isRevoking = revokingPackId === pack.id
              const copyMessage = copyStatus?.packId === pack.id ? copyStatus.message : null

              return (
                <div
                  key={pack.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1 line-clamp-2">
                        {pack.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusBadgeClasses(status)}`}
                        aria-label={`Status: ${getStatusLabel(status)}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>

                    {/* Audience Badge */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-base" aria-hidden="true">
                        {AUDIENCE_INFO[pack.audience].icon}
                      </span>
                      <span className="font-medium">{AUDIENCE_INFO[pack.audience].label}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-3 flex-1">
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-semibold text-gray-900">
                          {new Date(pack.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Expires:</span>
                        <span
                          className={`font-semibold ${
                            status === 'expiring-soon'
                              ? 'text-yellow-700'
                              : status === 'expired'
                              ? 'text-gray-500'
                              : 'text-gray-900'
                          }`}
                        >
                          {new Date(pack.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Views:</span>
                        <span className="font-semibold text-gray-900">{pack.viewsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Actions */}
                  <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3">
                    {/* Copy Link Button */}
                    <button
                      onClick={() => handleCopyLink(pack.id)}
                      disabled={!isActionable}
                      className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        isActionable
                          ? 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm hover:shadow'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      aria-label={`Copy link for ${pack.title}`}
                    >
                      {copyMessage || 'Copy Link'}
                    </button>

                    <div className="flex gap-3">
                      {/* View Logs Button */}
                      <button
                        onClick={() => handleViewLogs(pack.id)}
                        className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-sm hover:shadow"
                        aria-label={`View activity logs for ${pack.title}`}
                      >
                        View Logs
                      </button>

                      {/* Revoke Button */}
                      <button
                        onClick={() => handleRevoke(pack.id)}
                        disabled={!isActionable || isRevoking}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          isActionable && !isRevoking
                            ? 'bg-gray-600 text-white hover:bg-red-600 focus:ring-gray-500 shadow-sm hover:shadow'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        aria-label={`Revoke ${pack.title}`}
                      >
                        {isRevoking ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Logs Modal */}
        {selectedPackId && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeLogsModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logs-modal-title"
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 id="logs-modal-title" className="text-2xl font-bold text-gray-900">
                  Activity Logs
                </h2>
                <button
                  onClick={closeLogsModal}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  aria-label="Close logs modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-12">
                    <div
                      className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
                      role="status"
                      aria-label="Loading logs"
                    />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-semibold text-lg">No activity yet</p>
                    <p className="text-sm text-gray-600 mt-2">
                      Activity will appear here when the pack is viewed or modified
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        {/* Event Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {log.kind === 'view' ? (
                            <div
                              className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
                              aria-hidden="true"
                            >
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path
                                  fillRule="evenodd"
                                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : log.kind === 'revoke' ? (
                            <div
                              className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"
                              aria-hidden="true"
                            >
                              <svg
                                className="w-5 h-5 text-red-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div
                              className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"
                              aria-hidden="true"
                            >
                              <svg
                                className="w-5 h-5 text-gray-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">{log.kind}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(log.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {log.ipHash && (
                              <span className="text-xs font-mono text-gray-600 bg-gray-200 px-2.5 py-1 rounded-md">
                                IP: ...{log.ipHash.slice(-6)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={closeLogsModal}
                  className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 shadow-sm hover:shadow"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
