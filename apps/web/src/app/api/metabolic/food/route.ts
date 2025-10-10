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

    // Get user's Person record (assuming one Person per user)
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person profile not found. Complete onboarding first.' },
        { status: 400 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const mealType = formData.get('mealType') as string | null
    const eatenAt = formData.get('eatenAt') as string | null

    // Validate required fields
    if (!photo) {
      return NextResponse.json(
        { error: 'Missing required field: photo' },
        { status: 400 }
      )
    }

    if (!mealType || !eatenAt) {
      return NextResponse.json(
        { error: 'Missing required fields: mealType, eatenAt' },
        { status: 400 }
      )
    }

    // Validate file type (JPEG/PNG only per spec)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(photo.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: JPEG, PNG only.` },
        { status: 415 }
      )
    }

    // Validate file size (5MB max per spec)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (photo.size > maxSize) {
      return NextResponse.json(
        { error: 'Photo exceeds 5MB size limit' },
        { status: 413 }
      )
    }

    // Validate data against schema
    let validatedData
    try {
      validatedData = PostFoodEntrySchema.parse({
        mealType,
        eatenAt,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Create Supabase admin client for storage operations
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate unique file path: {userId}/{photoId}.{ext}
    const photoId = crypto.randomUUID()
    const fileExt = photo.name.split('.').pop() || 'jpg'
    const storagePath = `${userId}/${photoId}.${fileExt}`

    // Upload photo to Supabase Storage
    const photoBuffer = await photo.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('food-photos')
      .upload(storagePath, photoBuffer, {
        contentType: photo.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload photo', details: uploadError.message },
        { status: 500 }
      )
    }

    // Create food entry in database (transaction)
    const foodEntry = await prisma.foodEntry.create({
      data: {
        personId: person.id,
        timestamp: new Date(validatedData.eatenAt),
        mealType: validatedData.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        totalCalories: 0, // Will be updated after AI analysis
        totalCarbsG: 0,
        totalProteinG: 0,
        totalFatG: 0,
        totalFiberG: 0,
        photos: {
          create: {
            storagePath: uploadData.path,
            originalSizeBytes: photo.size,
            analysisStatus: 'pending',
          },
        },
      },
      include: {
        photos: true,
      },
    })

    // Get signed URL for the uploaded photo (valid for 1 hour per spec)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('food-photos')
      .createSignedUrl(uploadData.path, 3600)

    if (urlError) {
      console.error('Failed to generate signed URL:', urlError)
      // Don't fail the request, just return empty URL
    }

    const photoUrl = urlData?.signedUrl || ''

    // TODO: Trigger AI analysis job (Google Cloud Vision + Nutritionix)
    // This would be a background job that updates ingredients and nutrition

    // Return spec-compliant response
    return NextResponse.json(
      {
        id: foodEntry.id,
        personId: person.id,
        photoUrl,
        mealType: foodEntry.mealType,
        eatenAt: foodEntry.timestamp.toISOString(),
        status: foodEntry.photos[0]?.analysisStatus || 'pending',
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

    // Get user's Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })

    if (!person) {
      return NextResponse.json(
        { error: 'Person profile not found. Complete onboarding first.' },
        { status: 400 }
      )
    }

    // Parse and validate query params
    const { searchParams } = new URL(request.url)
    const rawParams = {
      mealType: searchParams.get('mealType'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit') || '20',
    }

    let validatedParams
    try {
      validatedParams = GetFoodQuerySchema.parse(rawParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid query parameters', details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    // Build where clause (RLS enforced via personId)
    const where: any = {
      personId: person.id,
    }

    if (validatedParams.mealType) {
      where.mealType = validatedParams.mealType
    }

    if (validatedParams.startDate || validatedParams.endDate) {
      where.timestamp = {}
      if (validatedParams.startDate) {
        where.timestamp.gte = new Date(validatedParams.startDate)
      }
      if (validatedParams.endDate) {
        // Include the end date (exclusive upper bound)
        const endDate = new Date(validatedParams.endDate)
        where.timestamp.lt = endDate
      }
    }

    // Get total count
    const total = await prisma.foodEntry.count({ where })

    // Get entries with related data
    const entries = await prisma.foodEntry.findMany({
      where,
      include: {
        photos: {
          select: {
            storagePath: true,
          },
          take: 1, // Get first photo only for photoUrl
        },
        ingredients: {
          select: {
            name: true,
            quantity: true,
            unit: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: validatedParams.limit,
    })

    // Create Supabase admin client for signed URLs
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate signed URLs and format response per spec
    const entriesWithUrls = await Promise.all(
      entries.map(async (entry) => {
        let photoUrl = ''

        if (entry.photos.length > 0) {
          const { data } = await supabase.storage
            .from('food-photos')
            .createSignedUrl(entry.photos[0].storagePath, 3600)
          photoUrl = data?.signedUrl || ''
        }

        return {
          id: entry.id,
          mealType: entry.mealType,
          eatenAt: entry.timestamp.toISOString(),
          photoUrl,
          ingredients: entry.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
          totalCalories: entry.totalCalories,
          totalCarbs: entry.totalCarbsG, // Map totalCarbsG to totalCarbs per spec
        }
      })
    )

    return NextResponse.json({
      entries: entriesWithUrls,
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
