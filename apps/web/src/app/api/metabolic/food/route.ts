import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

// Validation schemas
const PostFoodEntrySchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  eatenAt: z.string().datetime(),
})

const GetFoodQuerySchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * POST /api/metabolic/food
 *
 * Upload a food photo and create a food entry
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Body (multipart/form-data):
 * - photo: File (JPEG/PNG, max 5MB, required)
 * - mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' (required)
 * - eatenAt: ISO 8601 timestamp (required)
 *
 * Response (201):
 * {
 *   id: string,
 *   personId: string,
 *   photoUrl: string,
 *   mealType: string,
 *   eatenAt: string,
 *   status: 'pending' | 'completed' | 'failed'
 * }
 *
 * Errors:
 * - 400: Invalid input (missing fields, invalid mealType, invalid date)
 * - 401: Unauthorized
 * - 413: Photo too large (>5MB)
 * - 415: Invalid MIME type (not JPEG/PNG)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user using standardized helper
    let userId: string
    try {
      userId = await requireUserId(request)
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Re-enable after running metabolic insights migrations
    // The FoodEntry and FoodPhoto tables don't exist in staging yet
    // See: db/migrations/20251010090000_add_metabolic_insights/migration.sql

    return NextResponse.json(
      {
        error: 'Metabolic insights not yet available',
        message: 'Database migrations pending. Food upload will be enabled after migrations are applied.',
      },
      { status: 503 } // Service Unavailable
    )
  } catch (error) {
    console.error('Food upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/metabolic/food
 *
 * List food entries with optional filtering
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Query params:
 * - mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
 * - startDate?: ISO 8601 date (inclusive)
 * - endDate?: ISO 8601 date (inclusive)
 * - limit?: number (default: 20, max: 100)
 *
 * Response (200):
 * {
 *   entries: Array<{
 *     id: string,
 *     mealType: string,
 *     eatenAt: string,
 *     photoUrl: string,
 *     ingredients: Array<{
 *       name: string,
 *       quantity: number | null,
 *       unit: string | null
 *     }>,
 *     totalCalories: number,
 *     totalCarbs: number
 *   }>,
 *   total: number
 * }
 *
 * Errors:
 * - 400: Invalid query parameters
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user using standardized helper
    let userId: string
    try {
      userId = await requireUserId(request)
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Re-enable after running metabolic insights migrations
    // The FoodEntry, FoodPhoto, and FoodIngredient tables don't exist in staging yet
    // See: db/migrations/20251010090000_add_metabolic_insights/migration.sql

    return NextResponse.json({
      entries: [],
      total: 0,
      message: 'Metabolic insights not yet available. Database migrations pending.',
    })
  } catch (error) {
    console.error('Food list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
