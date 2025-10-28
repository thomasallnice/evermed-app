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
 * Saves directly to Supabase Person table
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
  console.log('[ProfileAPI] User ID:', session.user.id)

  // Prepare the data for Supabase Person table
  const personData = {
    ownerId: session.user.id,
    givenName: profile.givenName,
    familyName: profile.familyName,
    birthYear: profile.birthYear,
    sexAtBirth: profile.sexAtBirth,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    diet: profile.diet,
    behaviors: profile.behaviors,
    allergies: profile.allergies,
  }

  // Try to update first (in case record exists)
  const { data: updateData, error: updateError } = await supabase
    .from('Person')
    .update(personData)
    .eq('ownerId', session.user.id)
    .select()
    .single()

  // If update didn't find a record, create a new one
  if (updateError && updateError.code === 'PGRST116') {
    console.log('[ProfileAPI] No existing record, creating new Person record')

    const { data: insertData, error: insertError } = await supabase
      .from('Person')
      .insert(personData)
      .select()
      .single()

    if (insertError) {
      console.error('[ProfileAPI] Failed to create Person:', insertError)
      throw new Error(`Failed to create profile: ${insertError.message}`)
    }

    console.log('[ProfileAPI] Successfully created Person record')
    return insertData
  }

  if (updateError) {
    console.error('[ProfileAPI] Failed to update Person:', updateError)
    throw new Error(`Failed to update profile: ${updateError.message}`)
  }

  console.log('[ProfileAPI] Successfully updated Person record')
  return updateData
}
