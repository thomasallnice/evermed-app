import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

/**
 * GET /api/metabolic/food/[id]
 *
 * Get a single food entry by ID
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Response (200):
 * {
 *   id: string,
 *   mealType: string,
 *   timestamp: string,
 *   photoUrl: string,
 *   analysisStatus: 'pending' | 'completed' | 'failed',
 *   ingredients: Array<{
 *     id: string,
 *     name: string,
 *     quantity: number | null,
 *     unit: string | null,
 *     calories: number,
 *     carbsG: number,
 *     proteinG: number,
 *     fatG: number,
 *     fiberG: number
 *   }>,
 *   totalCalories: number,
 *   totalCarbsG: number,
 *   totalProteinG: number,
 *   totalFatG: number,
 *   totalFiberG: number
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 404: Entry not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'Person record not found' },
        { status: 404 }
      )
    }

    // Query food entry by ID with RLS (personId filter) - MULTI-DISH VERSION
    const entry = await prisma.foodEntry.findFirst({
      where: {
        id: params.id,
        personId: person.id, // RLS: ensure user owns this entry
      },
      include: {
        photos: {
          select: {
            id: true,
            storagePath: true,
            analysisStatus: true,
            analysisCompletedAt: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc', // Order dishes by upload order
          },
        },
        ingredients: {
          select: {
            id: true,
            foodPhotoId: true, // Include photo link
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
    })

    // Return 404 if not found
    if (!entry) {
      return NextResponse.json(
        { error: 'Food entry not found' },
        { status: 404 }
      )
    }

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

    // Build dishes array with ingredients grouped by photo
    const dishes = entry.photos.map((photo: any, index: number) => {
      const photoUrl = supabase.storage
        .from('food-photos')
        .getPublicUrl(photo.storagePath).data.publicUrl

      // Get ingredients for this specific photo/dish
      const dishIngredients = entry.ingredients
        .filter((ing: any) => ing.foodPhotoId === photo.id)
        .map((ing: any) => ({
          id: ing.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: ing.calories,
          carbsG: ing.carbsG,
          proteinG: ing.proteinG,
          fatG: ing.fatG,
          fiberG: ing.fiberG,
        }))

      // Calculate dish totals
      const dishCalories = dishIngredients.reduce((sum, ing) => sum + ing.calories, 0)
      const dishCarbsG = dishIngredients.reduce((sum, ing) => sum + ing.carbsG, 0)
      const dishProteinG = dishIngredients.reduce((sum, ing) => sum + ing.proteinG, 0)
      const dishFatG = dishIngredients.reduce((sum, ing) => sum + ing.fatG, 0)
      const dishFiberG = dishIngredients.reduce((sum, ing) => sum + ing.fiberG, 0)

      return {
        photoId: photo.id,
        photoUrl,
        dishNumber: index + 1,
        analysisStatus: photo.analysisStatus,
        analysisCompletedAt: photo.analysisCompletedAt?.toISOString() || null,
        ingredients: dishIngredients,
        totalCalories: dishCalories,
        totalCarbsG: dishCarbsG,
        totalProteinG: dishProteinG,
        totalFatG: dishFatG,
        totalFiberG: dishFiberG,
      }
    })

    // Get ingredients not linked to any photo (manually added)
    const manualIngredients = entry.ingredients
      .filter((ing: any) => !ing.foodPhotoId)
      .map((ing: any) => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        calories: ing.calories,
        carbsG: ing.carbsG,
        proteinG: ing.proteinG,
        fatG: ing.fatG,
        fiberG: ing.fiberG,
      }))

    // Determine overall analysis status
    const allCompleted = entry.photos.every((p: any) => p.analysisStatus === 'completed')
    const anyFailed = entry.photos.some((p: any) => p.analysisStatus === 'failed')
    const analysisStatus = anyFailed ? 'failed' : allCompleted ? 'completed' : 'pending'

    // Legacy photoUrl for backward compatibility (first photo)
    const photoUrl = entry.photos[0]
      ? supabase.storage
          .from('food-photos')
          .getPublicUrl(entry.photos[0].storagePath).data.publicUrl
      : null

    // Format response with multi-dish structure
    return NextResponse.json({
      id: entry.id,
      mealType: entry.mealType,
      timestamp: entry.timestamp.toISOString(),
      photoUrl, // Legacy: first photo URL
      analysisStatus, // Overall status
      dishes, // NEW: Array of dishes with per-dish breakdown
      manualIngredients, // NEW: Ingredients not linked to photos
      ingredients: entry.ingredients.map((ing: any) => ({ // Legacy flat list
        id: ing.id,
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
    })
  } catch (error) {
    console.error('Food entry fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/metabolic/food/[id]
 *
 * Delete a food entry and its associated photo from storage
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Response (200):
 * { success: true }
 *
 * Errors:
 * - 401: Unauthorized
 * - 404: Entry not found
 * - 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'Person record not found' },
        { status: 404 }
      )
    }

    // Query food entry to get storage paths before deletion
    const entry = await prisma.foodEntry.findFirst({
      where: {
        id: params.id,
        personId: person.id, // RLS: ensure user owns this entry
      },
      include: {
        photos: {
          select: {
            storagePath: true,
          },
        },
      },
    })

    // Return 404 if not found
    if (!entry) {
      return NextResponse.json(
        { error: 'Food entry not found' },
        { status: 404 }
      )
    }

    // Create Supabase client for storage deletion
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

    // Delete photo from storage (if exists)
    if (entry.photos.length > 0) {
      const storagePaths = entry.photos.map((p: any) => p.storagePath)
      const { error: storageError } = await supabase.storage
        .from('food-photos')
        .remove(storagePaths)

      if (storageError) {
        console.error('Failed to delete photos from storage:', storageError)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete food entry from database (cascade deletes photos and ingredients)
    await prisma.foodEntry.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Food entry deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/metabolic/food/[id]
 *
 * Update a food entry (edit ingredients manually)
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Body:
 * {
 *   mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack',
 *   ingredients?: Array<{
 *     id?: string, // If provided, update existing; if not, create new
 *     name: string,
 *     quantity: number,
 *     unit: string,
 *     calories: number,
 *     carbsG: number,
 *     proteinG: number,
 *     fatG: number,
 *     fiberG: number
 *   }>
 * }
 *
 * Response (200):
 * { success: true, entry: <updated entry> }
 *
 * Errors:
 * - 400: Invalid input
 * - 401: Unauthorized
 * - 404: Entry not found
 * - 500: Server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'Person record not found' },
        { status: 404 }
      )
    }

    // Verify entry exists and user owns it
    const entry = await prisma.foodEntry.findFirst({
      where: {
        id: params.id,
        personId: person.id, // RLS
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Food entry not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { mealType, ingredients } = body

    // Build update data
    const updateData: any = {}

    if (mealType) {
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
        return NextResponse.json(
          { error: 'Invalid mealType' },
          { status: 400 }
        )
      }
      updateData.mealType = mealType
    }

    // If ingredients are provided, update them
    if (ingredients && Array.isArray(ingredients)) {
      // Delete all existing ingredients and recreate
      await prisma.foodIngredient.deleteMany({
        where: {
          foodEntryId: params.id,
        },
      })

      // Create new ingredients
      updateData.ingredients = {
        create: ingredients.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          calories: ing.calories || 0,
          carbsG: ing.carbsG || 0,
          proteinG: ing.proteinG || 0,
          fatG: ing.fatG || 0,
          fiberG: ing.fiberG || 0,
          confidenceScore: 1.0, // Manual entry = 100% confidence
          source: 'manual_entry', // Required enum field
        })),
      }

      // Recalculate totals
      const totalCalories = ingredients.reduce(
        (sum: number, ing: any) => sum + (ing.calories || 0),
        0
      )
      const totalCarbsG = ingredients.reduce(
        (sum: number, ing: any) => sum + (ing.carbsG || 0),
        0
      )
      const totalProteinG = ingredients.reduce(
        (sum: number, ing: any) => sum + (ing.proteinG || 0),
        0
      )
      const totalFatG = ingredients.reduce(
        (sum: number, ing: any) => sum + (ing.fatG || 0),
        0
      )
      const totalFiberG = ingredients.reduce(
        (sum: number, ing: any) => sum + (ing.fiberG || 0),
        0
      )

      updateData.totalCalories = totalCalories
      updateData.totalCarbsG = totalCarbsG
      updateData.totalProteinG = totalProteinG
      updateData.totalFatG = totalFatG
      updateData.totalFiberG = totalFiberG
    }

    // Update entry
    const updatedEntry = await prisma.foodEntry.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        photos: true,
        ingredients: true,
      },
    })

    // Generate photo URL
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

    const photoUrl = updatedEntry.photos[0]
      ? supabase.storage
          .from('food-photos')
          .getPublicUrl(updatedEntry.photos[0].storagePath).data.publicUrl
      : null

    return NextResponse.json({
      success: true,
      entry: {
        id: updatedEntry.id,
        mealType: updatedEntry.mealType,
        timestamp: updatedEntry.timestamp.toISOString(),
        photoUrl,
        analysisStatus: updatedEntry.photos[0]?.analysisStatus || 'pending',
        ingredients: updatedEntry.ingredients,
        totalCalories: updatedEntry.totalCalories,
        totalCarbsG: updatedEntry.totalCarbsG,
        totalProteinG: updatedEntry.totalProteinG,
        totalFatG: updatedEntry.totalFatG,
        totalFiberG: updatedEntry.totalFiberG,
      },
    })
  } catch (error) {
    console.error('Food entry update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
