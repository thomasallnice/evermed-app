'use client'

import { CheckCircle, XCircle, Clock } from 'lucide-react'

/**
 * SyncHistoryList Component
 *
 * Displays list of recent CGM syncs with timestamps and status
 * - Shows success/error status for each sync
 * - Number of readings imported per sync
 * - Formatted timestamps
 */

interface SyncHistory {
  id: string
  timestamp: string
  status: 'success' | 'error'
  readingsImported: number
  error?: string
}

interface SyncHistoryListProps {
  syncHistory: SyncHistory[]
  className?: string
}

export default function SyncHistoryList({ syncHistory, className = '' }: SyncHistoryListProps) {
  if (syncHistory.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600">No sync history yet</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Syncs</h3>
      {syncHistory.map((sync) => {
        const syncDate = new Date(sync.timestamp)
        const now = new Date()
        const diffMs = now.getTime() - syncDate.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        let timeAgo = ''
        if (diffMins < 1) {
          timeAgo = 'Just now'
        } else if (diffMins < 60) {
          timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
        } else if (diffHours < 24) {
          timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
        } else {
          timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
        }

        return (
          <div
            key={sync.id}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            {sync.status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-900">
                  {sync.status === 'success' ? 'Sync Successful' : 'Sync Failed'}
                </p>
                <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo}</span>
              </div>
              {sync.status === 'success' ? (
                <p className="text-xs text-gray-600">
                  {sync.readingsImported} reading{sync.readingsImported !== 1 ? 's' : ''} imported
                </p>
              ) : (
                <p className="text-xs text-red-600">{sync.error || 'Unknown error occurred'}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
