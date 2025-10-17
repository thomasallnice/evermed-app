'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Check, ExternalLink, Smartphone } from 'lucide-react'

/**
 * Health Connections Settings Page
 *
 * Unified page for connecting all health data sources:
 * - Dexcom CGM (Web - OAuth)
 * - FreeStyle Libre (Web - OAuth) [Future]
 * - Apple Health (iOS native app only)
 * - Google Health Connect (Android native app only)
 */

interface Platform {
  isIOS: boolean
  isAndroid: boolean
  isWeb: boolean
}

interface ConnectionOption {
  id: string
  name: string
  description: string
  icon: string
  available: boolean
  connected: boolean
  platform: 'web' | 'ios' | 'android' | 'all'
  comingSoon?: boolean
  action?: () => void
}

function HealthConnectionsContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<Platform>({ isIOS: false, isAndroid: false, isWeb: true })
  const [connections, setConnections] = useState<ConnectionOption[]>([])

  useEffect(() => {
    detectPlatform()
    checkAuthAndLoadData()
  }, [])

  function detectPlatform() {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
    const isAndroid = /android/i.test(userAgent)
    const isWeb = !isIOS && !isAndroid

    setPlatform({ isIOS, isAndroid, isWeb })
  }

  async function checkAuthAndLoadData() {
    setLoading(true)

    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check Dexcom connection status
      const dexcomRes = await fetch('/api/metabolic/cgm/dexcom/status', {
        headers: { 'x-user-id': user.id },
      })
      const dexcomData = dexcomRes.ok ? await dexcomRes.json() : { connected: false }

      // Build connections list based on platform
      const connectionOptions: ConnectionOption[] = [
        // CGM Devices (Web OAuth)
        {
          id: 'dexcom',
          name: 'Dexcom CGM',
          description: 'Continuous glucose monitoring from Dexcom devices',
          icon: '📊',
          available: platform.isWeb,
          connected: dexcomData.connected,
          platform: 'web',
          action: () => router.push('/settings/cgm'),
        },
        {
          id: 'libre',
          name: 'FreeStyle Libre',
          description: 'Continuous glucose monitoring from Abbott devices',
          icon: '💉',
          available: platform.isWeb,
          connected: false,
          platform: 'web',
          comingSoon: true,
        },

        // Mobile Platform Integrations
        {
          id: 'apple-health',
          name: 'Apple Health',
          description: 'Sync glucose and nutrition data from Apple Health',
          icon: '🍎',
          available: platform.isIOS,
          connected: false,
          platform: 'ios',
          comingSoon: true,
        },
        {
          id: 'google-health',
          name: 'Google Health Connect',
          description: 'Sync glucose and nutrition data from Health Connect',
          icon: '🤖',
          available: platform.isAndroid,
          connected: false,
          platform: 'android',
          comingSoon: true,
        },
      ]

      setConnections(connectionOptions)
    } catch (err) {
      console.error('Failed to load connections:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🔗</div>
          <p className="text-gray-600 font-medium">Loading health connections...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const availableConnections = connections.filter(c => c.available)
  const unavailableConnections = connections.filter(c => !c.available)

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
              <h1 className="text-2xl font-bold text-gray-900">Health Connections</h1>
              <p className="text-sm text-gray-600">Connect your health data sources</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Platform Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">
              {platform.isIOS && 'Running on iOS'}
              {platform.isAndroid && 'Running on Android'}
              {platform.isWeb && 'Running on Web Browser'}
            </p>
            <p>
              {platform.isWeb && 'Web-based connections (Dexcom, FreeStyle Libre) are available. For Apple Health or Google Health Connect, download our mobile app.'}
              {platform.isIOS && 'Apple Health integration available in our iOS app. Web connections like Dexcom are also available.'}
              {platform.isAndroid && 'Google Health Connect integration available in our Android app. Web connections like Dexcom are also available.'}
            </p>
          </div>
        </div>

        {/* Available Connections */}
        {availableConnections.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Available Connections</h2>
            {availableConnections.map((connection) => (
              <div
                key={connection.id}
                className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4"
              >
                <div className="text-4xl flex-shrink-0">{connection.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{connection.name}</h3>
                    {connection.connected && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Connected
                      </span>
                    )}
                    {connection.comingSoon && (
                      <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{connection.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {connection.action && !connection.comingSoon && (
                    <button
                      onClick={connection.action}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        connection.connected
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      }`}
                    >
                      {connection.connected ? 'Manage' : 'Connect'}
                    </button>
                  )}
                  {connection.comingSoon && (
                    <span className="text-xs text-gray-500 font-medium">Coming Soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unavailable Connections (Other Platforms) */}
        {unavailableConnections.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Other Platforms</h2>
            <p className="text-sm text-gray-600">
              These connections require our mobile app on their respective platforms.
            </p>
            {unavailableConnections.map((connection) => (
              <div
                key={connection.id}
                className="bg-gray-100 rounded-2xl p-5 flex items-center gap-4 opacity-60"
              >
                <div className="text-4xl flex-shrink-0">{connection.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-700">{connection.name}</h3>
                    <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                      {connection.platform === 'ios' && 'iOS App Required'}
                      {connection.platform === 'android' && 'Android App Required'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{connection.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile App CTA */}
        {platform.isWeb && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Want Apple Health or Google Health Connect?</h3>
            <p className="text-sm text-gray-700 mb-4">
              Download our mobile app to sync glucose data from Apple Health (iOS) or Google Health Connect (Android).
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                <span>📱</span>
                iOS App (Coming Soon)
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                <span>🤖</span>
                Android App (Coming Soon)
              </a>
            </div>
          </div>
        )}

        {/* Manual Entry Option */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-center gap-4">
            <div className="text-4xl">✏️</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Manual Glucose Entry</h3>
              <p className="text-sm text-gray-600">
                Don't have a CGM? You can always enter glucose readings manually.
              </p>
            </div>
            <button
              onClick={() => router.push('/glucose/entry')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              Add Reading
            </button>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-900 mb-2 text-sm">Medical Disclaimer</h3>
          <p className="text-xs text-amber-800 leading-relaxed">
            Carbly provides educational insights only and is not a substitute for professional
            medical advice, diagnosis, or treatment. Glucose data should not be used for insulin
            dosing, diagnosis, or treatment decisions. Always consult your healthcare provider.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// Wrap in Suspense for server-side rendering
export default function HealthConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🔗</div>
            <p className="text-gray-600 font-medium">Loading health connections...</p>
          </div>
        </div>
      }
    >
      <HealthConnectionsContent />
    </Suspense>
  )
}
