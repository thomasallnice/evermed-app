import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

// Validation schema for updating meal template
const PatchTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    calories: z.number(),
    carbsG: z.number(),
    proteinG: z.number(),
    fatG: z.number(),
    fiberG: z.number(),
  })).optional(),
  nutritionTotals: z.object({
    calories: z.number(),
    carbs: z.number(),
    protein: z.number(),
    fat: z.number(),
    fiber: z.number(),
  }).optional(),
  incrementUsage: z.boolean().optional(), // Special flag to increment usage count
})

/**
 * GET /api/metabolic/templates/[id]
 *
 * Retrieve a single meal template by ID
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Response (200):
 * {
 *   template: {
 *     id: string,
 *     name: string,
 *     description: string | null,
 *     ingredients: Array<Ingredient>,
 *     nutritionTotals: NutritionTotals,
 *     usageCount: number,
 *     lastUsedAt: string | null,
 *     createdAt: string,
 *     updatedAt: string
 *   }
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 403: Template belongs to different user
 * - 404: Template not found or Person record not found
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
        { error: 'Person record not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Get template
    const template = await prisma.mealTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (template.personId !== person.id) {
      return NextResponse.json(
        { error: 'Forbidden: Template belongs to different user' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        ingredients: template.ingredients,
        nutritionTotals: template.nutritionTotals,
        usageCount: template.usageCount,
        lastUsedAt: template.lastUsedAt?.toISOString() || null,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[MEAL TEMPLATE] Get error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * PATCH /api/metabolic/templates/[id]
 *
 * Update a meal template
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Body (JSON):
 * - name?: string (1-100 chars)
 * - description?: string | null (max 500 chars)
 * - ingredients?: Array<Ingredient>
 * - nutritionTotals?: NutritionTotals
 * - incrementUsage?: boolean (if true, increments usageCount and updates lastUsedAt)
 *
 * Response (200):
 * {
 *   success: true,
 *   template: {
 *     id: string,
 *     name: string,
 *     description: string | null,
 *     ingredients: Array<Ingredient>,
 *     nutritionTotals: NutritionTotals,
 *     usageCount: number,
 *     lastUsedAt: string | null,
 *     createdAt: string,
 *     updatedAt: string
 *   }
 * }
 *
 * Errors:
 * - 400: Invalid request body
 * - 401: Unauthorized
 * - 403: Template belongs to different user
 * - 404: Template not found or Person record not found
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
        { error: 'Person record not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Get template
    const template = await prisma.mealTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (template.personId !== person.id) {
      return NextResponse.json(
        { error: 'Forbidden: Template belongs to different user' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = PatchTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { name, description, ingredients, nutritionTotals, incrementUsage } = validation.data

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (ingredients !== undefined) updateData.ingredients = ingredients
    if (nutritionTotals !== undefined) updateData.nutritionTotals = nutritionTotals

    // Handle usage increment
    if (incrementUsage) {
      updateData.usageCount = template.usageCount + 1
      updateData.lastUsedAt = new Date()
    }

    // Update template
    const updated = await prisma.mealTemplate.update({
      where: { id: params.id },
      data: updateData,
    })

    console.log(`[MEAL TEMPLATE] Updated template ${updated.id}: ${updated.name}`)

    return NextResponse.json({
      success: true,
      template: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        ingredients: updated.ingredients,
        nutritionTotals: updated.nutritionTotals,
        usageCount: updated.usageCount,
        lastUsedAt: updated.lastUsedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[MEAL TEMPLATE] Update error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * DELETE /api/metabolic/templates/[id]
 *
 * Delete a meal template
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Response (200):
 * {
 *   success: true,
 *   message: string
 * }
 *
 * Errors:
 * - 401: Unauthorized
 * - 403: Template belongs to different user
 * - 404: Template not found or Person record not found
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
        { error: 'Person record not found. Please complete onboarding.' },
        { status: 404 }
      )
    }

    // Get template
    const template = await prisma.mealTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (template.personId !== person.id) {
      return NextResponse.json(
        { error: 'Forbidden: Template belongs to different user' },
        { status: 403 }
      )
    }

    // Delete template
    await prisma.mealTemplate.delete({
      where: { id: params.id },
    })

    console.log(`[MEAL TEMPLATE] Deleted template ${params.id}: ${template.name}`)

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    })
  } catch (error: any) {
    console.error('[MEAL TEMPLATE] Delete error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
