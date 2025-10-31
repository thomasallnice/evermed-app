// Timeline API Client
// Fetches combined glucose and meal data for correlation analysis

import { supabase, API_URL } from './supabase'

const API_BASE_URL = API_URL

export interface GlucosePoint {
  timestamp: string // ISO 8601
  value: number // mg/dL
}

export interface MealEntry {
  id: string
  timestamp: string // ISO 8601
  type: string // breakfast, lunch, dinner, snack
  name: string
  photoUrl?: string | null
  photoUrls?: string[]
  analysisStatus: 'pending' | 'completed' | 'failed'
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber: number
  notes?: string | null
  ingredients: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    calories: number
    carbs: number
    protein: number
    fat: number
    fiber: number
  }>
}

export interface TimelineData {
  glucose: GlucosePoint[]
  meals: MealEntry[]
  disclaimer: string
}

export interface GlucoseSpike {
  mealId: string
  mealTimestamp: string
  peakValue: number
  peakTimestamp: string
  increase: number // mg/dL increase from pre-meal baseline
  timeToP: number // minutes to peak
}

export interface DailySummary {
  date: string
  avgGlucose: number
  minGlucose: number
  maxGlucose: number
  timeInRange: number // percentage (70-180 mg/dL)
  totalReadings: number
  totalMeals: number
  spikes: GlucoseSpike[]
  bestMeals: MealEntry[] // Meals with stable glucose response
  worstMeals: MealEntry[] // Meals with high glucose spikes
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
 * Fetch daily timeline data (glucose + meals)
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getDailyTimeline(date: string): Promise<TimelineData> {
  const session = await getValidSession()

  const url = `${API_BASE_URL}/api/analytics/timeline/daily?date=${date}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TIMELINE] Failed:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to fetch timeline data: ${response.status}`
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
 * Detect glucose spikes related to meals
 * A spike is defined as >30 mg/dL increase within 2 hours after a meal
 */
export function detectGlucoseSpikes(
  glucose: GlucosePoint[],
  meals: MealEntry[]
): GlucoseSpike[] {
  const spikes: GlucoseSpike[] = []

  for (const meal of meals) {
    const mealTime = new Date(meal.timestamp).getTime()

    // Find pre-meal baseline (30 min before meal)
    const preMealWindow = glucose.filter((g) => {
      const gTime = new Date(g.timestamp).getTime()
      return gTime >= mealTime - 30 * 60 * 1000 && gTime < mealTime
    })

    // Find post-meal readings (up to 2 hours after meal)
    const postMealWindow = glucose.filter((g) => {
      const gTime = new Date(g.timestamp).getTime()
      return gTime >= mealTime && gTime <= mealTime + 2 * 60 * 60 * 1000
    })

    if (preMealWindow.length === 0 || postMealWindow.length === 0) {
      continue // Skip if no data
    }

    // Calculate baseline (average of pre-meal readings)
    const baseline =
      preMealWindow.reduce((sum, g) => sum + g.value, 0) / preMealWindow.length

    // Find peak in post-meal window
    const peak = postMealWindow.reduce((max, g) =>
      g.value > max.value ? g : max
    )

    const increase = peak.value - baseline
    const timeToP =
      (new Date(peak.timestamp).getTime() - mealTime) / (60 * 1000)

    // Only count as spike if increase > 30 mg/dL
    if (increase > 30) {
      spikes.push({
        mealId: meal.id,
        mealTimestamp: meal.timestamp,
        peakValue: peak.value,
        peakTimestamp: peak.timestamp,
        increase: Math.round(increase),
        timeToP: Math.round(timeToP),
      })
    }
  }

  return spikes
}

/**
 * Calculate daily summary with metrics and insights
 */
export function calculateDailySummary(
  date: string,
  glucose: GlucosePoint[],
  meals: MealEntry[]
): DailySummary {
  if (glucose.length === 0) {
    return {
      date,
      avgGlucose: 0,
      minGlucose: 0,
      maxGlucose: 0,
      timeInRange: 0,
      totalReadings: 0,
      totalMeals: meals.length,
      spikes: [],
      bestMeals: [],
      worstMeals: [],
    }
  }

  // Calculate glucose statistics
  const values = glucose.map((g) => g.value)
  const avgGlucose = values.reduce((sum, v) => sum + v, 0) / values.length
  const minGlucose = Math.min(...values)
  const maxGlucose = Math.max(...values)

  // Time in range (70-180 mg/dL)
  const inRangeCount = values.filter((v) => v >= 70 && v <= 180).length
  const timeInRange = (inRangeCount / values.length) * 100

  // Detect spikes
  const spikes = detectGlucoseSpikes(glucose, meals)

  // Create a map of meal IDs to spike data
  const mealSpikeMap = new Map<string, GlucoseSpike>()
  spikes.forEach((spike) => {
    mealSpikeMap.set(spike.mealId, spike)
  })

  // Identify best meals (no spike or low increase)
  const bestMeals = meals
    .filter((meal) => {
      const spike = mealSpikeMap.get(meal.id)
      return !spike || spike.increase < 40
    })
    .slice(0, 3) // Top 3

  // Identify worst meals (high spikes)
  const worstMeals = meals
    .filter((meal) => {
      const spike = mealSpikeMap.get(meal.id)
      return spike && spike.increase >= 50
    })
    .sort((a, b) => {
      const spikeA = mealSpikeMap.get(a.id)!
      const spikeB = mealSpikeMap.get(b.id)!
      return spikeB.increase - spikeA.increase
    })
    .slice(0, 3) // Top 3

  return {
    date,
    avgGlucose: Math.round(avgGlucose),
    minGlucose: Math.round(minGlucose),
    maxGlucose: Math.round(maxGlucose),
    timeInRange: Math.round(timeInRange),
    totalReadings: glucose.length,
    totalMeals: meals.length,
    spikes,
    bestMeals,
    worstMeals,
  }
}
