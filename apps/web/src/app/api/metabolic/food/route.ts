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

    // Get Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const mealType = formData.get('mealType') as string | null

    // Validate required fields
    if (!photo) {
      return NextResponse.json(
        { error: 'Photo is required' },
        { status: 400 }
      )
    }

    if (!mealType || !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return NextResponse.json(
        { error: 'Valid mealType is required (breakfast, lunch, dinner, snack)' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Photo must be less than 5MB' },
        { status: 413 }
      )
    }

    // Validate MIME type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Photo must be an image (JPEG, PNG, WebP)' },
        { status: 415 }
      )
    }

    // Create Supabase client with service role for storage upload
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Generate unique file path
    const timestamp = Date.now()
    const fileExt = photo.name.split('.').pop() || 'jpg'
    const storagePath = `${person.id}/meals/${timestamp}.${fileExt}`

    // Upload to Supabase Storage
    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('food-photos')
      .upload(storagePath, photoBuffer, {
        contentType: photo.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload photo to storage' },
        { status: 500 }
      )
    }

    // Create FoodEntry and FoodPhoto in database
    const foodEntry = await prisma.foodEntry.create({
      data: {
        personId: person.id,
        timestamp: new Date(),
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        totalCalories: 0, // Will be updated after AI analysis
        totalCarbsG: 0,
        totalProteinG: 0,
        totalFatG: 0,
        totalFiberG: 0,
        photos: {
          create: {
            storagePath,
            originalSizeBytes: photo.size,
            analysisStatus: 'pending',
          },
        },
      },
      include: {
        photos: true,
      },
    })

    // Generate public URL for the photo
    const { data: urlData } = supabase.storage
      .from('food-photos')
      .getPublicUrl(storagePath)

    return NextResponse.json(
      {
        foodEntryId: foodEntry.id,
        photoUrl: urlData.publicUrl,
        mealType: foodEntry.mealType,
        timestamp: foodEntry.timestamp.toISOString(),
        analysisStatus: foodEntry.photos[0]?.analysisStatus || 'pending',
      },
      { status: 201 }
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

    // Get Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      mealType: searchParams.get('mealType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit') || '20',
    }

    // Validate query parameters
    const validatedParams = GetFoodQuerySchema.safeParse(queryParams)
    if (!validatedParams.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validatedParams.error.errors },
        { status: 400 }
      )
    }

    const { mealType, startDate, endDate, limit } = validatedParams.data

    // Build where clause
    const where: any = {
      personId: person.id,
    }

    if (mealType) {
      where.mealType = mealType
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

    // Query food entries with photos and ingredients
    const [entries, total] = await Promise.all([
      prisma.foodEntry.findMany({
        where,
        include: {
          photos: {
            select: {
              storagePath: true,
              analysisStatus: true,
            },
          },
          ingredients: {
            select: {
              name: true,
              quantity: true,
              unit: true,
              calories: true,
              carbsG: true,
              proteinG: true,
              fatG: true,
              fiberG: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      }),
      prisma.foodEntry.count({ where }),
    ])

    // Create Supabase client for generating public URLs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Format response
    const formattedEntries = entries.map((entry) => {
      const photoUrl = entry.photos[0]
        ? supabase.storage.from('food-photos').getPublicUrl(entry.photos[0].storagePath).data.publicUrl
        : null

      return {
        id: entry.id,
        mealType: entry.mealType,
        timestamp: entry.timestamp.toISOString(),
        photoUrl,
        analysisStatus: entry.photos[0]?.analysisStatus || 'pending',
        ingredients: entry.ingredients.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: ing.calories,
          carbsG: ing.carbsG,
          proteinG: ing.proteinG,
          fatG: ing.fatG,
          fiberG: ing.fiberG,
        })),
        totalCalories: entry.totalCalories,
        totalCarbsG: entry.totalCarbsG,
        totalProteinG: entry.totalProteinG,
        totalFatG: entry.totalFatG,
        totalFiberG: entry.totalFiberG,
      }
    })

    return NextResponse.json({
      entries: formattedEntries,
      total,
    })
  } catch (error) {
    console.error('Food list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
