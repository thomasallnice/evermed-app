// Nutritionix API Client
// Searches nutrition database for food data

import { supabase, API_URL } from './supabase'

const API_BASE_URL = API_URL

export interface NutritionixSearchResult {
  name: string
  brandName?: string
  servingQty: number
  servingUnit: string
  calories: number
  totalCarbs: number
  protein: number
  totalFat: number
  dietaryFiber: number
}

/**
 * Search Nutritionix database for foods
 * Proxied through backend to protect API keys
 */
export async function searchNutritionix(query: string): Promise<NutritionixSearchResult[]> {
  if (!query.trim()) {
    return []
  }

  // Get valid session
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  // Call backend proxy endpoint
  const response = await fetch(`${API_BASE_URL}/api/metabolic/nutritionix/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[NUTRITIONIX SEARCH] Failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    })

    let errorMessage = `Search failed: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data.results || []
}

/**
 * Get detailed nutrition info for a specific food item
 */
export async function getNutritionDetails(foodName: string): Promise<NutritionixSearchResult | null> {
  if (!foodName.trim()) {
    return null
  }

  // Get valid session
  const {
    data: { session },
    error: refreshError,
  } = await supabase.auth.refreshSession()

  if (refreshError || !session) {
    throw new Error('Session expired. Please sign in again.')
  }

  // Call backend proxy endpoint
  const response = await fetch(`${API_BASE_URL}/api/metabolic/nutritionix/details`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ foodName }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[NUTRITIONIX DETAILS] Failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    })

    let errorMessage = `Failed to get details: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  return data.result || null
}
