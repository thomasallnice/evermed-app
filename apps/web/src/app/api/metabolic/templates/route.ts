import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { requireUserId } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic'

// Validation schema for creating meal template
const PostTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    calories: z.number(),
    carbsG: z.number(),
    proteinG: z.number(),
    fatG: z.number(),
    fiberG: z.number(),
  })),
  nutritionTotals: z.object({
    calories: z.number(),
    carbs: z.number(),
    protein: z.number(),
    fat: z.number(),
    fiber: z.number(),
  }),
})

/**
 * POST /api/metabolic/templates
 *
 * Create a new meal template
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Body (JSON):
 * - name: string (required, 1-100 chars)
 * - description?: string (optional, max 500 chars)
 * - ingredients: Array<Ingredient> (required)
 * - nutritionTotals: NutritionTotals (required)
 *
 * Response (201):
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
 * - 400: Invalid input
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
    const validation = PostTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { name, description, ingredients, nutritionTotals } = validation.data

    // Create meal template
    const template = await prisma.mealTemplate.create({
      data: {
        personId: person.id,
        name,
        description: description || null,
        ingredients,
        nutritionTotals,
        usageCount: 0,
        lastUsedAt: null,
      },
    })

    console.log(`[MEAL TEMPLATE] Created template ${template.id} for person ${person.id}: ${name}`)

    return NextResponse.json(
      {
        success: true,
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
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[MEAL TEMPLATE] Create error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET /api/metabolic/templates
 *
 * List meal templates for the authenticated user
 *
 * Headers:
 * - x-user-id (dev) or Supabase session (prod)
 *
 * Query params:
 * - sortBy?: 'recent' | 'usage' | 'name' (default: 'recent')
 * - limit?: number (default: 50, max: 100)
 *
 * Response (200):
 * {
 *   templates: Array<{
 *     id: string,
 *     name: string,
 *     description: string | null,
 *     ingredients: Array<Ingredient>,
 *     nutritionTotals: NutritionTotals,
 *     usageCount: number,
 *     lastUsedAt: string | null,
 *     createdAt: string,
 *     updatedAt: string
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
    const sortBy = searchParams.get('sortBy') || 'recent'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 100.' },
        { status: 400 }
      )
    }

    // Validate sortBy
    if (!['recent', 'usage', 'name'].includes(sortBy)) {
      return NextResponse.json(
        { error: 'Invalid sortBy. Must be recent, usage, or name.' },
        { status: 400 }
      )
    }

    // Determine order by clause
    let orderBy: any
    switch (sortBy) {
      case 'recent':
        orderBy = { lastUsedAt: 'desc' }
        break
      case 'usage':
        orderBy = { usageCount: 'desc' }
        break
      case 'name':
        orderBy = { name: 'asc' }
        break
      default:
        orderBy = { lastUsedAt: 'desc' }
    }

    // Query meal templates
    const [templates, total] = await Promise.all([
      prisma.mealTemplate.findMany({
        where: {
          personId: person.id,
        },
        orderBy,
        take: limit,
      }),
      prisma.mealTemplate.count({
        where: {
          personId: person.id,
        },
      }),
    ])

    // Format response
    const formattedTemplates = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      ingredients: template.ingredients,
      nutritionTotals: template.nutritionTotals,
      usageCount: template.usageCount,
      lastUsedAt: template.lastUsedAt?.toISOString() || null,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      templates: formattedTemplates,
      total,
    })
  } catch (error: any) {
    console.error('[MEAL TEMPLATE] List error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
