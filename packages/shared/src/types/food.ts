/**
 * Food and Nutrition Types for EverMed
 * Shared between web and mobile apps
 */

// ============================================================================
// ENUMS (match Prisma schema)
// ============================================================================

/**
 * Meal type classification
 */
export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

/**
 * Analysis status for food photo processing
 */
export enum AnalysisStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Source of ingredient data
 */
export enum IngredientSource {
  AI_DETECTED = 'ai_detected',
  MANUAL_ENTRY = 'manual_entry',
  NUTRITION_API = 'nutrition_api',
}

// ============================================================================
// NUTRITION DATA
// ============================================================================

/**
 * Nutritional information for a single ingredient
 */
export interface FoodIngredientData {
  name: string
  quantity: number | null
  unit: string | null
  calories: number
  carbsG: number
  proteinG: number
  fatG: number
  fiberG: number
}

/**
 * Nutritional totals for a dish or meal
 */
export interface NutritionTotals {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

// ============================================================================
// MULTI-DISH SUPPORT (iOS Week 6.5)
// ============================================================================

/**
 * Represents a single dish in a multi-dish meal
 * Used when a meal has multiple photos (1-5 photos per meal)
 */
export interface Dish {
  /** Photo number (1-5) */
  dishNumber: number

  /** Photo ID from FoodPhoto table */
  photoId?: string

  /** Local photo URI (mobile only, before upload) */
  photoUri?: string

  /** Food items detected in this dish */
  foodItems: string[]

  /** Individual ingredients with nutrition data */
  ingredients: FoodIngredientData[]

  /** Aggregated nutrition for this dish */
  nutrition: NutritionTotals

  /** AI analysis status */
  analysisStatus: AnalysisStatus

  /** Optional error message if analysis failed */
  analysisError?: string
}

/**
 * Complete meal entry with multi-dish support
 * Used for creating/editing meals in mobile and web apps
 */
export interface MealEntry {
  /** Meal entry ID (from FoodEntry table) */
  id?: string

  /** User/Person ID */
  userId: string

  /** Meal timestamp */
  timestamp: Date

  /** Meal type */
  mealType: MealType

  /** Optional meal notes */
  notes?: string

  /** Array of dishes (1-5 dishes per meal) */
  dishes: Dish[]

  /** Total nutrition across all dishes */
  totalNutrition: NutritionTotals

  /** Number of photos in this meal */
  photoCount: number

  /** Predicted glucose peak (mg/dL) */
  predictedGlucosePeak?: number

  /** Actual glucose peak (mg/dL) - measured post-meal */
  actualGlucosePeak?: number

  /** Created timestamp */
  createdAt?: Date

  /** Updated timestamp */
  updatedAt?: Date
}

// ============================================================================
// AI FOOD ANALYSIS
// ============================================================================

/**
 * Result from AI food photo analysis (OpenAI Vision or Gemini)
 */
export interface FoodAnalysisResult {
  success: boolean
  ingredients: FoodIngredientData[]
  error?: string
  metadata?: {
    provider: 'openai' | 'gemini'
    model: string
    responseTimeMs: number
    retryCount: number
    estimatedCostUSD: number
  }
}

/**
 * Request payload for multi-photo meal upload (iOS Week 6.5)
 */
export interface MultiPhotoMealUploadRequest {
  mealType: MealType
  timestamp: string // ISO 8601
  notes?: string
  // Photos are uploaded separately as multipart/form-data
  // with keys: photo-1, photo-2, photo-3, etc.
}

/**
 * Response from multi-photo meal upload
 */
export interface MultiPhotoMealUploadResponse {
  success: boolean
  mealId: string
  dishes: Array<{
    dishNumber: number
    photoId: string
    analysisStatus: AnalysisStatus
  }>
  totalNutrition: NutritionTotals
  error?: string
}

// ============================================================================
// MEAL EDITING (iOS Week 7.5)
// ============================================================================

/**
 * Request payload for editing meal ingredients
 */
export interface MealEditRequest {
  mealId: string
  notes?: string
  dishes?: Array<{
    dishNumber: number
    ingredients: Array<{
      name: string
      quantity: number
      unit: string
      calories: number
      carbsG: number
      proteinG: number
      fatG: number
      fiberG: number
    }>
  }>
}

/**
 * Response from meal edit
 */
export interface MealEditResponse {
  success: boolean
  mealId: string
  updatedNutrition: NutritionTotals
  error?: string
}

// ============================================================================
// FOOD TEMPLATES (Reusable Recipes)
// ============================================================================

/**
 * Saved meal template for quick logging
 */
export interface MealTemplate {
  id: string
  userId: string
  name: string
  description?: string
  ingredients: FoodIngredientData[]
  totalNutrition: NutritionTotals
  usageCount: number
  lastUsedAt?: Date
  createdAt: Date
}

/**
 * Request to create meal template from existing meal
 */
export interface CreateMealTemplateRequest {
  mealId: string
  name: string
  description?: string
}

/**
 * Response from creating meal template
 */
export interface CreateMealTemplateResponse {
  success: boolean
  templateId: string
  error?: string
}

// ============================================================================
// FOOD PHOTO METADATA
// ============================================================================

/**
 * Food photo metadata (corresponds to FoodPhoto table)
 */
export interface FoodPhotoMetadata {
  id: string
  foodEntryId: string
  storagePath: string
  thumbnailPath?: string
  originalSizeBytes: number
  analysisStatus: AnalysisStatus
  analysisCompletedAt?: Date
  createdAt: Date
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid MealType
 */
export function isMealType(value: any): value is MealType {
  return Object.values(MealType).includes(value)
}

/**
 * Type guard to check if a value is a valid AnalysisStatus
 */
export function isAnalysisStatus(value: any): value is AnalysisStatus {
  return Object.values(AnalysisStatus).includes(value)
}

/**
 * Type guard to check if a value is a valid IngredientSource
 */
export function isIngredientSource(value: any): value is IngredientSource {
  return Object.values(IngredientSource).includes(value)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate total nutrition from multiple dishes
 */
export function calculateTotalNutrition(dishes: Dish[]): NutritionTotals {
  return dishes.reduce(
    (totals, dish) => ({
      calories: totals.calories + dish.nutrition.calories,
      protein: totals.protein + dish.nutrition.protein,
      carbs: totals.carbs + dish.nutrition.carbs,
      fat: totals.fat + dish.nutrition.fat,
      fiber: (totals.fiber || 0) + (dish.nutrition.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}

/**
 * Calculate nutrition totals from ingredients
 */
export function calculateNutritionFromIngredients(
  ingredients: FoodIngredientData[]
): NutritionTotals {
  return ingredients.reduce(
    (totals, ingredient) => ({
      calories: totals.calories + ingredient.calories,
      protein: totals.protein + ingredient.proteinG,
      carbs: totals.carbs + ingredient.carbsG,
      fat: totals.fat + ingredient.fatG,
      fiber: totals.fiber + ingredient.fiberG,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}

/**
 * Format meal type for display
 */
export function formatMealType(mealType: MealType): string {
  const labels: Record<MealType, string> = {
    [MealType.BREAKFAST]: 'Breakfast',
    [MealType.LUNCH]: 'Lunch',
    [MealType.DINNER]: 'Dinner',
    [MealType.SNACK]: 'Snack',
  }
  return labels[mealType] || mealType
}

/**
 * Get emoji for meal type
 */
export function getMealTypeEmoji(mealType: MealType): string {
  const emojis: Record<MealType, string> = {
    [MealType.BREAKFAST]: '🌅',
    [MealType.LUNCH]: '☀️',
    [MealType.DINNER]: '🌙',
    [MealType.SNACK]: '🍎',
  }
  return emojis[mealType] || '🍽️'
}

/**
 * Get display color for analysis status
 */
export function getAnalysisStatusColor(status: AnalysisStatus): string {
  const colors: Record<AnalysisStatus, string> = {
    [AnalysisStatus.PENDING]: '#FFA500', // Orange
    [AnalysisStatus.COMPLETED]: '#22C55E', // Green
    [AnalysisStatus.FAILED]: '#EF4444', // Red
  }
  return colors[status] || '#6B7280' // Gray fallback
}
