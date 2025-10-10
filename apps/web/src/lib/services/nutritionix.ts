/**
 * Nutritionix API Client
 *
 * Purpose: Get detailed nutrition data for identified foods using natural
 * language parsing and branded food database.
 *
 * Authentication: x-app-id and x-app-key headers
 * Rate Limits: Varies by plan (typically 500-5000 requests/day)
 *
 * Error Handling:
 * - 400: Invalid query or malformed request
 * - 401: Invalid credentials
 * - 404: Food not found
 * - 429: Rate limit exceeded
 * - 500-504: Server errors (retryable)
 *
 * Retry Strategy: Exponential backoff with jitter, 3 attempts
 * Caching: In-memory cache with 24-hour TTL for common foods
 */

import { z } from 'zod';
import pRetry, { AbortError } from 'p-retry';
import Bottleneck from 'bottleneck';

// ============================================================================
// TypeScript Types & Zod Schemas
// ============================================================================

const NutrientSchema = z.object({
  attr_id: z.number(),
  value: z.number(),
});

const CommonFoodSchema = z.object({
  food_name: z.string(),
  serving_unit: z.string(),
  tag_name: z.string().optional(),
  serving_qty: z.number(),
  common_type: z.number().optional(),
  tag_id: z.string().optional(),
  photo: z
    .object({
      thumb: z.string().optional(),
      highres: z.string().optional(),
    })
    .optional(),
  locale: z.string().optional(),
});

const BrandedFoodSchema = z.object({
  food_name: z.string(),
  serving_unit: z.string(),
  nix_brand_id: z.string(),
  brand_name_item_name: z.string().optional(),
  serving_qty: z.number(),
  nf_calories: z.number(),
  photo: z
    .object({
      thumb: z.string().optional(),
      highres: z.string().optional(),
    })
    .optional(),
  brand_name: z.string().optional(),
  brand_type: z.number().optional(),
  nix_item_id: z.string().optional(),
});

const InstantSearchResponseSchema = z.object({
  common: z.array(CommonFoodSchema).optional(),
  branded: z.array(BrandedFoodSchema).optional(),
});

const NutritionDetailSchema = z.object({
  food_name: z.string(),
  brand_name: z.string().optional(),
  serving_qty: z.number(),
  serving_unit: z.string(),
  serving_weight_grams: z.number().optional(),
  nf_calories: z.number(),
  nf_total_fat: z.number(),
  nf_saturated_fat: z.number().optional(),
  nf_cholesterol: z.number().optional(),
  nf_sodium: z.number().optional(),
  nf_total_carbohydrate: z.number(),
  nf_dietary_fiber: z.number().optional(),
  nf_sugars: z.number().optional(),
  nf_protein: z.number(),
  nf_potassium: z.number().optional(),
  full_nutrients: z.array(NutrientSchema).optional(),
  photo: z
    .object({
      thumb: z.string().optional(),
      highres: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  alt_measures: z
    .array(
      z.object({
        serving_weight: z.number(),
        measure: z.string(),
        qty: z.number(),
      })
    )
    .optional(),
});

const NaturalNutrientsResponseSchema = z.object({
  foods: z.array(NutritionDetailSchema),
});

export type CommonFood = z.infer<typeof CommonFoodSchema>;
export type BrandedFood = z.infer<typeof BrandedFoodSchema>;
export type InstantSearchResponse = z.infer<typeof InstantSearchResponseSchema>;
export type NutritionDetail = z.infer<typeof NutritionDetailSchema>;
export type NaturalNutrientsResponse = z.infer<typeof NaturalNutrientsResponseSchema>;

export interface NutritionSummary {
  foodName: string;
  brandName?: string;
  servingQty: number;
  servingUnit: string;
  servingWeightGrams?: number;
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams
  sodium?: number; // mg
  photoUrl?: string;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class NutritionixError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'NutritionixError';
  }
}

// ============================================================================
// In-Memory Cache
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Nutritionix API Client
// ============================================================================

export class NutritionixClient {
  private appId: string;
  private appKey: string;
  private baseUrl: string = 'https://trackapi.nutritionix.com/v2';
  private limiter: Bottleneck;
  private nutritionCache: SimpleCache<NutritionSummary[]>;
  private searchCache: SimpleCache<InstantSearchResponse>;

  constructor(config: { appId: string; appKey: string }) {
    if (!config.appId || !config.appKey) {
      throw new NutritionixError(
        'Missing Nutritionix credentials',
        'MISSING_CREDENTIALS',
        undefined,
        false
      );
    }

    this.appId = config.appId;
    this.appKey = config.appKey;

    // Rate limiter: Conservative approach
    // Typical plans: 500-5000 req/day = ~0.3-3.5 req/sec
    // Set to 2 req/sec with burst capacity
    this.limiter = new Bottleneck({
      maxConcurrent: 2,
      minTime: 500, // 500ms between requests = 2 req/sec
      reservoir: 50, // Burst: 50 requests
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60 * 1000, // per minute
    });

    // Caches with 24-hour TTL
    this.nutritionCache = new SimpleCache<NutritionSummary[]>();
    this.searchCache = new SimpleCache<InstantSearchResponse>();
  }

  /**
   * Get detailed nutrition data for a food using natural language
   *
   * @param query - Natural language food query (e.g., "1 cup of rice", "medium apple")
   * @returns Array of nutrition summaries (may contain multiple foods)
   * @throws NutritionixError on API failures
   */
  async getNutrition(query: string): Promise<NutritionSummary[]> {
    if (!query || query.trim().length === 0) {
      throw new NutritionixError('Empty query', 'INVALID_QUERY', 400, false);
    }

    const normalizedQuery = query.trim().toLowerCase();

    // Check cache first
    const cached = this.nutritionCache.get(normalizedQuery);
    if (cached) {
      console.log('[Nutritionix] Cache hit for nutrition query', {
        query: normalizedQuery,
      });
      return cached;
    }

    console.log('[Nutritionix] Fetching nutrition data', {
      query: normalizedQuery,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await this.limiter.schedule(() =>
        this.makeNutritionRequest(query)
      );

      const summaries = this.parseNutritionResponse(response);

      // Cache result for 24 hours
      this.nutritionCache.set(normalizedQuery, summaries, 24 * 60 * 60 * 1000);

      return summaries;
    } catch (error) {
      console.error('[Nutritionix] Nutrition fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: normalizedQuery,
      });
      throw error;
    }
  }

  /**
   * Search for foods using instant search endpoint
   *
   * @param query - Search query (e.g., "pizza")
   * @returns Instant search results with common and branded foods
   * @throws NutritionixError on API failures
   */
  async searchFoods(query: string): Promise<InstantSearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new NutritionixError('Empty query', 'INVALID_QUERY', 400, false);
    }

    const normalizedQuery = query.trim().toLowerCase();

    // Check cache first
    const cached = this.searchCache.get(normalizedQuery);
    if (cached) {
      console.log('[Nutritionix] Cache hit for search query', {
        query: normalizedQuery,
      });
      return cached;
    }

    console.log('[Nutritionix] Searching foods', {
      query: normalizedQuery,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await this.limiter.schedule(() =>
        this.makeSearchRequest(query)
      );

      // Cache result for 24 hours
      this.searchCache.set(normalizedQuery, response, 24 * 60 * 60 * 1000);

      return response;
    } catch (error) {
      console.error('[Nutritionix] Search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: normalizedQuery,
      });
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.nutritionCache.clear();
    this.searchCache.clear();
    console.log('[Nutritionix] Cache cleared');
  }

  /**
   * Make natural nutrients API request with retry logic
   */
  private async makeNutritionRequest(
    query: string
  ): Promise<NaturalNutrientsResponse> {
    return pRetry(
      async () => {
        const url = `${this.baseUrl}/natural/nutrients`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': this.appId,
            'x-app-key': this.appKey,
          },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          const statusCode = response.status;

          // Retryable errors: 429, 500-504
          if (statusCode === 429 || statusCode >= 500) {
            throw new NutritionixError(
              `Nutritionix API error: ${statusCode} - ${errorText}`,
              'API_ERROR',
              statusCode,
              true
            );
          }

          // Non-retryable errors: 400, 401, 403, 404
          const errorCode =
            statusCode === 401
              ? 'INVALID_CREDENTIALS'
              : statusCode === 404
                ? 'FOOD_NOT_FOUND'
                : 'API_ERROR';

          const error = new NutritionixError(
            `Nutritionix API error: ${statusCode} - ${errorText}`,
            errorCode,
            statusCode,
            false
          );
          throw new AbortError(error.message);
        }

        const data = await response.json();

        // Validate response schema
        const validatedData = NaturalNutrientsResponseSchema.parse(data);

        return validatedData;
      },
      {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true,
        onFailedAttempt: (error) => {
          console.warn('[Nutritionix] Retry attempt', {
            attemptNumber: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        },
      }
    );
  }

  /**
   * Make instant search API request with retry logic
   */
  private async makeSearchRequest(
    query: string
  ): Promise<InstantSearchResponse> {
    return pRetry(
      async () => {
        const url = `${this.baseUrl}/search/instant?query=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-app-id': this.appId,
            'x-app-key': this.appKey,
          },
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          const statusCode = response.status;

          // Retryable errors: 429, 500-504
          if (statusCode === 429 || statusCode >= 500) {
            throw new NutritionixError(
              `Nutritionix API error: ${statusCode} - ${errorText}`,
              'API_ERROR',
              statusCode,
              true
            );
          }

          // Non-retryable errors
          const errorCode = statusCode === 401 ? 'INVALID_CREDENTIALS' : 'API_ERROR';

          const error = new NutritionixError(
            `Nutritionix API error: ${statusCode} - ${errorText}`,
            errorCode,
            statusCode,
            false
          );
          throw new AbortError(error.message);
        }

        const data = await response.json();

        // Validate response schema
        const validatedData = InstantSearchResponseSchema.parse(data);

        return validatedData;
      },
      {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true,
        onFailedAttempt: (error) => {
          console.warn('[Nutritionix] Retry attempt', {
            attemptNumber: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        },
      }
    );
  }

  /**
   * Parse natural nutrients response into simplified summaries
   */
  private parseNutritionResponse(
    response: NaturalNutrientsResponse
  ): NutritionSummary[] {
    return response.foods.map((food) => ({
      foodName: food.food_name,
      brandName: food.brand_name,
      servingQty: food.serving_qty,
      servingUnit: food.serving_unit,
      servingWeightGrams: food.serving_weight_grams,
      calories: food.nf_calories,
      protein: food.nf_protein,
      carbs: food.nf_total_carbohydrate,
      fat: food.nf_total_fat,
      fiber: food.nf_dietary_fiber,
      sugar: food.nf_sugars,
      sodium: food.nf_sodium,
      photoUrl: food.photo?.highres || food.photo?.thumb,
    }));
  }
}

// ============================================================================
// Factory Function with Mock Support
// ============================================================================

/**
 * Create Nutritionix client (production or mock)
 *
 * Set USE_MOCK_APIS=true to use mock implementation
 */
export function createNutritionixClient(): NutritionixClient | any {
  // Check if mock mode is enabled
  if (process.env.USE_MOCK_APIS === 'true') {
    console.log('[Nutritionix] Using mock implementation (USE_MOCK_APIS=true)');
    // Import mock dynamically to avoid bundling in production
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MockNutritionixClient } = require('../../../../../tests/mocks/nutritionix-mock');
    return new MockNutritionixClient();
  }

  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_APP_KEY;

  if (!appId || !appKey) {
    throw new Error(
      'Missing NUTRITIONIX_APP_ID or NUTRITIONIX_APP_KEY environment variables. ' +
        'Set these in .env.local for development or Vercel environment variables for production.'
    );
  }

  return new NutritionixClient({ appId, appKey });
}
