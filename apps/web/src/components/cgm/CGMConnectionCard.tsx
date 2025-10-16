'use client'

import { useState } from 'react'
import CGMStatusIndicator from './CGMStatusIndicator'
import { Activity, Check, AlertCircle, RefreshCw, Unplug } from 'lucide-react'

/**
 * CGMConnectionCard Component
 *
 * Displays CGM connection status and actions
 * Two states:
 * 1. Disconnected: Show connection benefits + Connect button
 * 2. Connected: Show device info, stats, and actions (Sync, Disconnect)
 */

interface CGMConnectionCardProps {
  connected: boolean
  provider?: 'dexcom' | 'libre'
  deviceModel?: string
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  totalReadings?: number
  daysOfData?: number
  syncing?: boolean
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
  className?: string
}

export default function CGMConnectionCard({
  connected,
  provider,
  deviceModel,
  lastSyncAt,
  lastSyncStatus,
  totalReadings = 0,
  daysOfData = 0,
  syncing = false,
  onConnect,
  onSync,
  onDisconnect,
  className = '',
}: CGMConnectionCardProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

  // Format last sync time
  const formatSyncTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const handleDisconnect = () => {
    setShowDisconnectConfirm(false)
    onDisconnect()
  }

  // Disconnected State
  if (!connected) {
    return (
      <div className={`bg-white rounded-2xl shadow-md p-6 border border-gray-200 ${className}`}>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Activity className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Connect Dexcom CGM</h2>
            <CGMStatusIndicator status="disconnected" />
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Automatically sync glucose data from your Dexcom device for real-time tracking and
          insights.
        </p>

        {/* Benefits List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Real-time glucose readings every 5 minutes</p>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Historical data import (up to 7 days)</p>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">No manual entry required</p>
          </div>
        </div>

        {/* Connect Button */}
        <button
          onClick={onConnect}
          className="w-full rounded-lg bg-blue-600 text-white font-semibold px-4 py-3 hover:bg-blue-700 transition-all shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Connect Dexcom
        </button>

        {/* Medical Disclaimer */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm mb-1">
                CGM Data is for Informational Use Only
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Glucose readings from your CGM are educational tools and should not be used for
                insulin dosing, diagnosis, or treatment decisions. Always consult your healthcare
                provider before making medical decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Connected State
  return (
    <div className={`bg-white rounded-2xl shadow-md p-6 border border-gray-200 ${className}`}>
      {/* Header with Status */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Activity className="w-7 h-7 text-green-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {provider === 'dexcom' ? 'Dexcom' : 'FreeStyle Libre'} CGM
          </h2>
          <CGMStatusIndicator
            status={
              syncing ? 'syncing' : lastSyncStatus === 'error' ? 'error' : 'connected'
            }
          />
        </div>
      </div>

      {/* Device Info */}
      {deviceModel && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Device Model
          </p>
          <p className="text-sm font-semibold text-gray-900">{deviceModel}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
            Total Readings
          </p>
          <p className="text-2xl font-bold text-blue-900">
            {totalReadings.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-1">
            Days of Data
          </p>
          <p className="text-2xl font-bold text-purple-900">{daysOfData}</p>
        </div>
      </div>

      {/* Last Sync Info */}
      {lastSyncAt && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Last Sync
          </p>
          <p className="text-sm font-semibold text-gray-900">{formatSyncTime(lastSyncAt)}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 text-gray-700 font-semibold px-4 py-2.5 hover:bg-gray-200 transition-all focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <button
          onClick={() => setShowDisconnectConfirm(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2.5 hover:bg-gray-50 hover:text-red-600 hover:border-red-300 transition-all focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <Unplug className="w-4 h-4" />
          Disconnect
        </button>
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Disconnect CGM?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your existing glucose data will remain, but new readings will no longer sync
              automatically. You can reconnect anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 rounded-lg bg-gray-100 text-gray-700 font-semibold px-4 py-2.5 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 rounded-lg bg-red-600 text-white font-semibold px-4 py-2.5 hover:bg-red-700 transition-all shadow-md"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
