// Insights API Client
// Fetches daily insights, weekly summaries, and gamification data

import { supabase, API_URL } from './supabase'

const API_BASE_URL = API_URL

// Daily Insights
export interface DailyInsight {
  id: string
  type: 'pattern' | 'warning' | 'tip'
  title: string
  description: string
}

export interface DailyInsightsResponse {
  insights: DailyInsight[]
  disclaimer: string
}

// Weekly Summary
export interface WeeklySummary {
  weekStart: string // ISO 8601
  weekEnd: string // ISO 8601
  avgGlucose: number
  timeInRange: number // percentage
  totalSpikes: number
  totalMeals: number
  mealsByType: {
    breakfast: number
    lunch: number
    dinner: number
    snack: number
  }
  bestMeals: Array<{
    name: string
    mealType: string
    glucoseChange: number
    date: string // ISO 8601
  }>
  worstMeals: Array<{
    name: string
    mealType: string
    glucoseChange: number
    date: string // ISO 8601
  }>
  dailySummaries: Array<{
    date: string // ISO 8601
    avgGlucose: number
    timeInRange: number
    spikeCount: number
    mealCount: number
  }>
  disclaimer: string
}

// Streak Data (client-side calculation from API data)
export interface StreakData {
  currentStreak: number // consecutive days with at least one meal logged
  longestStreak: number
  totalLoggingDays: number
  daysInTargetRange: number // days with >70% time in range
  totalMeals: number
  totalGlucoseReadings: number
  milestones: Array<{
    type: 'meals' | 'readings' | 'streak' | 'time_in_range'
    title: string
    achieved: boolean
    progress: number // 0-100
    target: number
  }>
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
 * Fetch daily insights for a specific date
 * @param date - Date string in YYYY-MM-DD format
 * @param generate - Force regeneration of insights (optional)
 */
export async function getDailyInsights(
  date: string,
  generate = false
): Promise<DailyInsightsResponse> {
  const session = await getValidSession()

  const url = `${API_BASE_URL}/api/analytics/insights/daily?date=${date}${
    generate ? '&generate=true' : ''
  }`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[INSIGHTS] Failed to fetch daily insights:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to fetch daily insights: ${response.status}`
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
 * Fetch weekly summary for a specific week
 * @param weekStart - Week start date in YYYY-MM-DD format (Monday)
 * @param generate - Force regeneration of summary (optional)
 */
export async function getWeeklySummary(
  weekStart: string,
  generate = false
): Promise<WeeklySummary> {
  const session = await getValidSession()

  const url = `${API_BASE_URL}/api/analytics/insights/weekly?weekStart=${weekStart}${
    generate ? '&generate=true' : ''
  }`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[INSIGHTS] Failed to fetch weekly summary:', {
      status: response.status,
      url,
      body: errorText,
    })

    let errorMessage = `Failed to fetch weekly summary: ${response.status}`
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
 * Calculate logging streak from weekly summaries
 * Fetches last 4 weeks of data to calculate streaks
 */
export async function calculateStreak(): Promise<StreakData> {
  try {
    // Get last 4 weeks of data
    const today = new Date()
    const weeklySummaries: WeeklySummary[] = []

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - (today.getDay() + 7 * i)) // Monday of week
      weekStart.setHours(0, 0, 0, 0)

      const weekStartStr = weekStart.toISOString().split('T')[0]

      try {
        const summary = await getWeeklySummary(weekStartStr)
        weeklySummaries.push(summary)
      } catch (error) {
        console.warn(`[STREAK] Failed to fetch week starting ${weekStartStr}:`, error)
      }
    }

    // Calculate metrics from daily summaries
    const allDays = weeklySummaries.flatMap((week) => week.dailySummaries)
    const sortedDays = allDays.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Calculate current streak (consecutive days with meals)
    let currentStreak = 0
    for (const day of sortedDays) {
      if (day.mealCount > 0) {
        currentStreak++
      } else {
        break
      }
    }

    // Calculate longest streak
    let longestStreak = 0
    let tempStreak = 0
    for (const day of sortedDays.reverse()) {
      if (day.mealCount > 0) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Calculate total logging days
    const totalLoggingDays = allDays.filter((day) => day.mealCount > 0).length

    // Calculate days in target range (>70% TIR)
    const daysInTargetRange = allDays.filter((day) => day.timeInRange >= 70).length

    // Calculate totals
    const totalMeals = weeklySummaries.reduce((sum, week) => sum + week.totalMeals, 0)

    // For total glucose readings, we need to estimate (can't get from weekly summary alone)
    // Assuming average of 10 readings per day with data
    const totalGlucoseReadings = allDays.filter((day) => day.avgGlucose > 0).length * 10

    // Calculate milestones
    const milestones = [
      {
        type: 'meals' as const,
        title: '50 Meals Logged',
        achieved: totalMeals >= 50,
        progress: Math.min((totalMeals / 50) * 100, 100),
        target: 50,
      },
      {
        type: 'meals' as const,
        title: '100 Meals Logged',
        achieved: totalMeals >= 100,
        progress: Math.min((totalMeals / 100) * 100, 100),
        target: 100,
      },
      {
        type: 'readings' as const,
        title: '100 Glucose Readings',
        achieved: totalGlucoseReadings >= 100,
        progress: Math.min((totalGlucoseReadings / 100) * 100, 100),
        target: 100,
      },
      {
        type: 'streak' as const,
        title: '7-Day Logging Streak',
        achieved: currentStreak >= 7,
        progress: Math.min((currentStreak / 7) * 100, 100),
        target: 7,
      },
      {
        type: 'streak' as const,
        title: '30-Day Logging Streak',
        achieved: currentStreak >= 30,
        progress: Math.min((currentStreak / 30) * 100, 100),
        target: 30,
      },
      {
        type: 'time_in_range' as const,
        title: '7 Days in Target Range',
        achieved: daysInTargetRange >= 7,
        progress: Math.min((daysInTargetRange / 7) * 100, 100),
        target: 7,
      },
    ]

    return {
      currentStreak,
      longestStreak,
      totalLoggingDays,
      daysInTargetRange,
      totalMeals,
      totalGlucoseReadings,
      milestones,
    }
  } catch (error) {
    console.error('[STREAK] Failed to calculate streak:', error)
    // Return empty streak data on error
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalLoggingDays: 0,
      daysInTargetRange: 0,
      totalMeals: 0,
      totalGlucoseReadings: 0,
      milestones: [],
    }
  }
}

/**
 * Get Monday of the week for a given date
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(d.setDate(diff))
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}
