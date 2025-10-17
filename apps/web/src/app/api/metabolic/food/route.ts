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

/**
 * Background analysis function - MULTI-DISH VERSION
 * Analyzes a single food photo and updates FoodEntry with results
 * Links ingredients to the specific photo/dish
 */
async function analyzeSinglePhoto(
  foodEntryId: string,
  foodPhotoId: string,
  photoUrl: string,
  useGemini: boolean,
  prisma: PrismaClient
) {
  console.log(`[FOOD ANALYSIS] Starting analysis for photo ${foodPhotoId} in entry ${foodEntryId}`)
  console.log(`[FOOD ANALYSIS] Provider: ${useGemini ? 'Gemini' : 'OpenAI'}`)

  try {
    // Perform analysis
    const analysisResult = useGemini
      ? await analyzeFoodPhotoGemini(photoUrl)
      : await analyzeFoodPhoto(photoUrl)

    console.log(`[FOOD ANALYSIS] Analysis completed for photo ${foodPhotoId}:`, {
      success: analysisResult.success,
      ingredientsCount: analysisResult.ingredients?.length || 0,
      error: analysisResult.error,
    })

    if (analysisResult.success && analysisResult.ingredients.length > 0) {
      // Analysis succeeded - prepare ingredients linked to this specific photo
      const ingredients = analysisResult.ingredients.map(ing => ({
        foodEntryId,
        foodPhotoId, // Link to specific dish/photo
        name: ing.name,
        quantity: ing.quantity ?? 0,
        unit: ing.unit ?? 'serving',
        calories: ing.calories,
        carbsG: ing.carbsG,
        proteinG: ing.proteinG,
        fatG: ing.fatG,
        fiberG: ing.fiberG,
        confidenceScore: 0.85,
        source: 'ai_detected' as const,
      }))

      // Create ingredients for this photo
      await prisma.foodIngredient.createMany({
        data: ingredients,
      })

      // Calculate totals for this photo
      const photoCalories = analysisResult.ingredients.reduce((sum, ing) => sum + ing.calories, 0)
      const photoCarbsG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.carbsG, 0)
      const photoProteinG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.proteinG, 0)
      const photoFatG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.fatG, 0)
      const photoFiberG = analysisResult.ingredients.reduce((sum, ing) => sum + ing.fiberG, 0)

      // Get ALL ingredients for this meal (across all photos)
      const allIngredients = await prisma.foodIngredient.findMany({
        where: { foodEntryId },
      })

      // Calculate meal totals (sum across all dishes)
      const totalCalories = allIngredients.reduce((sum, ing) => sum + ing.calories, 0)
      const totalCarbsG = allIngredients.reduce((sum, ing) => sum + ing.carbsG, 0)
      const totalProteinG = allIngredients.reduce((sum, ing) => sum + ing.proteinG, 0)
      const totalFatG = allIngredients.reduce((sum, ing) => sum + ing.fatG, 0)
      const totalFiberG = allIngredients.reduce((sum, ing) => sum + ing.fiberG, 0)

      // Update FoodEntry with combined totals
      await prisma.foodEntry.update({
        where: { id: foodEntryId },
        data: {
          totalCalories,
          totalCarbsG,
          totalProteinG,
          totalFatG,
          totalFiberG,
        },
      })

      // Update this photo's status to completed
      await prisma.foodPhoto.update({
        where: { id: foodPhotoId },
        data: {
          analysisStatus: 'completed',
          analysisCompletedAt: new Date(),
        },
      })

      console.log(`[FOOD ANALYSIS] ✓ Successfully analyzed photo ${foodPhotoId}: ${photoCalories} kcal`)
    } else {
      // Analysis failed - mark this photo as failed
      await prisma.foodPhoto.update({
        where: { id: foodPhotoId },
        data: {
          analysisStatus: 'failed',
          analysisCompletedAt: new Date(),
        },
      })

      console.error(`[FOOD ANALYSIS] ✗ Analysis failed for photo ${foodPhotoId}:`, analysisResult.error)
    }
  } catch (error) {
    console.error(`[FOOD ANALYSIS] ✗ Exception during analysis for photo ${foodPhotoId}:`, error)

    // Mark this photo as failed on exception
    try {
      await prisma.foodPhoto.update({
        where: { id: foodPhotoId },
        data: {
          analysisStatus: 'failed',
          analysisCompletedAt: new Date(),
        },
      })
    } catch (updateError) {
      console.error(`[FOOD ANALYSIS] Failed to update photo status to failed:`, updateError)
    }
  }
}

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
    const mealType = formData.get('mealType') as string | null

    // Collect all photos (support both single 'photo' and multiple 'photo1', 'photo2', etc.)
    const photos: File[] = []
    const singlePhoto = formData.get('photo') as File | null
    if (singlePhoto) {
      photos.push(singlePhoto)
    } else {
      // Try numbered photos (photo1, photo2, etc.)
      let index = 1
      while (index <= 5) {
        const photo = formData.get(`photo${index}`) as File | null
        if (photo) {
          photos.push(photo)
        }
        index++
      }
    }

    // Validate required fields
    if (photos.length === 0) {
      return NextResponse.json(
        { error: 'At least one photo is required' },
        { status: 400 }
      )
    }

    if (!mealType || !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return NextResponse.json(
        { error: 'Valid mealType is required (breakfast, lunch, dinner, snack)' },
        { status: 400 }
      )
    }

    // Validate each photo
    for (const photo of photos) {
      // Validate file size (5MB max per photo)
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Each photo must be less than 5MB' },
          { status: 413 }
        )
      }

      // Validate MIME type
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'All files must be images (JPEG, PNG, WebP)' },
          { status: 415 }
        )
      }
    }

    // Validate total size (15MB max for all photos)
    const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0)
    if (totalSize > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Total photo size must be less than 15MB' },
        { status: 413 }
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

    // Upload all photos to Supabase Storage
    const timestamp = Date.now()
    const uploadedPhotos: Array<{ storagePath: string; originalSizeBytes: number; publicUrl: string }> = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const fileExt = photo.name.split('.').pop() || 'jpg'
      const storagePath = `${person.id}/meals/${timestamp}-${i + 1}.${fileExt}`

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
          { error: `Failed to upload photo ${i + 1} to storage` },
          { status: 500 }
        )
      }

      // Generate public URL for the photo
      const { data: urlData } = supabase.storage
        .from('food-photos')
        .getPublicUrl(storagePath)

      const publicUrl = urlData.publicUrl
      uploadedPhotos.push({
        storagePath,
        originalSizeBytes: photo.size,
        publicUrl,
      })

      console.log(`[FOOD UPLOAD] Photo ${i + 1} uploaded to storage: ${storagePath}`)
    }

    // Create FoodEntry with all photos
    // Note: Don't include ingredients here - they'll be created later during analysis
    const foodEntry = await prisma.foodEntry.create({
      data: {
        personId: person.id,
        timestamp: new Date(),
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        totalCalories: 0,
        totalCarbsG: 0,
        totalProteinG: 0,
        totalFatG: 0,
        totalFiberG: 0,
        photos: {
          create: uploadedPhotos.map(photo => ({
            storagePath: photo.storagePath,
            originalSizeBytes: photo.originalSizeBytes,
            analysisStatus: 'pending',
            analysisCompletedAt: null,
          })),
        },
      },
      include: {
        photos: true,
      },
    })

    console.log(`[FOOD UPLOAD] FoodEntry created with ID: ${foodEntry.id}, ${uploadedPhotos.length} photo(s)`)

    // Start analysis in background for ALL photos (multi-dish support)
    const useGemini = process.env.USE_GEMINI_FOOD_ANALYSIS === 'true'
    console.log(`[FOOD UPLOAD] Starting background analysis for ${uploadedPhotos.length} photo(s) (Provider: ${useGemini ? 'Gemini' : 'OpenAI'})`)

    // Fire-and-forget analysis for each photo separately (will complete after response is sent)
    foodEntry.photos.forEach((photo, index) => {
      analyzeSinglePhoto(
        foodEntry.id,
        photo.id,
        uploadedPhotos[index].publicUrl,
        useGemini,
        prisma
      ).catch(error => {
        console.error(`[FOOD UPLOAD] Background analysis failed for photo ${photo.id}:`, error)
      })
    })

    return NextResponse.json(
      {
        foodEntryId: foodEntry.id,
        photoUrls: uploadedPhotos.map(p => p.publicUrl),
        mealType: foodEntry.mealType,
        timestamp: foodEntry.timestamp.toISOString(),
        analysisStatus: 'pending',
        ingredients: [],
        totalCalories: 0,
        totalCarbsG: 0,
        totalProteinG: 0,
        totalFatG: 0,
        totalFiberG: 0,
        disclaimer: "AI-generated food analysis is an estimate and may not be fully accurate. Nutrition information is for general informational purposes only and should not be used for medical treatment, insulin dosing, or diagnosis. Always consult your healthcare provider for medical advice.",
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
      disclaimer: "AI-generated food analysis is an estimate and may not be fully accurate. Nutrition information is for general informational purposes only and should not be used for medical treatment, insulin dosing, or diagnosis. Always consult your healthcare provider for medical advice.",
    })
  } catch (error) {
    console.error('Food list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
