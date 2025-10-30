// Meal Templates API Client
// Handles meal template CRUD operations

import { supabase, API_URL } from './supabase'

const API_BASE_URL = API_URL

export interface Ingredient {
  name: string
  quantity: number
  unit: string
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
}

export interface NutritionTotals {
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
}

export interface MealTemplate {
  id: string
  name: string
  description: string | null
  ingredients: Ingredient[]
  nutritionTotals: NutritionTotals
  usageCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  ingredients: Ingredient[]
  nutritionTotals: NutritionTotals
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string | null
  ingredients?: Ingredient[]
  nutritionTotals?: NutritionTotals
  incrementUsage?: boolean
}

export interface CreateTemplateResponse {
  success: boolean
  template: MealTemplate
}

export interface GetTemplatesResponse {
  templates: MealTemplate[]
  total: number
}

export interface GetTemplateResponse {
  template: MealTemplate
}

export interface UpdateTemplateResponse {
  success: boolean
  template: MealTemplate
}

export interface DeleteTemplateResponse {
  success: boolean
  message: string
}

/**
 * Get or refresh a valid Supabase session
 * Retries up to 3 times if refresh fails
 */
async function getValidSession(retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession()

      if (!refreshError && session) {
        return session
      }

      console.warn(`[SESSION] Refresh attempt ${i + 1}/${retries} failed:`, refreshError)

      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    } catch (error) {
      console.error(`[SESSION] Refresh attempt ${i + 1}/${retries} threw error:`, error)
      if (i === retries - 1) {
        throw error
      }
    }
  }

  throw new Error('Session expired. Please sign out and sign in again.')
}

/**
 * Create a new meal template
 */
export async function createMealTemplate(
  request: CreateTemplateRequest
): Promise<CreateTemplateResponse> {
  // Get valid session with retry logic
  const session = await getValidSession()

  console.log('[TEMPLATE CREATE] Creating template:', request.name)

  // Send to backend API
  const response = await fetch(`${API_BASE_URL}/api/metabolic/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TEMPLATE CREATE] Failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    })

    let errorMessage = `Failed to create template: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  console.log('[TEMPLATE CREATE] Successfully created template:', data.template.id)
  return data
}

/**
 * Get list of meal templates
 * Optional filters: sortBy, limit
 */
export async function getMealTemplates(params?: {
  sortBy?: 'recent' | 'usage' | 'name'
  limit?: number
}): Promise<GetTemplatesResponse> {
  // Get valid session with retry logic
  const session = await getValidSession()

  // Build query params
  const queryParams = new URLSearchParams()
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const url = `${API_BASE_URL}/api/metabolic/templates?${queryParams.toString()}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TEMPLATE LIST] Failed:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to fetch templates: ${response.status}`
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

/**
 * Get a single meal template by ID
 */
export async function getMealTemplate(id: string): Promise<GetTemplateResponse> {
  // Get valid session with retry logic
  const session = await getValidSession()

  const url = `${API_BASE_URL}/api/metabolic/templates/${id}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TEMPLATE GET] Failed:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to fetch template: ${response.status}`
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

/**
 * Update a meal template
 */
export async function updateMealTemplate(
  id: string,
  updates: UpdateTemplateRequest
): Promise<UpdateTemplateResponse> {
  // Get valid session with retry logic
  const session = await getValidSession()

  console.log('[TEMPLATE UPDATE] Updating template:', id)

  const url = `${API_BASE_URL}/api/metabolic/templates/${id}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TEMPLATE UPDATE] Failed:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to update template: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  console.log('[TEMPLATE UPDATE] Successfully updated template:', data.template.id)
  return data
}

/**
 * Delete a meal template
 */
export async function deleteMealTemplate(id: string): Promise<DeleteTemplateResponse> {
  // Get valid session with retry logic
  const session = await getValidSession()

  console.log('[TEMPLATE DELETE] Deleting template:', id)

  const url = `${API_BASE_URL}/api/metabolic/templates/${id}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TEMPLATE DELETE] Failed:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to delete template: ${response.status}`
    try {
      const error = JSON.parse(errorText)
      errorMessage = error.error || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data = await response.json()
  console.log('[TEMPLATE DELETE] Successfully deleted template:', id)
  return data
}

/**
 * Increment usage count for a template
 * Convenience method that calls updateMealTemplate with incrementUsage flag
 */
export async function incrementTemplateUsage(id: string): Promise<UpdateTemplateResponse> {
  console.log('[TEMPLATE] Incrementing usage count for template:', id)
  return updateMealTemplate(id, { incrementUsage: true })
}
