'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'
import { getSupabase } from '@/lib/supabase/client'
import GlucoseKeypad from '@/components/glucose/GlucoseKeypad'

// Glucose range thresholds (mg/dL)
const GLUCOSE_MIN = 20
const GLUCOSE_MAX = 600
const GLUCOSE_LOW = 70
const GLUCOSE_NORMAL_MAX = 140
const GLUCOSE_HIGH = 180

/**
 * Get color class based on glucose value
 * Red: <70 or >180
 * Green: 70-140
 * Amber: 140-180
 */
function getGlucoseColor(value: number): string {
  if (value < GLUCOSE_LOW) return 'text-red-600'
  if (value <= GLUCOSE_NORMAL_MAX) return 'text-green-600'
  if (value <= GLUCOSE_HIGH) return 'text-amber-600'
  return 'text-red-600'
}

function getGlucoseBackgroundColor(value: number): string {
  if (value < GLUCOSE_LOW) return 'bg-red-50'
  if (value <= GLUCOSE_NORMAL_MAX) return 'bg-green-50'
  if (value <= GLUCOSE_HIGH) return 'bg-amber-50'
  return 'bg-red-50'
}

export default function GlucoseEntryPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [source, setSource] = useState<'fingerstick' | 'cgm' | 'lab'>('fingerstick')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')

  // Validate glucose value and show warnings
  useEffect(() => {
    if (!value) {
      setShowWarning(false)
      return
    }

    const numValue = parseInt(value, 10)

    if (numValue < GLUCOSE_MIN) {
      setShowWarning(true)
      setWarningMessage(`Value too low. Minimum: ${GLUCOSE_MIN} mg/dL`)
    } else if (numValue > GLUCOSE_MAX) {
      setShowWarning(true)
      setWarningMessage(`Value too high. Maximum: ${GLUCOSE_MAX} mg/dL`)
    } else if (numValue < GLUCOSE_LOW) {
      setShowWarning(true)
      setWarningMessage('Low glucose detected. Seek medical attention if experiencing symptoms.')
    } else if (numValue > GLUCOSE_HIGH) {
      setShowWarning(true)
      setWarningMessage('High glucose detected. Consider consulting your healthcare provider.')
    } else {
      setShowWarning(false)
    }
  }, [value])

  // Check if save is allowed
  const numValue = value ? parseInt(value, 10) : 0
  const isSaveDisabled = !value || numValue < GLUCOSE_MIN || numValue > GLUCOSE_MAX || loading

  async function handleSave() {
    if (isSaveDisabled) return

    setLoading(true)
    setError(null)

    try {
      // Authenticate
      const supabase = getSupabase()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Create glucose reading
      const response = await apiFetch('/api/metabolic/glucose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: numValue,
          source,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save glucose reading')
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Failed to save glucose reading:', err)
      setError(err.message || 'Failed to save glucose reading')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-lg py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label="Back to dashboard"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add Glucose Reading</h1>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="font-semibold text-red-700">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Large Display Area */}
        <div
          className={`rounded-2xl shadow-md p-8 text-center transition-colors ${
            value ? getGlucoseBackgroundColor(numValue) : 'bg-white'
          }`}
        >
          <div
            className={`text-7xl font-bold font-mono mb-2 transition-colors ${
              value ? getGlucoseColor(numValue) : 'text-gray-400'
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {value || '---'}
          </div>
          <div className="text-xl font-semibold text-gray-600">mg/dL</div>

          {/* Warning Message */}
          {showWarning && (
            <div className="mt-4 text-sm font-medium text-gray-700 bg-white/50 rounded-lg p-3 border border-gray-300">
              {warningMessage}
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <GlucoseKeypad
            value={value}
            onValueChange={setValue}
            disabled={loading}
          />
        </div>

        {/* Source Selection */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Source
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSource('fingerstick')}
              disabled={loading}
              className={`
                px-4 py-2 rounded-full text-sm font-medium border-2 transition-all
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
                ${
                  source === 'fingerstick'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Fingerstick
            </button>
            <button
              type="button"
              onClick={() => setSource('cgm')}
              disabled={loading}
              className={`
                px-4 py-2 rounded-full text-sm font-medium border-2 transition-all
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
                ${
                  source === 'cgm'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              CGM
            </button>
            <button
              type="button"
              onClick={() => setSource('lab')}
              disabled={loading}
              className={`
                px-4 py-2 rounded-full text-sm font-medium border-2 transition-all
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
                ${
                  source === 'lab'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              Lab Result
            </button>
          </div>
        </div>

        {/* Timestamp Display */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="text-sm font-semibold text-gray-700 mb-1">Timestamp</div>
          <div className="text-gray-900">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            at{' '}
            {new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-800">
            Manual glucose readings are for tracking purposes only. For medical decisions, always consult
            your healthcare provider. If experiencing symptoms of extreme high or low blood sugar, seek
            immediate medical attention.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 rounded-xl bg-white text-gray-700 font-semibold px-6 py-4 min-h-[56px] hover:bg-gray-50 transition-colors border-2 border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="flex-1 rounded-xl bg-blue-600 text-white font-semibold px-6 py-4 min-h-[56px] hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
