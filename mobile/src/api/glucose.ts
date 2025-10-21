// Glucose API Client
// Handles manual glucose reading entry and retrieval

import { supabase, API_URL } from './supabase'

const API_BASE_URL = API_URL

export interface GlucoseReading {
  id: string
  value: number
  source: 'fingerstick' | 'cgm' | 'lab'
  timestamp: string
  createdAt: string
  deviceId?: string
}

export interface CreateGlucoseReadingResponse {
  success: boolean
  reading: GlucoseReading
  disclaimer: string
}

export interface GetGlucoseReadingsResponse {
  readings: GlucoseReading[]
  total: number
  disclaimer: string
}

/**
 * Create a manual glucose reading
 * Validates 20-600 mg/dL range
 */
export async function createGlucoseReading(
  value: number,
  source: 'fingerstick' | 'cgm' | 'lab',
  timestamp?: string
): Promise<CreateGlucoseReadingResponse> {
  // Refresh session to get fresh token
  console.log('[GLUCOSE CREATE] Refreshing session...')
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    console.error('[GLUCOSE CREATE] Session refresh failed:', refreshError)
    throw new Error('Session expired. Please sign out and sign in again.')
  }

  console.log('[GLUCOSE CREATE] Session refreshed successfully')
  console.log('[GLUCOSE CREATE] Token expires at:', new Date(session.expires_at! * 1000).toISOString())

  // Validate value range (20-600 mg/dL)
  if (value < 20 || value > 600) {
    throw new Error('Please enter a value between 20 and 600 mg/dL')
  }

  // Build request body
  const body: any = {
    value,
    source,
  }

  if (timestamp) {
    body.timestamp = timestamp
  }

  // Send to backend API
  const response = await fetch(`${API_BASE_URL}/api/metabolic/glucose`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    // Enhanced error logging for diagnostics
    const errorText = await response.text()
    console.error('[GLUCOSE CREATE] Failed:', {
      status: response.status,
      statusText: response.statusText,
      url: `${API_BASE_URL}/api/metabolic/glucose`,
      body: errorText,
      userId: session.user.id,
      tokenExpiry: new Date(session.expires_at! * 1000).toISOString(),
    })

    // Try to parse as JSON
    let errorMessage = `Failed to save glucose reading: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage

      // Log specific error details
      if (response.status === 404) {
        console.error('[GLUCOSE CREATE] 404 Error - Person record missing for user')
        console.error('  User ID:', session.user.id)
        console.error('  Need to create Person record via onboarding')
        errorMessage = 'Please complete your profile setup first'
      } else if (response.status === 401) {
        console.error('[GLUCOSE CREATE] 401 Error - Authentication failed')
        console.error('  User ID:', session.user.id)
        console.error('  Token expires:', new Date(session.expires_at! * 1000).toISOString())
        errorMessage = 'Please sign out and sign in again.'
      } else if (response.status === 400) {
        console.error('[GLUCOSE CREATE] 400 Error - Validation failed')
        console.error('  Details:', error.details)
        errorMessage = error.error || 'Invalid glucose value. Please enter a value between 20 and 600 mg/dL.'
      } else if (response.status === 500) {
        console.error('[GLUCOSE CREATE] 500 Error - Server error')
        console.error('  Check backend logs for details')
        errorMessage = 'Failed to save glucose reading. Please try again.'
      }
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  console.log('[GLUCOSE CREATE] Successfully created reading:', data.reading.id)
  return data
}

/**
 * Get list of glucose readings
 * Optional filters: source, startDate, endDate, limit
 */
export async function getGlucoseReadings(params?: {
  source?: 'fingerstick' | 'cgm' | 'lab'
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<GetGlucoseReadingsResponse> {
  // Refresh session to get fresh token
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  // Build query params
  const queryParams = new URLSearchParams()
  if (params?.source) queryParams.append('source', params.source)
  if (params?.startDate) queryParams.append('startDate', params.startDate)
  if (params?.endDate) queryParams.append('endDate', params.endDate)
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const url = `${API_BASE_URL}/api/metabolic/glucose?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[GLUCOSE LIST] Failed:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to fetch glucose readings: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  return response.json()
}
