// apps/web/src/lib/services/dexcom-client.ts
import { z } from 'zod';

/**
 * Dexcom API Client
 *
 * Implements Dexcom OAuth 2.0 flow and EGV (Estimated Glucose Values) data retrieval.
 *
 * API Documentation: https://developer.dexcom.com
 * Rate Limits: 60,000 requests/hour (~16 req/sec)
 *
 * Authentication: OAuth 2.0 with access/refresh tokens
 * Endpoints:
 *  - POST /v2/oauth2/token - Token exchange and refresh
 *  - GET /v2/users/self/egvs - Fetch glucose readings
 *
 * Error Codes:
 *  - 400: Bad Request (invalid parameters)
 *  - 401: Unauthorized (invalid/expired token)
 *  - 403: Forbidden (insufficient scopes)
 *  - 429: Rate Limit Exceeded
 *  - 500-504: Server errors (retryable)
 */

// ============================================
// TypeScript Interfaces & Zod Schemas
// ============================================

export const DexcomTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(), // seconds until expiration
  token_type: z.string(),
});

export type DexcomTokenResponse = z.infer<typeof DexcomTokenResponseSchema>;

export const DexcomEGVSchema = z.object({
  recordId: z.string().optional(),
  systemTime: z.string(), // ISO 8601 timestamp
  displayTime: z.string(), // ISO 8601 timestamp
  value: z.number(), // mg/dL
  trend: z.string().optional(), // "up", "down", "flat", etc.
  trendRate: z.number().optional(), // mg/dL/min
  unit: z.string().optional(), // "mg/dL"
  rateUnit: z.string().optional(), // "mg/dL/min"
  status: z.string().optional(),
  displayDevice: z.string().optional(),
  transmitterId: z.string().optional(),
});

export type DexcomEGV = z.infer<typeof DexcomEGVSchema>;

export const DexcomEGVsResponseSchema = z.object({
  recordType: z.string().optional(),
  recordVersion: z.string().optional(),
  userId: z.string().optional(),
  records: z.array(DexcomEGVSchema),
});

export type DexcomEGVsResponse = z.infer<typeof DexcomEGVsResponseSchema>;

export interface DexcomClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string; // e.g., "https://sandbox-api.dexcom.com" or "https://api.dexcom.com"
}

// ============================================
// Error Classes
// ============================================

export class DexcomAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'DexcomAPIError';
  }
}

export class DexcomRateLimitError extends DexcomAPIError {
  constructor(
    message: string,
    public retryAfter?: number // seconds to wait
  ) {
    super(message, 429, true);
    this.name = 'DexcomRateLimitError';
  }
}

export class DexcomAuthError extends DexcomAPIError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode, false);
    this.name = 'DexcomAuthError';
  }
}

// ============================================
// Retry Logic with Exponential Backoff
// ============================================

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  jitterMs: 500,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, options: RetryOptions): number {
  const baseDelay = options.initialDelayMs * Math.pow(options.backoffFactor, attempt);
  const cappedDelay = Math.min(baseDelay, options.maxDelayMs);
  const jitter = Math.random() * options.jitterMs;
  return cappedDelay + jitter;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
  context: string = 'API call'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof DexcomAPIError && !error.isRetryable) {
        throw error;
      }

      // On last attempt, throw the error
      if (attempt === options.maxRetries) {
        console.error(`[Dexcom] ${context} failed after ${attempt + 1} attempts`, {
          error: lastError.message,
        });
        throw error;
      }

      // Calculate delay for retry
      let delay: number;
      if (error instanceof DexcomRateLimitError && error.retryAfter) {
        delay = error.retryAfter * 1000; // Convert seconds to ms
      } else {
        delay = calculateBackoff(attempt, options);
      }

      console.warn(`[Dexcom] ${context} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================
// Dexcom API Client
// ============================================

export class DexcomClient {
  private config: DexcomClientConfig;

  constructor(config: DexcomClientConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL for user consent
   * @param state - Random state parameter for CSRF protection
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'offline_access', // Required for refresh tokens
      state,
    });

    return `${this.config.baseUrl}/v2/oauth2/login?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access/refresh tokens
   * @param code - Authorization code from OAuth callback
   * @returns Token response with access_token and refresh_token
   * @throws {DexcomAuthError} If token exchange fails
   */
  async exchangeCodeForTokens(code: string): Promise<DexcomTokenResponse> {
    return retryWithBackoff(
      async () => {
        const response = await fetch(`${this.config.baseUrl}/v2/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
          },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.config.redirectUri,
          }),
        });

        return this.handleTokenResponse(response);
      },
      DEFAULT_RETRY_OPTIONS,
      'Token exchange'
    );
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - The refresh token
   * @returns New token response
   * @throws {DexcomAuthError} If token refresh fails
   */
  async refreshAccessToken(refreshToken: string): Promise<DexcomTokenResponse> {
    return retryWithBackoff(
      async () => {
        const response = await fetch(`${this.config.baseUrl}/v2/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
          },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        return this.handleTokenResponse(response);
      },
      DEFAULT_RETRY_OPTIONS,
      'Token refresh'
    );
  }

  /**
   * Fetch EGVs (Estimated Glucose Values) for a time range
   * @param accessToken - Valid access token
   * @param startDate - ISO 8601 timestamp (e.g., "2025-01-01T00:00:00")
   * @param endDate - ISO 8601 timestamp (e.g., "2025-01-02T00:00:00")
   * @returns EGV records
   * @throws {DexcomAPIError} If API call fails
   */
  async getEGVs(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<DexcomEGVsResponse> {
    return retryWithBackoff(
      async () => {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        const response = await fetch(
          `${this.config.baseUrl}/v2/users/self/egvs?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await this.handleErrorResponse(response);
        }

        const data = await response.json();
        return DexcomEGVsResponseSchema.parse(data);
      },
      DEFAULT_RETRY_OPTIONS,
      'Fetch EGVs'
    );
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async handleTokenResponse(response: Response): Promise<DexcomTokenResponse> {
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json();
    return DexcomTokenResponseSchema.parse(data);
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `Dexcom API error: ${statusCode} ${response.statusText}`;

    try {
      const errorData = await response.json();
      if (errorData.error_description) {
        errorMessage = errorData.error_description;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If response body is not JSON, use default error message
    }

    // Rate limit error
    if (statusCode === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

      throw new DexcomRateLimitError(errorMessage, retryAfterSeconds);
    }

    // Auth errors (non-retryable)
    if (statusCode === 401 || statusCode === 403) {
      throw new DexcomAuthError(errorMessage, statusCode);
    }

    // Client errors (non-retryable)
    if (statusCode >= 400 && statusCode < 500) {
      throw new DexcomAPIError(errorMessage, statusCode, false);
    }

    // Server errors (retryable)
    if (statusCode >= 500) {
      throw new DexcomAPIError(errorMessage, statusCode, true);
    }

    // Unknown error
    throw new DexcomAPIError(errorMessage, statusCode, false);
  }
}

// ============================================
// Client Factory
// ============================================

export function createDexcomClient(): DexcomClient {
  const clientId = process.env.DEXCOM_CLIENT_ID;
  const clientSecret = process.env.DEXCOM_CLIENT_SECRET;
  const redirectUri = process.env.DEXCOM_REDIRECT_URI;
  const baseUrl = process.env.DEXCOM_API_BASE_URL || 'https://sandbox-api.dexcom.com';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing required Dexcom environment variables: DEXCOM_CLIENT_ID, DEXCOM_CLIENT_SECRET, DEXCOM_REDIRECT_URI'
    );
  }

  return new DexcomClient({
    clientId,
    clientSecret,
    redirectUri,
    baseUrl,
  });
}
