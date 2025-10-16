'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/api-client'
import CGMConnectionCard from '@/components/cgm/CGMConnectionCard'
import SyncHistoryList from '@/components/cgm/SyncHistoryList'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, CheckCircle } from 'lucide-react'

/**
 * CGM Settings Page
 *
 * Features:
 * - Connect/disconnect Dexcom CGM
 * - View connection status and device info
 * - Manual sync trigger
 * - Sync history
 * - OAuth callback handling
 * - Medical disclaimers
 */

interface CGMStatus {
  connected: boolean
  provider?: 'dexcom' | 'libre'
  deviceModel?: string
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  totalReadings?: number
  daysOfData?: number
  error?: string
}

interface SyncHistory {
  id: string
  timestamp: string
  status: 'success' | 'error'
  readingsImported: number
  error?: string
}

export default function CGMSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cgmStatus, setCgmStatus] = useState<CGMStatus>({ connected: false })
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([])
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  useEffect(() => {
    checkAuthAndLoadData()

    // Check for OAuth success callback
    if (searchParams.get('success') === 'true') {
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 5000)
      // Clean up URL
      window.history.replaceState({}, '', '/settings/cgm')
    }
  }, [searchParams])

  async function checkAuthAndLoadData() {
    setLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Fetch CGM connection status
      const statusRes = await apiFetch('/api/metabolic/cgm/dexcom/status')

      if (!statusRes.ok) {
        throw new Error('Failed to fetch CGM status')
      }

      const statusData = await statusRes.json()
      setCgmStatus(statusData)

      // If connected, generate mock sync history (replace with real API when available)
      if (statusData.connected && statusData.lastSyncAt) {
        const mockHistory: SyncHistory[] = [
          {
            id: '1',
            timestamp: statusData.lastSyncAt,
            status: statusData.lastSyncStatus || 'success',
            readingsImported: Math.floor(Math.random() * 100) + 50,
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            status: 'success',
            readingsImported: Math.floor(Math.random() * 100) + 50,
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            status: 'success',
            readingsImported: Math.floor(Math.random() * 100) + 50,
          },
        ]
        setSyncHistory(mockHistory)
      }
    } catch (err: any) {
      console.error('CGM settings load error:', err)
      setError(err.message || 'Failed to load CGM settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    try {
      setError(null)
      const res = await apiFetch('/api/metabolic/cgm/dexcom/connect', {
        method: 'POST',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to initiate connection')
      }

      const data = await res.json()

      // Redirect to Dexcom OAuth page
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err: any) {
      console.error('CGM connect error:', err)
      setError(err.message || 'Failed to connect to CGM')
    }
  }

  async function handleSync() {
    try {
      setSyncing(true)
      setError(null)

      const res = await apiFetch('/api/metabolic/cgm/dexcom/sync', {
        method: 'POST',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      const data = await res.json()

      // Add new sync to history
      const newSync: SyncHistory = {
        id: Date.now().toString(),
        timestamp: data.syncedAt || new Date().toISOString(),
        status: data.success ? 'success' : 'error',
        readingsImported: data.readingsImported || 0,
        error: data.error,
      }
      setSyncHistory([newSync, ...syncHistory])

      // Refresh status
      await checkAuthAndLoadData()

      // Show success toast
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 5000)
    } catch (err: any) {
      console.error('CGM sync error:', err)
      setError(err.message || 'Failed to sync CGM data')
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    try {
      setError(null)

      const res = await apiFetch('/api/metabolic/cgm/dexcom/disconnect', {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to disconnect')
      }

      // Reset state
      setCgmStatus({ connected: false })
      setSyncHistory([])
    } catch (err: any) {
      console.error('CGM disconnect error:', err)
      setError(err.message || 'Failed to disconnect CGM')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">⚙️</div>
          <p className="text-gray-600 font-medium">Loading CGM settings...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CGM Settings</h1>
              <p className="text-sm text-gray-600">Manage your continuous glucose monitor</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* CGM Status Error from API */}
        {cgmStatus.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <p className="font-semibold">Connection Error</p>
            <p className="text-sm">{cgmStatus.error}</p>
          </div>
        )}

        {/* CGM Connection Card */}
        <CGMConnectionCard
          connected={cgmStatus.connected}
          provider={cgmStatus.provider}
          deviceModel={cgmStatus.deviceModel}
          lastSyncAt={cgmStatus.lastSyncAt}
          lastSyncStatus={cgmStatus.lastSyncStatus}
          totalReadings={cgmStatus.totalReadings}
          daysOfData={cgmStatus.daysOfData}
          syncing={syncing}
          onConnect={handleConnect}
          onSync={handleSync}
          onDisconnect={handleDisconnect}
        />

        {/* Sync History (only show when connected) */}
        {cgmStatus.connected && syncHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <SyncHistoryList syncHistory={syncHistory} />
          </div>
        )}

        {/* Setup Instructions (only show when disconnected) */}
        {!cgmStatus.connected && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Connect</h3>
            <ol className="space-y-3 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                  1
                </span>
                <span>
                  Click "Connect Dexcom" above to open the Dexcom authorization page
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                  2
                </span>
                <span>Log in with your Dexcom account credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                  3
                </span>
                <span>
                  Grant GlucoLens permission to read your glucose data
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                  4
                </span>
                <span>You'll be redirected back to this page when complete</span>
              </li>
            </ol>
          </div>
        )}

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-900 mb-2 text-sm">Medical Disclaimer</h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            GlucoLens provides educational insights only and is not a substitute for professional
            medical advice, diagnosis, or treatment. CGM data should not be used for insulin
            dosing, diagnosis, or treatment decisions. Always consult your healthcare provider.
          </p>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div
          className="fixed top-4 right-4 z-50 bg-green-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3 animate-slide-in-right max-w-md"
          role="alert"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {cgmStatus.connected ? 'CGM Connected!' : 'Sync Complete!'}
            </p>
            <p className="text-sm text-green-100">
              {cgmStatus.connected
                ? 'Your glucose data is now syncing automatically'
                : 'New readings imported successfully'}
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
