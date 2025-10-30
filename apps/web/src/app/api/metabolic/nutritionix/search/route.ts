import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { z } from 'zod';
import { createNutritionixClient, NutritionixError } from '@/lib/services/nutritionix';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

// Validation schema for request body
const SearchRequestSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(100, 'Query must be less than 100 characters')
    .trim(),
});

// Transformed response type for mobile app
interface NutritionixSearchResult {
  name: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  totalCarbs: number;
  protein: number;
  totalFat: number;
  dietaryFiber: number;
  isCommon: boolean;
  photoUrl?: string;
}

/**
 * POST /api/metabolic/nutritionix/search
 *
 * Search for foods in the Nutritionix database (800,000+ foods)
 *
 * Headers:
 * - authorization: Bearer <supabase-token> (mobile) or Supabase session (web)
 * - x-user-id: <user-id> (dev only)
 *
 * Body (JSON):
 * {
 *   "query": "apple" // 1-100 characters
 * }
 *
 * Response (200):
 * {
 *   "results": [
 *     {
 *       "name": "Apple",
 *       "brandName": null,
 *       "servingQty": 1,
 *       "servingUnit": "medium apple",
 *       "calories": 95,
 *       "totalCarbs": 25,
 *       "protein": 0.5,
 *       "totalFat": 0.3,
 *       "dietaryFiber": 4.4,
 *       "isCommon": true,
 *       "photoUrl": "https://..."
 *     }
 *   ]
 * }
 *
 * Errors:
 * - 400: Invalid request body (empty query, too long)
 * - 401: Unauthorized (missing or invalid credentials)
 * - 429: Rate limit exceeded (Nutritionix API quota)
 * - 500: Internal server error (Nutritionix API failure)
 *
 * Notes:
 * - Results are cached for 24 hours to reduce API calls
 * - Nutritionix handles fuzzy matching (e.g., "appl" → "apple")
 * - Results include both common foods (generic) and branded foods
 * - API keys are stored securely on backend (never exposed to mobile)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    let userId: string;
    try {
      userId = await requireUserId(request);
      console.log('[NUTRITIONIX SEARCH] User authenticated:', userId);
    } catch (error) {
      console.error('[NUTRITIONIX SEARCH] Authentication failed:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error('[NUTRITIONIX SEARCH] Invalid JSON body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate request body
    const validationResult = SearchRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => err.message);
      console.warn('[NUTRITIONIX SEARCH] Validation failed:', errors);
      return NextResponse.json(
        { error: 'Invalid request', details: errors },
        { status: 400 }
      );
    }

    const { query } = validationResult.data;
    console.log('[NUTRITIONIX SEARCH] Searching for:', query);

    // Create Nutritionix client (uses real or mock based on env)
    const nutritionixClient = createNutritionixClient();

    // Perform search
    const searchResponse = await nutritionixClient.searchFoods(query);

    // Transform response to unified format
    const results: NutritionixSearchResult[] = [];

    // Add common foods (generic foods like "apple", "chicken")
    if (searchResponse.common && searchResponse.common.length > 0) {
      for (const food of searchResponse.common) {
        // For common foods, we need to fetch detailed nutrition data
        // Common foods from instant search don't include nutrition details
        try {
          const nutritionData = await nutritionixClient.getNutrition(food.food_name);
          if (nutritionData.length > 0) {
            const nutrition = nutritionData[0]; // Take first result
            results.push({
              name: nutrition.foodName,
              brandName: nutrition.brandName || null,
              servingQty: nutrition.servingQty,
              servingUnit: nutrition.servingUnit,
              calories: Math.round(nutrition.calories),
              totalCarbs: Math.round(nutrition.carbs),
              protein: Math.round(nutrition.protein),
              totalFat: Math.round(nutrition.fat),
              dietaryFiber: Math.round(nutrition.fiber || 0),
              isCommon: true,
              photoUrl: nutrition.photoUrl || food.photo?.thumb,
            });
          }
        } catch (error) {
          // Skip this food if nutrition fetch fails
          console.warn('[NUTRITIONIX SEARCH] Failed to fetch nutrition for common food:', food.food_name, error);
          continue;
        }
      }
    }

    // Add branded foods (branded products like "Coke", "Doritos")
    if (searchResponse.branded && searchResponse.branded.length > 0) {
      for (const food of searchResponse.branded) {
        // Branded foods from instant search include basic nutrition
        results.push({
          name: food.food_name,
          brandName: food.brand_name || null,
          servingQty: food.serving_qty,
          servingUnit: food.serving_unit,
          calories: Math.round(food.nf_calories || 0),
          totalCarbs: 0, // Instant search doesn't provide macros for branded foods
          protein: 0,
          totalFat: 0,
          dietaryFiber: 0,
          isCommon: false,
          photoUrl: food.photo?.thumb,
        });
      }
    }

    const elapsedMs = Date.now() - startTime;

    console.log('[NUTRITIONIX SEARCH] Search completed:', {
      query,
      resultsCount: results.length,
      commonFoods: searchResponse.common?.length || 0,
      brandedFoods: searchResponse.branded?.length || 0,
      elapsedMs,
      userId: userId.substring(0, 8), // Log partial ID for privacy
    });

    return NextResponse.json({
      results,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startTime;

    // Handle Nutritionix-specific errors
    if (error instanceof NutritionixError) {
      console.error('[NUTRITIONIX SEARCH] Nutritionix error:', {
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        retryable: error.retryable,
        elapsedMs,
      });

      // Return appropriate HTTP status
      if (error.statusCode === 401) {
        return NextResponse.json(
          { error: 'Nutritionix API authentication failed' },
          { status: 500 } // Don't expose API credentials issue to client
        );
      }

      if (error.statusCode === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.statusCode && error.statusCode >= 500) {
        return NextResponse.json(
          { error: 'Nutritionix API temporarily unavailable' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to search foods' },
        { status: 500 }
      );
    }

    // Handle generic errors
    console.error('[NUTRITIONIX SEARCH] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
