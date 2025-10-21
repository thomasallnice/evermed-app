/**
 * Zod validation schemas for food and nutrition types
 * Used for API request/response validation and runtime type checking
 */

import { z } from 'zod'
import { MealType, AnalysisStatus, IngredientSource } from '../types/food'

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const mealTypeSchema = z.nativeEnum(MealType)

export const analysisStatusSchema = z.nativeEnum(AnalysisStatus)

export const ingredientSourceSchema = z.nativeEnum(IngredientSource)

// ============================================================================
// NUTRITION DATA SCHEMAS
// ============================================================================

export const foodIngredientDataSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().nonnegative().nullable(),
  unit: z.string().nullable(),
  calories: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative(),
})

export const nutritionTotalsSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
})

// ============================================================================
// MULTI-DISH SCHEMAS
// ============================================================================

export const dishSchema = z.object({
  dishNumber: z.number().int().min(1).max(5),
  photoId: z.string().uuid().optional(),
  photoUri: z.string().optional(),
  foodItems: z.array(z.string()),
  ingredients: z.array(foodIngredientDataSchema),
  nutrition: nutritionTotalsSchema,
  analysisStatus: analysisStatusSchema,
  analysisError: z.string().optional(),
})

export const mealEntrySchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  timestamp: z.coerce.date(),
  mealType: mealTypeSchema,
  notes: z.string().max(500).optional(),
  dishes: z.array(dishSchema).min(1).max(5),
  totalNutrition: nutritionTotalsSchema,
  photoCount: z.number().int().min(1).max(5),
  predictedGlucosePeak: z.number().positive().optional(),
  actualGlucosePeak: z.number().positive().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const multiPhotoMealUploadRequestSchema = z.object({
  mealType: mealTypeSchema,
  timestamp: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

export const multiPhotoMealUploadResponseSchema = z.object({
  success: z.boolean(),
  mealId: z.string().uuid(),
  dishes: z.array(
    z.object({
      dishNumber: z.number().int().min(1).max(5),
      photoId: z.string().uuid(),
      analysisStatus: analysisStatusSchema,
    })
  ),
  totalNutrition: nutritionTotalsSchema,
  error: z.string().optional(),
})

export const mealEditRequestSchema = z.object({
  mealId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  dishes: z
    .array(
      z.object({
        dishNumber: z.number().int().min(1).max(5),
        ingredients: z.array(
          z.object({
            name: z.string().min(1),
            quantity: z.number().nonnegative(),
            unit: z.string(),
            calories: z.number().nonnegative(),
            carbsG: z.number().nonnegative(),
            proteinG: z.number().nonnegative(),
            fatG: z.number().nonnegative(),
            fiberG: z.number().nonnegative(),
          })
        ),
      })
    )
    .optional(),
})

export const mealEditResponseSchema = z.object({
  success: z.boolean(),
  mealId: z.string().uuid(),
  updatedNutrition: nutritionTotalsSchema,
  error: z.string().optional(),
})

// ============================================================================
// FOOD TEMPLATE SCHEMAS
// ============================================================================

export const mealTemplateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  ingredients: z.array(foodIngredientDataSchema),
  totalNutrition: nutritionTotalsSchema,
  usageCount: z.number().int().nonnegative(),
  lastUsedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
})

export const createMealTemplateRequestSchema = z.object({
  mealId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

export const createMealTemplateResponseSchema = z.object({
  success: z.boolean(),
  templateId: z.string().uuid(),
  error: z.string().optional(),
})

// ============================================================================
// FOOD PHOTO METADATA SCHEMA
// ============================================================================

export const foodPhotoMetadataSchema = z.object({
  id: z.string().uuid(),
  foodEntryId: z.string().uuid(),
  storagePath: z.string(),
  thumbnailPath: z.string().optional(),
  originalSizeBytes: z.number().int().positive(),
  analysisStatus: analysisStatusSchema,
  analysisCompletedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
})

// ============================================================================
// AI ANALYSIS SCHEMAS
// ============================================================================

export const foodAnalysisResultSchema = z.object({
  success: z.boolean(),
  ingredients: z.array(foodIngredientDataSchema),
  error: z.string().optional(),
  metadata: z
    .object({
      provider: z.enum(['openai', 'gemini']),
      model: z.string(),
      responseTimeMs: z.number().nonnegative(),
      retryCount: z.number().int().nonnegative(),
      estimatedCostUSD: z.number().nonnegative(),
    })
    .optional(),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and parse meal type string
 */
export function parseMealType(value: unknown): MealType {
  return mealTypeSchema.parse(value)
}

/**
 * Validate and parse analysis status string
 */
export function parseAnalysisStatus(value: unknown): AnalysisStatus {
  return analysisStatusSchema.parse(value)
}

/**
 * Validate and parse ingredient source string
 */
export function parseIngredientSource(value: unknown): IngredientSource {
  return ingredientSourceSchema.parse(value)
}

/**
 * Safe parse with detailed error messages
 */
export function safeParseWithDetails<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors = result.error.errors.map(
    (err) => `${err.path.join('.')}: ${err.message}`
  )

  return { success: false, errors }
}
