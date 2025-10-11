import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

export interface FoodAnalysisResult {
  success: boolean
  ingredients: FoodIngredientData[]
  error?: string
}

/**
 * Analyze a food photo using OpenAI Vision API
 *
 * @param photoUrl - Public URL of the food photo
 * @returns Analysis result with ingredients and nutritional data
 */
export async function analyzeFoodPhoto(photoUrl: string): Promise<FoodAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a nutritional analysis assistant. Analyze food photos and provide detailed nutritional information in JSON format.

IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations.

Return a JSON object with this exact structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": estimated_quantity_number_or_null,
      "unit": "g" | "ml" | "piece" | "cup" | null,
      "calories": number,
      "carbsG": number,
      "proteinG": number,
      "fatG": number,
      "fiberG": number
    }
  ]
}

Rules:
- Identify all visible food items
- Estimate portion sizes realistically
- Provide accurate nutritional values per ingredient
- If you cannot determine quantity, set it to null
- All numerical values must be positive numbers (not strings)
- Return empty array if no food is visible`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this food photo and provide nutritional information for each ingredient. Return only JSON, no markdown.'
            },
            {
              type: 'image_url',
              image_url: {
                url: photoUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent results
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        success: false,
        ingredients: [],
        error: 'No response from AI'
      }
    }

    // Parse JSON response
    let analysisData: { ingredients: FoodIngredientData[] }
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()

      analysisData = JSON.parse(cleanedContent)
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content)
      return {
        success: false,
        ingredients: [],
        error: 'Invalid JSON response from AI'
      }
    }

    // Validate structure
    if (!analysisData.ingredients || !Array.isArray(analysisData.ingredients)) {
      return {
        success: false,
        ingredients: [],
        error: 'Invalid response structure'
      }
    }

    // Validate and sanitize ingredients
    const validatedIngredients = analysisData.ingredients
      .filter(ing => ing.name && typeof ing.name === 'string')
      .map(ing => ({
        name: ing.name.trim(),
        quantity: typeof ing.quantity === 'number' ? Math.max(0, ing.quantity) : null,
        unit: ing.unit && typeof ing.unit === 'string' ? ing.unit.trim() : null,
        calories: Math.max(0, Number(ing.calories) || 0),
        carbsG: Math.max(0, Number(ing.carbsG) || 0),
        proteinG: Math.max(0, Number(ing.proteinG) || 0),
        fatG: Math.max(0, Number(ing.fatG) || 0),
        fiberG: Math.max(0, Number(ing.fiberG) || 0),
      }))

    if (validatedIngredients.length === 0) {
      return {
        success: false,
        ingredients: [],
        error: 'No valid ingredients detected'
      }
    }

    return {
      success: true,
      ingredients: validatedIngredients
    }
  } catch (error: any) {
    console.error('Food analysis error:', error)
    return {
      success: false,
      ingredients: [],
      error: error.message || 'Analysis failed'
    }
  }
}
