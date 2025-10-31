// Reports API Client
// Generate and export weekly reports for healthcare providers

import { supabase, API_URL } from './supabase'
import { getWeeklySummary, type WeeklySummary } from './insights'
import { getDailyTimeline, type TimelineData } from './timeline'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

const API_BASE_URL = API_URL

export interface ReportOptions {
  weekStart: string // YYYY-MM-DD (Monday)
  includeGlucose: boolean
  includeMeals: boolean
  includeInsights: boolean
  customNotes?: string
}

export interface ReportData {
  weekStart: string
  weekEnd: string
  summary: WeeklySummary
  dailyData: Array<{
    date: string
    timeline: TimelineData
  }>
  customNotes?: string
}

/**
 * Get or refresh a valid Supabase session
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
 * Fetch all data needed for a weekly report
 */
export async function fetchReportData(options: ReportOptions): Promise<ReportData> {
  try {
    // Get weekly summary
    const summary = await getWeeklySummary(options.weekStart)

    // Get daily timeline data for each day of the week
    const dailyData: Array<{ date: string; timeline: TimelineData }> = []

    if (options.includeGlucose || options.includeMeals) {
      const weekStart = new Date(options.weekStart)

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]

        try {
          const timeline = await getDailyTimeline(dateStr)
          dailyData.push({ date: dateStr, timeline })
        } catch (error) {
          console.warn(`[REPORTS] Failed to fetch timeline for ${dateStr}:`, error)
          // Continue with other days even if one fails
        }
      }
    }

    return {
      weekStart: summary.weekStart,
      weekEnd: summary.weekEnd,
      summary,
      dailyData,
      customNotes: options.customNotes,
    }
  } catch (error) {
    console.error('[REPORTS] Failed to fetch report data:', error)
    throw error
  }
}

/**
 * Generate CSV export of glucose and meal data
 */
export async function generateCSV(reportData: ReportData): Promise<string> {
  const lines: string[] = []

  // Header
  lines.push('Weekly Glucose & Meal Report')
  lines.push(`Week: ${new Date(reportData.weekStart).toLocaleDateString()} - ${new Date(reportData.weekEnd).toLocaleDateString()}`)
  lines.push('')

  // Summary
  lines.push('WEEKLY SUMMARY')
  lines.push(`Average Glucose,${reportData.summary.avgGlucose} mg/dL`)
  lines.push(`Time in Range,${reportData.summary.timeInRange}%`)
  lines.push(`Total Spikes,${reportData.summary.totalSpikes}`)
  lines.push(`Total Meals,${reportData.summary.totalMeals}`)
  lines.push('')

  // Glucose readings
  lines.push('GLUCOSE READINGS')
  lines.push('Date,Time,Value (mg/dL)')
  reportData.dailyData.forEach((day) => {
    day.timeline.glucose.forEach((reading) => {
      const date = new Date(reading.timestamp)
      lines.push(
        `${date.toLocaleDateString()},${date.toLocaleTimeString()},${reading.value}`
      )
    })
  })
  lines.push('')

  // Meals
  lines.push('MEALS')
  lines.push('Date,Time,Type,Name,Calories,Carbs (g),Protein (g),Fat (g),Fiber (g)')
  reportData.dailyData.forEach((day) => {
    day.timeline.meals.forEach((meal) => {
      const date = new Date(meal.timestamp)
      lines.push(
        `${date.toLocaleDateString()},${date.toLocaleTimeString()},${meal.type},${meal.name},${meal.calories},${meal.carbs},${meal.protein},${meal.fat},${meal.fiber}`
      )
    })
  })
  lines.push('')

  // Custom notes
  if (reportData.customNotes) {
    lines.push('NOTES FOR HEALTHCARE PROVIDER')
    lines.push(reportData.customNotes)
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate formatted text report
 */
export function generateTextReport(reportData: ReportData): string {
  const lines: string[] = []

  // Header
  lines.push('WEEKLY GLUCOSE & MEAL REPORT')
  lines.push('=' .repeat(50))
  lines.push(`Week: ${new Date(reportData.weekStart).toLocaleDateString()} - ${new Date(reportData.weekEnd).toLocaleDateString()}`)
  lines.push('')

  // Summary
  lines.push('WEEKLY SUMMARY')
  lines.push('-'.repeat(50))
  lines.push(`Average Glucose: ${reportData.summary.avgGlucose} mg/dL`)
  lines.push(`Time in Range: ${reportData.summary.timeInRange}% (70-180 mg/dL)`)
  lines.push(`Total Glucose Spikes: ${reportData.summary.totalSpikes}`)
  lines.push(`Total Meals Logged: ${reportData.summary.totalMeals}`)
  lines.push('')

  // Best Meals
  if (reportData.summary.bestMeals.length > 0) {
    lines.push('MEALS WITH STABLE GLUCOSE RESPONSE')
    lines.push('-'.repeat(50))
    reportData.summary.bestMeals.forEach((meal, index) => {
      lines.push(`${index + 1}. ${meal.name}`)
      lines.push(`   Type: ${meal.mealType}`)
      lines.push(`   Glucose Impact: +${meal.glucoseChange} mg/dL`)
      lines.push(`   Date: ${new Date(meal.date).toLocaleDateString()}`)
      lines.push('')
    })
  }

  // Worst Meals
  if (reportData.summary.worstMeals.length > 0) {
    lines.push('MEALS WITH HIGH GLUCOSE RESPONSE')
    lines.push('-'.repeat(50))
    reportData.summary.worstMeals.forEach((meal, index) => {
      lines.push(`${index + 1}. ${meal.name}`)
      lines.push(`   Type: ${meal.mealType}`)
      lines.push(`   Glucose Impact: +${meal.glucoseChange} mg/dL`)
      lines.push(`   Date: ${new Date(meal.date).toLocaleDateString()}`)
      lines.push('')
    })
  }

  // Daily Summaries
  lines.push('DAILY BREAKDOWN')
  lines.push('-'.repeat(50))
  reportData.summary.dailySummaries.forEach((day) => {
    const date = new Date(day.date)
    lines.push(`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`)
    lines.push(`  Avg Glucose: ${day.avgGlucose} mg/dL`)
    lines.push(`  Time in Range: ${day.timeInRange}%`)
    lines.push(`  Spikes: ${day.spikeCount}`)
    lines.push(`  Meals: ${day.mealCount}`)
    lines.push('')
  })

  // Custom Notes
  if (reportData.customNotes) {
    lines.push('NOTES FOR HEALTHCARE PROVIDER')
    lines.push('-'.repeat(50))
    lines.push(reportData.customNotes)
    lines.push('')
  }

  // Disclaimer
  lines.push('DISCLAIMER')
  lines.push('-'.repeat(50))
  lines.push('This report is for informational purposes only and should not be used')
  lines.push('for diagnosis or treatment decisions. Please consult your healthcare')
  lines.push('provider for medical advice.')
  lines.push('')

  return lines.join('\n')
}

/**
 * Export report as CSV file and share
 */
export async function exportCSV(reportData: ReportData): Promise<void> {
  try {
    const csvContent = await generateCSV(reportData)
    const weekStart = new Date(reportData.weekStart).toISOString().split('T')[0]
    const fileName = `glucose-report-${weekStart}.csv`
    const fileUri = FileSystem.documentDirectory + fileName

    // Write CSV to file
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device')
    }

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share Glucose Report',
      UTI: 'public.comma-separated-values-text',
    })
  } catch (error) {
    console.error('[REPORTS] Failed to export CSV:', error)
    throw error
  }
}

/**
 * Export report as text file and share
 */
export async function exportTextReport(reportData: ReportData): Promise<void> {
  try {
    const textContent = generateTextReport(reportData)
    const weekStart = new Date(reportData.weekStart).toISOString().split('T')[0]
    const fileName = `glucose-report-${weekStart}.txt`
    const fileUri = FileSystem.documentDirectory + fileName

    // Write text to file
    await FileSystem.writeAsStringAsync(fileUri, textContent, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device')
    }

    // Share the file
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: 'Share Glucose Report',
    })
  } catch (error) {
    console.error('[REPORTS] Failed to export text report:', error)
    throw error
  }
}

/**
 * Get Monday of the week for a given date
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}
