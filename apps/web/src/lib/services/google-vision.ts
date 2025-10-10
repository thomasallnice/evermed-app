/**
 * Google Cloud Vision API Client
 *
 * Purpose: Analyze food photos to identify ingredients using label detection
 * and safe search filtering.
 *
 * Authentication: API key via GOOGLE_VISION_API_KEY environment variable
 * Rate Limits: 1,800 requests/minute (30 req/sec)
 *
 * Error Handling:
 * - 400: Malformed image or invalid request
 * - 403: Invalid or missing API key
 * - 429: Rate limit exceeded
 * - 500-504: Server errors (retryable)
 *
 * Retry Strategy: Exponential backoff with jitter, 3 attempts
 */

import { z } from 'zod';
import pRetry, { AbortError } from 'p-retry';
import Bottleneck from 'bottleneck';

// ============================================================================
// TypeScript Types & Zod Schemas
// ============================================================================

const LabelAnnotationSchema = z.object({
  mid: z.string().optional(),
  description: z.string(),
  score: z.number(),
  topicality: z.number().optional(),
});

const SafeSearchAnnotationSchema = z.object({
  adult: z.enum(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']),
  spoof: z.enum(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']).optional(),
  medical: z.enum(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']).optional(),
  violence: z.enum(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']).optional(),
  racy: z.enum(['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']).optional(),
});

const VisionResponseSchema = z.object({
  responses: z.array(
    z.object({
      labelAnnotations: z.array(LabelAnnotationSchema).optional(),
      safeSearchAnnotation: SafeSearchAnnotationSchema.optional(),
      error: z
        .object({
          code: z.number(),
          message: z.string(),
          status: z.string(),
        })
        .optional(),
    })
  ),
});

export type LabelAnnotation = z.infer<typeof LabelAnnotationSchema>;
export type SafeSearchAnnotation = z.infer<typeof SafeSearchAnnotationSchema>;
export type VisionResponse = z.infer<typeof VisionResponseSchema>;

export interface FoodAnalysisResult {
  labels: LabelAnnotation[];
  safeSearch?: SafeSearchAnnotation;
  isSafeForFood: boolean;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class GoogleVisionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'GoogleVisionError';
  }
}

// ============================================================================
// Google Cloud Vision API Client
// ============================================================================

export class GoogleVisionClient {
  private apiKey: string;
  private baseUrl: string = 'https://vision.googleapis.com/v1';
  private limiter: Bottleneck;

  constructor(config: { apiKey: string }) {
    if (!config.apiKey) {
      throw new GoogleVisionError(
        'Missing Google Vision API key',
        'MISSING_API_KEY',
        undefined,
        false
      );
    }

    this.apiKey = config.apiKey;

    // Rate limiter: 1,800 req/min = 30 req/sec
    // Conservative: 25 req/sec with burst capacity
    this.limiter = new Bottleneck({
      maxConcurrent: 5, // Max 5 concurrent requests
      minTime: 40, // 40ms between requests = 25 req/sec
      reservoir: 100, // Burst: 100 requests
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 60 * 1000, // per minute
    });
  }

  /**
   * Analyze a food image to identify foods and check content safety
   *
   * @param imageUrl - Public URL of the image to analyze
   * @returns FoodAnalysisResult with labels and safety status
   * @throws GoogleVisionError on API failures
   */
  async analyzeFoodImage(imageUrl: string): Promise<FoodAnalysisResult> {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new GoogleVisionError(
        'Invalid image URL',
        'INVALID_IMAGE_URL',
        400,
        false
      );
    }

    // Log request (sanitized)
    console.log('[GoogleVision] Analyzing food image', {
      imageUrl: this.sanitizeUrl(imageUrl),
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await this.limiter.schedule(() =>
        this.makeRequest(imageUrl)
      );

      return this.parseResponse(response);
    } catch (error) {
      console.error('[GoogleVision] Analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        imageUrl: this.sanitizeUrl(imageUrl),
      });
      throw error;
    }
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest(imageUrl: string): Promise<VisionResponse> {
    return pRetry(
      async () => {
        const url = `${this.baseUrl}/images:annotate?key=${this.apiKey}`;
        const requestBody = {
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl,
                },
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 20, // Get top 20 labels
                },
                {
                  type: 'SAFE_SEARCH_DETECTION',
                  maxResults: 1,
                },
              ],
            },
          ],
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(30000), // 30s timeout
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text();
          const statusCode = response.status;

          // Retryable errors: 429, 500-504
          if (statusCode === 429 || statusCode >= 500) {
            throw new GoogleVisionError(
              `Google Vision API error: ${statusCode} - ${errorText}`,
              'API_ERROR',
              statusCode,
              true
            );
          }

          // Non-retryable errors: 400, 401, 403, 404
          const error = new GoogleVisionError(
            `Google Vision API error: ${statusCode} - ${errorText}`,
            statusCode === 403 ? 'INVALID_API_KEY' : 'API_ERROR',
            statusCode,
            false
          );
          throw new AbortError(error.message);
        }

        const data = await response.json();

        // Validate response schema
        const validatedData = VisionResponseSchema.parse(data);

        return validatedData;
      },
      {
        retries: 3,
        factor: 2, // Exponential: 1s, 2s, 4s
        minTimeout: 1000,
        maxTimeout: 10000,
        randomize: true, // Add jitter
        onFailedAttempt: (error) => {
          console.warn('[GoogleVision] Retry attempt', {
            attemptNumber: error.attemptNumber,
            retriesLeft: error.retriesLeft,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        },
      }
    );
  }

  /**
   * Parse API response and extract food labels
   */
  private parseResponse(response: VisionResponse): FoodAnalysisResult {
    const firstResponse = response.responses[0];

    if (!firstResponse) {
      throw new GoogleVisionError(
        'Empty response from Google Vision API',
        'EMPTY_RESPONSE',
        undefined,
        false
      );
    }

    // Check for API-level errors
    if (firstResponse.error) {
      throw new GoogleVisionError(
        firstResponse.error.message,
        firstResponse.error.status,
        firstResponse.error.code,
        firstResponse.error.code >= 500
      );
    }

    const labels = firstResponse.labelAnnotations || [];
    const safeSearch = firstResponse.safeSearchAnnotation;

    // Determine if content is safe for food analysis
    const isSafeForFood = this.isSafeContent(safeSearch);

    return {
      labels,
      safeSearch,
      isSafeForFood,
    };
  }

  /**
   * Check if content is safe for food analysis
   * Filters out adult content and violence
   */
  private isSafeContent(safeSearch?: SafeSearchAnnotation): boolean {
    if (!safeSearch) return true;

    const dangerousLevels = ['LIKELY', 'VERY_LIKELY'];

    // Flag as unsafe if adult content or violence is detected
    if (
      dangerousLevels.includes(safeSearch.adult) ||
      (safeSearch.violence && dangerousLevels.includes(safeSearch.violence))
    ) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize URL for logging (hide query params)
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return '[invalid-url]';
    }
  }
}

// ============================================================================
// Factory Function with Mock Support
// ============================================================================

/**
 * Create Google Vision client (production or mock)
 *
 * Set USE_MOCK_APIS=true to use mock implementation
 */
export function createGoogleVisionClient(): GoogleVisionClient | any {
  // Check if mock mode is enabled
  if (process.env.USE_MOCK_APIS === 'true') {
    console.log('[GoogleVision] Using mock implementation (USE_MOCK_APIS=true)');
    // Import mock dynamically to avoid bundling in production
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MockGoogleVisionClient } = require('../../../../../tests/mocks/google-vision-mock');
    return new MockGoogleVisionClient();
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing GOOGLE_VISION_API_KEY environment variable. ' +
        'Set this in .env.local for development or Vercel environment variables for production.'
    );
  }

  return new GoogleVisionClient({ apiKey });
}
