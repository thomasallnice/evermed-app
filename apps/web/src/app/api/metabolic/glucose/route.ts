import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for glucose reading
const GlucoseReadingSchema = z.object({
  personId: z.string().uuid(),
  timestamp: z.string().datetime(),
  value: z.number().min(20).max(600), // mg/dL range
  source: z.enum(['cgm', 'fingerstick', 'lab', 'interpolated']),
  deviceId: z.string().optional(),
  foodEntryId: z.string().uuid().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

/**
 * POST /api/metabolic/glucose
 *
 * Create a manual glucose reading
 *
 * Body (JSON):
 * {
 *   personId: string,
 *   timestamp: ISO8601 string,
 *   value: number (mg/dL),
 *   source: 'cgm' | 'fingerstick' | 'lab' | 'interpolated',
 *   deviceId?: string,
 *   foodEntryId?: string,
 *   confidence?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get Supabase client
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()

    // Validate data
    const validatedData = GlucoseReadingSchema.parse(body)

    // Verify person belongs to authenticated user
    const person = await prisma.person.findUnique({
      where: { id: validatedData.personId },
      select: { id: true, ownerId: true },
    })

    if (!person || person.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Person not found or access denied' },
        { status: 403 }
      )
    }

    // If foodEntryId provided, verify it belongs to the person
    if (validatedData.foodEntryId) {
      const foodEntry = await prisma.foodEntry.findUnique({
        where: { id: validatedData.foodEntryId },
        select: { personId: true },
      })

      if (!foodEntry || foodEntry.personId !== validatedData.personId) {
        return NextResponse.json(
          { error: 'Invalid foodEntryId' },
          { status: 400 }
        )
      }
    }

    // Create glucose reading
    const reading = await prisma.glucoseReading.create({
      data: {
        personId: validatedData.personId,
        timestamp: new Date(validatedData.timestamp),
        value: validatedData.value,
        source: validatedData.source,
        deviceId: validatedData.deviceId,
        foodEntryId: validatedData.foodEntryId,
        confidence: validatedData.confidence,
      },
    })

    return NextResponse.json(reading)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Glucose entry error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/metabolic/glucose
 *
 * List glucose readings with optional filtering
 *
 * Query params:
 * - personId: string (required)
 * - date: YYYY-MM-DD (optional) - filter by specific date
 * - startDate: YYYY-MM-DD (optional) - filter from date
 * - endDate: YYYY-MM-DD (optional) - filter to date
 * - source: cgm|fingerstick|lab|interpolated (optional)
 * - limit: number (optional, default: 100, max: 1000)
 * - offset: number (optional, default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Get Supabase client
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('personId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const source = searchParams.get('source')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!personId) {
      return NextResponse.json(
        { error: 'Missing required parameter: personId' },
        { status: 400 }
      )
    }

    // Verify person belongs to authenticated user
    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, ownerId: true },
    })

    if (!person || person.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Person not found or access denied' },
        { status: 403 }
      )
    }

    // Build where clause
    const where: any = { personId }

    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      where.timestamp = {
        gte: targetDate,
        lt: nextDay,
      }
    } else {
      if (startDate) {
        where.timestamp = { ...where.timestamp, gte: new Date(startDate) }
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.timestamp = { ...where.timestamp, lt: end }
      }
    }

    if (source) {
      where.source = source
    }

    // Get total count
    const total = await prisma.glucoseReading.count({ where })

    // Get readings
    const readings = await prisma.glucoseReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      include: {
        foodEntry: {
          select: {
            id: true,
            mealType: true,
            timestamp: true,
          },
        },
      },
    })

    return NextResponse.json({
      readings,
      pagination: {
        total,
        hasMore: offset + readings.length < total,
      },
    })
  } catch (error) {
    console.error('Glucose list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
