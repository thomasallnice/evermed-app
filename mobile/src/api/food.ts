// Food API Client
// Handles food photo uploads and meal entry management

import { supabase, API_URL } from './supabase'

const API_BASE_URL = API_URL

export interface FoodEntry {
  id: string
  timestamp: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrls: string[]
  analysisStatus: 'pending' | 'completed' | 'failed'
  totalCalories: number
  totalCarbsG: number
  totalProteinG: number
  totalFatG: number
  totalFiberG: number
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
    calories: number
    carbsG: number
    proteinG: number
    fatG: number
    fiberG: number
  }>
}

/**
 * Upload food photos and create food entry
 * Supports 1-5 photos per meal (multi-dish)
 */
export async function uploadFoodPhotos(
  photoUris: string[],
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<FoodEntry> {
  // Refresh session to get fresh token
  console.log('[FOOD UPLOAD] Refreshing session...')
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    console.error('[FOOD UPLOAD] Session refresh failed:', refreshError)
    throw new Error('Session expired. Please sign out and sign in again.')
  }

  console.log('[FOOD UPLOAD] Session refreshed successfully')
  console.log('[FOOD UPLOAD] Token expires at:', new Date(session.expires_at! * 1000).toISOString())

  // Create FormData
  const formData = new FormData()

  // Add photos to FormData
  for (let i = 0; i < photoUris.length; i++) {
    const photoUri = photoUris[i]
    const filename = `food-${Date.now()}-${i + 1}.jpg`

    // React Native FormData accepts uri, type, and name
    formData.append(`photo${i + 1}`, {
      uri: photoUri,
      type: 'image/jpeg',
      name: filename,
    } as any)
  }

  // Add meal metadata
  formData.append('mealType', mealType)
  formData.append('eatenAt', new Date().toISOString())

  // Upload to backend API
  const response = await fetch(`${API_BASE_URL}/api/metabolic/food`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    // Enhanced error logging for diagnostics
    const errorText = await response.text()
    console.error('[FOOD UPLOAD] Upload failed:', {
      status: response.status,
      statusText: response.statusText,
      url: `${API_BASE_URL}/api/metabolic/food`,
      body: errorText,
    })

    // Try to parse as JSON
    let errorMessage = `Upload failed: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage

      // Log specific error details
      if (response.status === 404) {
        console.error('[FOOD UPLOAD] 404 Error - Possible causes:')
        console.error('  1. Person record missing for user')
        console.error('  2. API endpoint not found')
        console.error('  3. Network connectivity issue')
      } else if (response.status === 401) {
        console.error('[FOOD UPLOAD] 401 Error - Authentication failed')
        console.error('  Session might be expired or invalid')
      } else if (response.status === 500) {
        console.error('[FOOD UPLOAD] 500 Error - Server error')
        console.error('  Check backend logs for details')
      }
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data
}

/**
 * Get list of food entries
 * Optional filters: mealType, startDate, endDate
 */
export async function getFoodEntries(params?: {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<{ entries: FoodEntry[]; total: number }> {
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
  if (params?.mealType) queryParams.append('mealType', params.mealType)
  if (params?.startDate) queryParams.append('startDate', params.startDate)
  if (params?.endDate) queryParams.append('endDate', params.endDate)
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const url = `${API_BASE_URL}/api/metabolic/food?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch food entries: ${response.status}`)
  }

  return response.json()
}

/**
 * Get single food entry by ID
 */
export async function getFoodEntry(id: string): Promise<FoodEntry> {
  // Refresh session to get fresh token
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  const response = await fetch(`${API_BASE_URL}/api/metabolic/food/${id}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch food entry: ${response.status}`)
  }

  return response.json()
}

/**
 * Delete food entry
 */
export async function deleteFoodEntry(id: string): Promise<void> {
  // Refresh session to get fresh token
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  const response = await fetch(`${API_BASE_URL}/api/metabolic/food/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete food entry: ${response.status}`)
  }
}
