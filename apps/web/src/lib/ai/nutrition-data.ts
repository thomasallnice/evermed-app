/**
 * Nutrition Data Service (Nutritionix API)
 *
 * Fetches nutritional information for ingredients.
 * Uses Nutritionix API for comprehensive nutrition database.
 *
 * Sprint 2: AI Integration
 */

export interface NutritionData {
  name: string
  quantity: number
  unit: string
  calories: number
  carbs: number // grams
  protein: number // grams
  fat: number // grams
  fiber: number // grams
  servingSize: string
  confidence: number
}

/**
 * Get nutrition data for an ingredient
 *
 * @param ingredient - Ingredient name (e.g., "apple", "chicken breast")
 * @param quantity - Quantity (e.g., 1, 2.5)
 * @param unit - Unit (e.g., "whole", "cup", "oz")
 * @returns Nutrition data for the ingredient
 */
export async function getNutritionData(
  ingredient: string,
  quantity: number = 1,
  unit: string = 'serving'
): Promise<NutritionData> {
  const NUTRITIONIX_APP_ID = process.env.NUTRITIONIX_APP_ID
  const NUTRITIONIX_API_KEY = process.env.NUTRITIONIX_API_KEY

  if (!NUTRITIONIX_APP_ID || !NUTRITIONIX_API_KEY) {
    // Return placeholder data for development
    console.warn('Nutritionix API keys not set, using placeholder data')
    return getPlaceholderNutrition(ingredient, quantity, unit)
  }

  try {
    // Build natural language query
    const query = `${quantity} ${unit} ${ingredient}`

    // Call Nutritionix Natural Language API
    const response = await fetch(
      'https://trackapi.nutritionix.com/v2/natural/nutrients',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-id': NUTRITIONIX_APP_ID,
          'x-app-key': NUTRITIONIX_API_KEY,
        },
        body: JSON.stringify({ query }),
      }
    )

    if (!response.ok) {
      throw new Error(`Nutritionix API error: ${response.statusText}`)
    }

    const data = await response.json()
    const food = data.foods[0]

    if (!food) {
      // Fallback to placeholder if no results
      return getPlaceholderNutrition(ingredient, quantity, unit)
    }

    return {
      name: food.food_name,
      quantity,
      unit,
      calories: food.nf_calories,
      carbs: food.nf_total_carbohydrate,
      protein: food.nf_protein,
      fat: food.nf_total_fat,
      fiber: food.nf_dietary_fiber || 0,
      servingSize: `${food.serving_qty} ${food.serving_unit}`,
      confidence: 0.9, // Nutritionix is generally very accurate
    }
  } catch (error) {
    console.error('Nutrition data error:', error)
    return getPlaceholderNutrition(ingredient, quantity, unit)
  }
}

/**
 * Get nutrition data for multiple ingredients
 *
 * @param ingredients - Array of ingredients
 * @returns Array of nutrition data
 */
export async function getBulkNutritionData(
  ingredients: Array<{ name: string; quantity: number; unit: string }>
): Promise<NutritionData[]> {
  return Promise.all(
    ingredients.map((ing) =>
      getNutritionData(ing.name, ing.quantity, ing.unit)
    )
  )
}

/**
 * Calculate total nutrition from multiple ingredients
 *
 * @param nutritionData - Array of nutrition data
 * @returns Total nutrition facts
 */
export function calculateTotalNutrition(nutritionData: NutritionData[]) {
  return nutritionData.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      carbs: total.carbs + item.carbs,
      protein: total.protein + item.protein,
      fat: total.fat + item.fat,
      fiber: total.fiber + item.fiber,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 }
  )
}

/**
 * Placeholder nutrition data for development
 */
function getPlaceholderNutrition(
  ingredient: string,
  quantity: number,
  unit: string
): NutritionData {
  // Basic nutrition estimates (very rough)
  const baseNutrition: Record<string, Partial<NutritionData>> = {
    apple: { calories: 95, carbs: 25, protein: 0.5, fat: 0.3, fiber: 4 },
    banana: { calories: 105, carbs: 27, protein: 1.3, fat: 0.4, fiber: 3 },
    chicken: { calories: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0 },
    rice: { calories: 130, carbs: 28, protein: 2.7, fat: 0.3, fiber: 0.4 },
    broccoli: { calories: 55, carbs: 11, protein: 3.7, fat: 0.6, fiber: 2.4 },
    salmon: { calories: 206, carbs: 0, protein: 22, fat: 13, fiber: 0 },
    bread: { calories: 79, carbs: 15, protein: 2.7, fat: 1, fiber: 0.8 },
    egg: { calories: 78, carbs: 0.6, protein: 6.3, fat: 5.3, fiber: 0 },
    milk: { calories: 42, carbs: 5, protein: 3.4, fat: 1, fiber: 0 },
  }

  const ingredientLower = ingredient.toLowerCase()
  const base = Object.keys(baseNutrition).find((key) =>
    ingredientLower.includes(key)
  )
  const nutrition = base ? baseNutrition[base] : {
    calories: 100,
    carbs: 15,
    protein: 5,
    fat: 3,
    fiber: 2,
  }

  return {
    name: ingredient,
    quantity,
    unit,
    calories: (nutrition.calories || 100) * quantity,
    carbs: (nutrition.carbs || 15) * quantity,
    protein: (nutrition.protein || 5) * quantity,
    fat: (nutrition.fat || 3) * quantity,
    fiber: (nutrition.fiber || 2) * quantity,
    servingSize: `${quantity} ${unit}`,
    confidence: 0.5, // Low confidence for placeholder data
  }
}
