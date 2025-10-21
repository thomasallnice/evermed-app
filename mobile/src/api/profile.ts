// Profile API client
// Handles fetching and updating user health profile data

import { supabase } from './supabase'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://app.getcarbly.app'

export interface HealthProfile {
  givenName?: string
  familyName?: string
  birthYear?: number
  sexAtBirth?: string
  age?: number
  heightCm?: number
  weightKg?: number
  bmi?: number
  diet?: string[]
  behaviors?: string[]
  allergies?: string[]
}

/**
 * Fetch user's health profile
 */
export async function getHealthProfile(): Promise<HealthProfile> {
  // Refresh session to get fresh token
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to fetch profile: ${response.status}`)
  }

  const data = await response.json()
  return data.profile
}

/**
 * Update user's health profile
 */
export async function updateHealthProfile(profile: Partial<HealthProfile>): Promise<HealthProfile> {
  // Refresh session to get fresh token
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  console.log('[ProfileAPI] Updating profile with:', JSON.stringify(profile, null, 2))
  console.log('[ProfileAPI] API URL:', API_BASE_URL)
  console.log('[ProfileAPI] Has token:', !!session.access_token)

  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  })

  console.log('[ProfileAPI] Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[ProfileAPI] Error response:', errorText)

    let error
    try {
      error = JSON.parse(errorText)
    } catch (e) {
      error = { error: errorText }
    }

    throw new Error(error.error || `Failed to update profile: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('[ProfileAPI] Success:', JSON.stringify(data, null, 2))
  return data.profile
}
