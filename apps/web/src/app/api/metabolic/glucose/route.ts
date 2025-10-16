import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

// Validation schema
const PostGlucoseSchema = z.object({
  value: z.number().min(20).max(600),
  source: z.enum(['fingerstick', 'cgm', 'lab']),
  timestamp: z.string().datetime().optional(),
})

/**
 * POST /api/metabolic/glucose
 *
 * Create a manual glucose reading
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Body (JSON):
 * - value: number (20-600 mg/dL, required)
 * - source: 'fingerstick' | 'cgm' | 'lab' (required)
 * - timestamp?: ISO 8601 timestamp (optional, defaults to now)
 *
 * Response (201):
 * {
 *   success: true,
 *   reading: {
 *     id: string,
 *     value: number,
 *     source: string,
 *     timestamp: string,
 *     createdAt: string
 *   }
 * }
 *
 * Errors:
 * - 400: Invalid input (out of range, invalid source, invalid timestamp)
 * - 401: Unauthorized
 * - 404: Person record not found
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    let userId: string
    try {
      userId = await requireUserId(request)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = PostGlucoseSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { value, source, timestamp } = validation.data

    // Create glucose reading
    const reading = await prisma.glucoseReading.create({
      data: {
        personId: person.id,
        value: Math.round(value * 10) / 10, // Round to 1 decimal place
        source,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        deviceId: 'Manual Entry',
        confidence: source === 'fingerstick' ? 1.0 : null,
      },
    })

    console.log(`[GLUCOSE ENTRY] Created reading ${reading.id} for person ${person.id}: ${value} mg/dL (${source})`)

    return NextResponse.json(
      {
        success: true,
        reading: {
          id: reading.id,
          value: reading.value,
          source: reading.source,
          timestamp: reading.timestamp.toISOString(),
          createdAt: reading.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[GLUCOSE ENTRY] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET /api/metabolic/glucose
 *
 * List glucose readings with optional filtering
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Query params:
 * - startDate?: ISO 8601 date (inclusive)
 * - endDate?: ISO 8601 date (inclusive)
 * - source?: 'fingerstick' | 'cgm' | 'lab'
 * - limit?: number (default: 100, max: 1000)
 *
 * Response (200):
 * {
 *   readings: Array<{
 *     id: string,
 *     value: number,
 *     source: string,
 *     timestamp: string,
 *     createdAt: string
 *   }>,
 *   total: number
 * }
 *
 * Errors:
 * - 400: Invalid query parameters
 * - 401: Unauthorized
 * - 404: Person record not found
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    let userId: string
    try {
      userId = await requireUserId(request)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 1000.' },
        { status: 400 }
      )
    }

    // Validate source
    if (source && !['fingerstick', 'cgm', 'lab'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be fingerstick, cgm, or lab.' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: any = {
      personId: person.id,
    }

    if (source) {
      where.source = source
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate)
      }
    }

    // Query glucose readings
    const [readings, total] = await Promise.all([
      prisma.glucoseReading.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      }),
      prisma.glucoseReading.count({ where }),
    ])

    // Format response
    const formattedReadings = readings.map((reading) => ({
      id: reading.id,
      value: reading.value,
      source: reading.source,
      timestamp: reading.timestamp.toISOString(),
      createdAt: reading.createdAt.toISOString(),
      deviceId: reading.deviceId,
    }))

    return NextResponse.json({
      readings: formattedReadings,
      total,
    })
  } catch (error: any) {
    console.error('[GLUCOSE LIST] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
