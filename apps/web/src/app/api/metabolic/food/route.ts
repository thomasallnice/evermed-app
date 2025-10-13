import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'
import { z } from 'zod'
import { analyzeFoodPhoto } from '@/lib/food-analysis'
import { analyzeFoodPhotoGemini } from '@/lib/food-analysis-gemini'

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

    // Generate public URL for the photo
    const { data: urlData } = supabase.storage
      .from('food-photos')
      .getPublicUrl(storagePath)

    const photoUrl = urlData.publicUrl
    console.log(`[FOOD UPLOAD] Photo uploaded to storage: ${storagePath}`)
    console.log(`[FOOD UPLOAD] Public URL generated: ${photoUrl}`)

    // Analyze photo using Gemini or OpenAI (feature flag)
    const useGemini = process.env.USE_GEMINI_FOOD_ANALYSIS === 'true'
    console.log(`[FOOD UPLOAD] Starting analysis (Provider: ${useGemini ? 'Gemini' : 'OpenAI'})`)
    console.log(`[FOOD UPLOAD] Environment check:`)
    console.log(`  - USE_GEMINI_FOOD_ANALYSIS: ${process.env.USE_GEMINI_FOOD_ANALYSIS}`)
    console.log(`  - GOOGLE_CLOUD_PROJECT: ${!!process.env.GOOGLE_CLOUD_PROJECT}`)
    console.log(`  - GOOGLE_APPLICATION_CREDENTIALS_JSON: ${!!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON}`)
    console.log(`  - OPENAI_API_KEY: ${!!process.env.OPENAI_API_KEY}`)

    const analysisResult = useGemini
      ? await analyzeFoodPhotoGemini(photoUrl)
      : await analyzeFoodPhoto(photoUrl)

    console.log(`[FOOD UPLOAD] Analysis result:`, {
      success: analysisResult.success,
      ingredientsCount: analysisResult.ingredients?.length || 0,
      error: analysisResult.error,
      metadata: analysisResult.metadata
    })

    let analysisStatus: 'pending' | 'completed' | 'failed' = 'completed'
    let ingredients: any[] = []
    let totalCalories = 0
    let totalCarbsG = 0
    let totalProteinG = 0
    let totalFatG = 0
    let totalFiberG = 0

    if (analysisResult.success && analysisResult.ingredients.length > 0) {
      // Analysis succeeded
      console.log('Analysis succeeded with', analysisResult.ingredients.length, 'ingredients')
      analysisStatus = 'completed'

      // Prepare ingredients for database
      ingredients = analysisResult.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity ?? 0,
        unit: ing.unit ?? 'serving',
        calories: ing.calories,
        carbsG: ing.carbsG,
        proteinG: ing.proteinG,
        fatG: ing.fatG,
        fiberG: ing.fiberG,
        confidenceScore: 0.85, // Default AI confidence
        source: 'ai_detected',
      }))

      // Calculate totals
      totalCalories = analysisResult.ingredients.reduce((sum, ing) => sum + ing.calories, 0)
      totalCarbsG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.carbsG, 0)
      totalProteinG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.proteinG, 0)
      totalFatG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.fatG, 0)
      totalFiberG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.fiberG, 0)
    } else {
      // Analysis failed
      console.error('Analysis failed:', analysisResult.error)
      analysisStatus = 'failed'
    }

    // Create FoodEntry with analysis results
    const foodEntry = await prisma.foodEntry.create({
      data: {
        personId: person.id,
        timestamp: new Date(),
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        totalCalories,
        totalCarbsG,
        totalProteinG,
        totalFatG,
        totalFiberG,
        photos: {
          create: {
            storagePath,
            originalSizeBytes: photo.size,
            analysisStatus,
            analysisCompletedAt: analysisStatus !== 'pending' ? new Date() : null,
          },
        },
        ingredients: {
          create: ingredients,
        },
      },
      include: {
        photos: true,
        ingredients: true,
      },
    })

    return NextResponse.json(
      {
        foodEntryId: foodEntry.id,
        photoUrl,
        mealType: foodEntry.mealType,
        timestamp: foodEntry.timestamp.toISOString(),
        analysisStatus: foodEntry.photos[0]?.analysisStatus || 'pending',
        ingredients: foodEntry.ingredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: ing.calories,
          carbsG: ing.carbsG,
          proteinG: ing.proteinG,
          fatG: ing.fatG,
          fiberG: ing.fiberG,
        })),
        totalCalories: foodEntry.totalCalories,
        totalCarbsG: foodEntry.totalCarbsG,
        totalProteinG: foodEntry.totalProteinG,
        totalFatG: foodEntry.totalFatG,
        totalFiberG: foodEntry.totalFiberG,
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
    const formattedEntries = entries.map((entry: any) => {
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
