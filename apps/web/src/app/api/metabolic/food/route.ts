import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for food entry
const FoodEntrySchema = z.object({
  personId: z.string().uuid(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  timestamp: z.string().datetime(),
  notes: z.string().optional(),
})

/**
 * POST /api/metabolic/food
 *
 * Upload a food photo and create a food entry
 *
 * Body (multipart/form-data):
 * - photo: File (required)
 * - personId: string (required)
 * - mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' (required)
 * - timestamp: ISO8601 string (required)
 * - notes: string (optional)
 *
 * Response:
 * {
 *   id: string,
 *   timestamp: string,
 *   mealType: string,
 *   photoUrl: string,
 *   ingredients: Ingredient[],
 *   nutrition: NutritionFacts,
 *   predictedGlucosePeak: number | null
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const personId = formData.get('personId') as string | null
    const mealType = formData.get('mealType') as string | null
    const timestamp = formData.get('timestamp') as string | null
    const notes = formData.get('notes') as string | null

    // Validate required fields
    if (!photo || !personId || !mealType || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: photo, personId, mealType, timestamp' },
        { status: 400 }
      )
    }

    // Validate data against schema
    const validatedData = FoodEntrySchema.parse({
      personId,
      mealType,
      timestamp,
      notes: notes || undefined,
    })

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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
    if (!allowedTypes.includes(photo.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (photo.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Generate unique file path: {userId}/{timestamp}-{random}.{ext}
    const fileExt = photo.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${user.id}/${fileName}`

    // Upload photo to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('food-photos')
      .upload(storagePath, photo, {
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

    // Get signed URL for the uploaded photo (valid for 1 hour)
    const { data: urlData } = await supabase.storage
      .from('food-photos')
      .createSignedUrl(storagePath, 3600)

    const photoUrl = urlData?.signedUrl || ''

    // Create food entry in database (transaction)
    const foodEntry = await prisma.foodEntry.create({
      data: {
        personId: validatedData.personId,
        timestamp: new Date(validatedData.timestamp),
        mealType: validatedData.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        notes: validatedData.notes,
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
        ingredients: true,
      },
    })

    // TODO: Trigger AI analysis job (Google Cloud Vision + Nutritionix)
    // For now, return placeholder response

    return NextResponse.json({
      id: foodEntry.id,
      timestamp: foodEntry.timestamp.toISOString(),
      mealType: foodEntry.mealType,
      photoUrl,
      ingredients: [], // Will be populated by AI analysis
      nutrition: {
        calories: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
      },
      predictedGlucosePeak: null, // Will be populated by ML model
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

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
 * Query params:
 * - personId: string (required)
 * - date: YYYY-MM-DD (optional) - filter by specific date
 * - startDate: YYYY-MM-DD (optional) - filter from date
 * - endDate: YYYY-MM-DD (optional) - filter to date
 * - mealType: breakfast|lunch|dinner|snack (optional)
 * - limit: number (optional, default: 50, max: 100)
 * - offset: number (optional, default: 0)
 *
 * Response:
 * {
 *   entries: FoodEntry[],
 *   pagination: {
 *     total: number,
 *     hasMore: boolean
 *   }
 * }
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('personId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const mealType = searchParams.get('mealType')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
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
    const where: any = {
      personId,
    }

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
        end.setDate(end.getDate() + 1) // Include the end date
        where.timestamp = { ...where.timestamp, lt: end }
      }
    }

    if (mealType) {
      where.mealType = mealType
    }

    // Get total count
    const total = await prisma.foodEntry.count({ where })

    // Get entries with related data
    const entries = await prisma.foodEntry.findMany({
      where,
      include: {
        photos: true,
        ingredients: true,
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Latest prediction only
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    // Generate signed URLs for photos
    const entriesWithUrls = await Promise.all(
      entries.map(async (entry) => {
        const photosWithUrls = await Promise.all(
          entry.photos.map(async (photo) => {
            const { data } = await supabase.storage
              .from('food-photos')
              .createSignedUrl(photo.storagePath, 3600)
            return {
              ...photo,
              url: data?.signedUrl || '',
            }
          })
        )

        return {
          ...entry,
          photos: photosWithUrls,
        }
      })
    )

    return NextResponse.json({
      entries: entriesWithUrls,
      pagination: {
        total,
        hasMore: offset + entries.length < total,
      },
    })
  } catch (error) {
    console.error('Food list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
