import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'
import {
  generateWeeklySummary,
  storeWeeklySummary,
  getWeeklySummary,
} from '@/lib/analytics/weekly-insights'
import { METABOLIC_INSIGHTS_DISCLAIMER } from '@/lib/copy'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/insights/weekly
 *
 * Generate or retrieve weekly summary insights
 *
 * Query params:
 * - weekStart: ISO 8601 date (Monday of the week, required)
 * - generate: 'true' to force regeneration (optional)
 *
 * Response:
 * {
 *   weekStart: string (ISO 8601),
 *   weekEnd: string (ISO 8601),
 *   avgGlucose: number,
 *   timeInRange: number (percentage),
 *   totalSpikes: number,
 *   totalMeals: number,
 *   mealsByType: { breakfast: number, lunch: number, dinner: number, snack: number },
 *   bestMeals: [...],
 *   worstMeals: [...],
 *   dailySummaries: [...],
 *   disclaimer: string
 * }
 */
export async function GET(req: NextRequest) {
  console.log('[WEEKLY INSIGHTS API] Request received')

  try {
    // Authenticate user
    const userId = await requireUserId(req)
    console.log(`[WEEKLY INSIGHTS API] User ID: ${userId}`)

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const weekStartParam = searchParams.get('weekStart')
    const generate = searchParams.get('generate') === 'true'

    console.log(`[WEEKLY INSIGHTS API] Week start parameter: ${weekStartParam}`)
    console.log(`[WEEKLY INSIGHTS API] Force generate: ${generate}`)

    // Validate weekStart parameter
    if (!weekStartParam) {
      console.error('[WEEKLY INSIGHTS API] Missing weekStart parameter')
      return NextResponse.json(
        { error: 'Missing weekStart parameter (ISO 8601 date required)' },
        { status: 400 }
      )
    }

    // Parse week start date
    let weekStart: Date
    try {
      weekStart = new Date(weekStartParam)
      if (isNaN(weekStart.getTime())) {
        throw new Error('Invalid date')
      }
      // Normalize to start of day
      weekStart.setHours(0, 0, 0, 0)
    } catch (error) {
      console.error('[WEEKLY INSIGHTS API] Invalid weekStart date:', weekStartParam)
      return NextResponse.json(
        { error: 'Invalid weekStart date format. Use ISO 8601 (e.g., 2025-10-16T00:00:00Z)' },
        { status: 400 }
      )
    }

    console.log(`[WEEKLY INSIGHTS API] Parsed week start: ${weekStart.toISOString()}`)

    // Get person ID
    console.log('[WEEKLY INSIGHTS API] Fetching person record...')
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })

    if (!person) {
      console.error('[WEEKLY INSIGHTS API] Person record not found')
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      )
    }

    console.log(`[WEEKLY INSIGHTS API] Person ID: ${person.id}`)

    // Check if weekly summary already exists
    const existing = !generate ? await getWeeklySummary(person.id, weekStart) : null

    if (existing && !generate) {
      console.log('[WEEKLY INSIGHTS API] ✓ Returning cached weekly summary')
      return NextResponse.json(
        {
          ...existing,
          weekStart: existing.weekStart.toISOString(),
          weekEnd: existing.weekEnd.toISOString(),
          dailySummaries: existing.dailySummaries.map((day: any) => ({
            ...day,
            date: day.date.toISOString(),
          })),
          bestMeals: existing.bestMeals.map((meal: any) => ({
            ...meal,
            date: meal.date.toISOString(),
          })),
          worstMeals: existing.worstMeals.map((meal: any) => ({
            ...meal,
            date: meal.date.toISOString(),
          })),
        },
        { status: 200 }
      )
    }

    // Generate new weekly summary
    console.log('[WEEKLY INSIGHTS API] Generating new weekly summary...')
    const summary = await generateWeeklySummary(person.id, weekStart)

    // Store the generated summary
    await storeWeeklySummary(person.id, weekStart, summary)

    console.log('[WEEKLY INSIGHTS API] ✓ Weekly summary generated and stored')

    // Format response
    const response = {
      weekStart: summary.weekStart.toISOString(),
      weekEnd: summary.weekEnd.toISOString(),
      avgGlucose: Math.round(summary.avgGlucose * 10) / 10, // Round to 1 decimal
      timeInRange: Math.round(summary.timeInRange), // Round to integer percentage
      totalSpikes: summary.totalSpikes,
      totalMeals: summary.totalMeals,
      mealsByType: summary.mealsByType,
      bestMeals: summary.bestMeals.map((meal) => ({
        name: meal.name,
        mealType: meal.mealType,
        glucoseChange: Math.round(meal.glucoseChange * 10) / 10,
        date: meal.date.toISOString(),
      })),
      worstMeals: summary.worstMeals.map((meal) => ({
        name: meal.name,
        mealType: meal.mealType,
        glucoseChange: Math.round(meal.glucoseChange * 10) / 10,
        date: meal.date.toISOString(),
      })),
      dailySummaries: summary.dailySummaries.map((day) => ({
        date: day.date.toISOString(),
        avgGlucose: Math.round(day.avgGlucose * 10) / 10,
        timeInRange: Math.round(day.timeInRange),
        spikeCount: day.spikeCount,
        mealCount: day.mealCount,
      })),
      disclaimer: METABOLIC_INSIGHTS_DISCLAIMER,
    }

    console.log('[WEEKLY INSIGHTS API] ✓ Success! Returning weekly summary')
    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('[WEEKLY INSIGHTS API] ❌ Error:', error)
    console.error('[WEEKLY INSIGHTS API] Error message:', error?.message)
    console.error('[WEEKLY INSIGHTS API] Error stack:', error?.stack)
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}
