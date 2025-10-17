// Weekly Insights Generation Algorithm
// Generates weekly summary insights for PDF export and reports
// Aggregates 7 days of data: glucose stats, meal patterns, best/worst meals
// Privacy-first: All queries filter by personId (RLS enforcement)

import { PrismaClient } from '@prisma/client'
import { METABOLIC_INSIGHTS_DISCLAIMER } from '../copy'
import { getDailyInsights } from './daily-insights'
import { getGlucoseStats, getMealStats } from './timeline-queries'
import { correlateMealsInRange } from './glucose-correlation'

const prisma = new PrismaClient()

export interface WeeklySummaryData {
  weekStart: Date
  weekEnd: Date
  avgGlucose: number
  timeInRange: number
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
    date: Date
  }>
  worstMeals: Array<{
    name: string
    mealType: string
    glucoseChange: number
    date: Date
  }>
  dailySummaries: Array<{
    date: Date
    avgGlucose: number
    timeInRange: number
    spikeCount: number
    mealCount: number
  }>
}

/**
 * Generate weekly summary insights
 * Aggregates data from the past 7 days (or custom date range)
 * Returns summary suitable for PDF export and reports
 */
export async function generateWeeklySummary(
  personId: string,
  weekStartDate: Date
): Promise<WeeklySummaryData> {
  // Calculate week boundaries
  const weekStart = new Date(weekStartDate)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  weekEnd.setHours(23, 59, 59, 999)

  console.log(`[WEEKLY INSIGHTS] Generating summary for ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)

  // Get overall glucose statistics for the week
  const glucoseStats = await getGlucoseStats(personId, weekStart, weekEnd)

  // Get meal statistics for the week
  const mealStats = await getMealStats(personId, weekStart, weekEnd)

  // Get meal-glucose correlations for the week
  const correlations = await correlateMealsInRange(
    personId,
    weekStart,
    weekEnd
  )

  // Find best and worst meals (only high/medium confidence)
  const reliableCorrelations = correlations.filter(
    (c) => c.confidence === 'high' || c.confidence === 'medium'
  )

  // Sort by glucose change
  const sortedCorrelations = [...reliableCorrelations].sort(
    (a, b) => a.glucoseResponse.change - b.glucoseResponse.change
  )

  // Get top 3 best meals (lowest glucose impact)
  const bestMeals = sortedCorrelations.slice(0, 3).map((meal) => ({
    name: meal.mealName,
    mealType: meal.mealType,
    glucoseChange: meal.glucoseResponse.change,
    date: meal.timestamp,
  }))

  // Get top 3 worst meals (highest glucose impact)
  const worstMeals = sortedCorrelations
    .slice(-3)
    .reverse()
    .map((meal) => ({
      name: meal.mealName,
      mealType: meal.mealType,
      glucoseChange: meal.glucoseResponse.change,
      date: meal.timestamp,
    }))

  // Get daily summaries for the week
  const dailySummaries: Array<{
    date: Date
    avgGlucose: number
    timeInRange: number
    spikeCount: number
    mealCount: number
  }> = []

  let currentDate = new Date(weekStart)
  while (currentDate < weekEnd) {
    try {
      // Try to get existing daily insights
      const dailyInsight = await getDailyInsights(personId, currentDate)

      if (dailyInsight) {
        const mealCount =
          dailyInsight.mealCount.breakfast +
          dailyInsight.mealCount.lunch +
          dailyInsight.mealCount.dinner +
          dailyInsight.mealCount.snack

        dailySummaries.push({
          date: new Date(currentDate),
          avgGlucose: dailyInsight.avgGlucose,
          timeInRange: dailyInsight.timeInRange,
          spikeCount: dailyInsight.spikeCount,
          mealCount,
        })
      } else {
        // Daily insights not generated yet - calculate on the fly
        const dayStart = new Date(currentDate)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(currentDate)
        dayEnd.setHours(23, 59, 59, 999)

        const dayGlucoseStats = await getGlucoseStats(personId, dayStart, dayEnd)
        const dayMealStats = await getMealStats(personId, dayStart, dayEnd)

        const dayMealCount =
          dayMealStats.mealsByType.breakfast +
          dayMealStats.mealsByType.lunch +
          dayMealStats.mealsByType.dinner +
          dayMealStats.mealsByType.snack

        dailySummaries.push({
          date: new Date(currentDate),
          avgGlucose: dayGlucoseStats.avgGlucose,
          timeInRange: dayGlucoseStats.timeInRange,
          spikeCount: dayGlucoseStats.spikeCount,
          mealCount: dayMealCount,
        })
      }
    } catch (error) {
      console.error(
        `[WEEKLY INSIGHTS] Failed to get insights for ${currentDate.toISOString()}:`,
        error
      )
      // Add empty day summary
      dailySummaries.push({
        date: new Date(currentDate),
        avgGlucose: 0,
        timeInRange: 0,
        spikeCount: 0,
        mealCount: 0,
      })
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate total meals and spikes
  const totalMeals =
    mealStats.mealsByType.breakfast +
    mealStats.mealsByType.lunch +
    mealStats.mealsByType.dinner +
    mealStats.mealsByType.snack

  const totalSpikes = dailySummaries.reduce((sum, day) => sum + day.spikeCount, 0)

  console.log(`[WEEKLY INSIGHTS] ✓ Summary generated: ${totalMeals} meals, ${totalSpikes} spikes, ${Math.round(glucoseStats.timeInRange)}% TIR`)

  return {
    weekStart,
    weekEnd,
    avgGlucose: glucoseStats.avgGlucose,
    timeInRange: glucoseStats.timeInRange,
    totalSpikes,
    totalMeals,
    mealsByType: mealStats.mealsByType,
    bestMeals,
    worstMeals,
    dailySummaries,
  }
}

/**
 * Store weekly summary in MetabolicInsight table
 * Allows caching and historical tracking of weekly reports
 */
export async function storeWeeklySummary(
  personId: string,
  weekStartDate: Date,
  summaryData: WeeklySummaryData
): Promise<void> {
  const weekStart = new Date(weekStartDate)
  weekStart.setHours(0, 0, 0, 0)

  // Check if weekly summary already exists
  const existing = await prisma.metabolicInsight.findFirst({
    where: {
      personId,
      date: weekStart,
      insightType: 'weekly_summary',
    },
  })

  if (existing) {
    // Update existing summary
    await prisma.metabolicInsight.update({
      where: {
        id: existing.id,
      },
      data: {
        insightData: summaryData as any, // JSON field
      },
    })
    console.log(`[WEEKLY INSIGHTS] ✓ Updated existing weekly summary for ${weekStart.toISOString()}`)
  } else {
    // Create new summary
    await prisma.metabolicInsight.create({
      data: {
        personId,
        date: weekStart,
        insightType: 'weekly_summary',
        insightData: summaryData as any, // JSON field
      },
    })
    console.log(`[WEEKLY INSIGHTS] ✓ Created new weekly summary for ${weekStart.toISOString()}`)
  }
}

/**
 * Get stored weekly summary
 * Returns null if summary hasn't been generated yet
 */
export async function getWeeklySummary(
  personId: string,
  weekStartDate: Date
): Promise<(WeeklySummaryData & { generatedAt: Date; disclaimer: string }) | null> {
  const weekStart = new Date(weekStartDate)
  weekStart.setHours(0, 0, 0, 0)

  const insight = await prisma.metabolicInsight.findFirst({
    where: {
      personId, // CRITICAL: RLS enforcement
      date: weekStart,
      insightType: 'weekly_summary',
    },
    select: {
      insightData: true,
      createdAt: true,
    },
  })

  if (!insight) return null

  return {
    ...(insight.insightData as unknown as WeeklySummaryData),
    generatedAt: insight.createdAt,
    disclaimer: METABOLIC_INSIGHTS_DISCLAIMER,
  }
}

/**
 * Generate and store weekly summary
 * Convenience function that combines generation and storage
 */
export async function generateAndStoreWeeklySummary(
  personId: string,
  weekStartDate: Date
): Promise<WeeklySummaryData> {
  const summary = await generateWeeklySummary(personId, weekStartDate)
  await storeWeeklySummary(personId, weekStartDate, summary)
  return summary
}
