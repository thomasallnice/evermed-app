import { VertexAI } from '@google-cloud/vertexai'

// Re-use the same interfaces from food-analysis.ts
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
  metadata?: {
    provider: 'gemini'
    model: string
    responseTimeMs: number
    retryCount: number
    estimatedCostUSD: number
  }
}

/**
 * Error categories for proper handling
 */
enum GeminiErrorCategory {
  AUTHENTICATION = 'authentication',
  QUOTA = 'quota',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  PARSING = 'parsing',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/**
 * Categorize errors for proper retry logic
 */
function categorizeError(error: any): GeminiErrorCategory {
  const message = error.message?.toLowerCase() || ''

  if (message.includes('credentials') || message.includes('authentication') || message.includes('unauthorized')) {
    return GeminiErrorCategory.AUTHENTICATION
  }
  if (message.includes('quota') || message.includes('exceeded quota')) {
    return GeminiErrorCategory.QUOTA
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return GeminiErrorCategory.RATE_LIMIT
  }
  if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
    return GeminiErrorCategory.NETWORK
  }

  return GeminiErrorCategory.UNKNOWN
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  const category = categorizeError(error)
  return [
    GeminiErrorCategory.RATE_LIMIT,
    GeminiErrorCategory.NETWORK,
    GeminiErrorCategory.UNKNOWN
  ].includes(category)
}

/**
 * Exponential backoff with jitter
 */
function calculateBackoff(attemptNumber: number): number {
  const baseDelay = 1000 // 1 second
  const maxDelay = 10000 // 10 seconds
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay)
  const jitter = Math.random() * 0.3 * exponentialDelay // 30% jitter
  return exponentialDelay + jitter
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch image from URL and convert to base64
 * Required for Gemini API (does not support direct URLs like OpenAI)
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

/**
 * Analyze a food photo using Google Vertex AI Gemini 2.5 Flash
 * Implements retry logic with exponential backoff for resilience
 *
 * @param photoUrl - Public URL of the food photo
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param timeoutMs - Request timeout in milliseconds (default: 30000)
 * @returns Analysis result with ingredients and nutritional data
 */
export async function analyzeFoodPhotoGemini(
  photoUrl: string,
  maxRetries: number = 3,
  timeoutMs: number = 30000
): Promise<FoodAnalysisResult> {
  const startTime = Date.now()
  let retryCount = 0
  let lastError: any = null

  // Validate environment variables at startup
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.error('[Gemini] Missing required environment variable: GOOGLE_CLOUD_PROJECT')
    return {
      success: false,
      ingredients: [],
      error: 'Google Cloud project not configured (missing GOOGLE_CLOUD_PROJECT)'
    }
  }

  // Check for credentials (either file path or JSON string)
  const hasFileCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  const hasJsonCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (!hasFileCredentials && !hasJsonCredentials) {
    console.error('[Gemini] Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON')
    return {
      success: false,
      ingredients: [],
      error: 'Google Cloud credentials not configured (missing credentials)'
    }
  }

  // Parse JSON credentials if provided (for Vercel)
  let parsedCredentials: any = null
  if (hasJsonCredentials && !hasFileCredentials) {
    try {
      // Decode base64 credentials
      const credentialsJson = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!, 'base64').toString('utf-8')
      parsedCredentials = JSON.parse(credentialsJson)

      console.log('[Gemini] Using JSON credentials from environment variable')
      console.log(`[Gemini] Service account: ${parsedCredentials.client_email}`)
    } catch (err: any) {
      console.error('[Gemini] Failed to parse JSON credentials:', err.message)
      return {
        success: false,
        ingredients: [],
        error: 'Failed to parse Google Cloud credentials'
      }
    }
  }

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      retryCount = attempt

      if (attempt > 0) {
        const backoffMs = calculateBackoff(attempt - 1)
        console.log(`[Gemini] Retry attempt ${attempt}/${maxRetries} after ${backoffMs.toFixed(0)}ms`)
        await sleep(backoffMs)
      }

      // Initialize Vertex AI client
      // If we have parsed credentials, pass them directly; otherwise use GOOGLE_APPLICATION_CREDENTIALS env var
      const vertexAI = parsedCredentials
        ? new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT!,
            location: 'us-central1',
            googleAuthOptions: {
              credentials: parsedCredentials,
            },
          })
        : new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT!,
            location: 'us-central1',
          })

      // Get Gemini 2.5 Flash model
      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.5-flash', // Updated model name for 2025
      })

      // Fetch image and convert to base64 with timeout
      const imageBase64 = await Promise.race([
        fetchImageAsBase64(photoUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Image fetch timeout')), timeoutMs / 2)
        )
      ])

      // System prompt for nutritional analysis
      const prompt = `You are a nutritional analysis assistant. Analyze food photos and provide detailed nutritional information in JSON format.

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
- Return empty array if no food is visible

Analyze this food photo and provide nutritional information for each ingredient. Return only JSON, no markdown.`

      // Generate content with image and timeout
      const result = await Promise.race([
        model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }]
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), timeoutMs)
        )
      ])

      // Extract response text
      const response = result.response
      const candidates = await response.candidates
      const responseText = candidates[0]?.content?.parts?.[0]?.text || ''

      if (!responseText) {
        lastError = new Error('No response from Gemini API')
        continue
      }

      // Parse JSON response (handle potential markdown wrapping)
      let analysisData: { ingredients: FoodIngredientData[] }
      try {
        const cleanedContent = responseText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim()

        analysisData = JSON.parse(cleanedContent)
      } catch (parseError) {
        console.error('[Gemini] Failed to parse response as JSON:', responseText.substring(0, 200))
        lastError = new Error('Invalid JSON response from Gemini')
        continue
      }

      // Validate structure
      if (!analysisData.ingredients || !Array.isArray(analysisData.ingredients)) {
        lastError = new Error('Invalid response structure from Gemini')
        continue
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
        lastError = new Error('No valid ingredients detected by Gemini')
        continue
      }

      // Success! Calculate metrics
      const responseTimeMs = Date.now() - startTime
      const estimatedInputTokens = Math.ceil((prompt.length / 4) + (imageBase64.length / 1000))
      const estimatedOutputTokens = Math.ceil(responseText.length / 4)
      // Gemini 2.5 Flash Vertex AI pricing (2025): $0.30 per 1M input tokens, $2.50 per 1M output tokens
      const estimatedCostUSD = (estimatedInputTokens * 0.30 / 1_000_000) + (estimatedOutputTokens * 2.50 / 1_000_000)

      console.log(`[Gemini] Success: ${validatedIngredients.length} ingredients detected in ${responseTimeMs}ms (retry: ${retryCount}, cost: $${estimatedCostUSD.toFixed(6)})`)

      return {
        success: true,
        ingredients: validatedIngredients,
        metadata: {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          responseTimeMs,
          retryCount,
          estimatedCostUSD
        }
      }
    } catch (error: any) {
      lastError = error
      const category = categorizeError(error)

      console.error(`[Gemini] Attempt ${attempt + 1}/${maxRetries + 1} failed (${category}):`, error.message)

      // Don't retry on non-retryable errors
      if (!isRetryableError(error)) {
        console.error('[Gemini] Non-retryable error detected, aborting retry loop')
        break
      }

      // Continue to next retry attempt
      continue
    }
  }

  // All retries exhausted
  const totalTimeMs = Date.now() - startTime
  const category = categorizeError(lastError)

  console.error(`[Gemini] All ${maxRetries + 1} attempts failed after ${totalTimeMs}ms (${category})`)

  // Provide specific error messages based on category
  let errorMessage: string
  switch (category) {
    case GeminiErrorCategory.AUTHENTICATION:
      errorMessage = 'Google Cloud credentials not found or invalid'
      break
    case GeminiErrorCategory.QUOTA:
      errorMessage = 'API quota exceeded'
      break
    case GeminiErrorCategory.RATE_LIMIT:
      errorMessage = 'Rate limit exceeded, please try again later'
      break
    case GeminiErrorCategory.NETWORK:
      errorMessage = 'Network error connecting to Gemini API'
      break
    default:
      errorMessage = lastError?.message || 'Gemini analysis failed'
  }

  return {
    success: false,
    ingredients: [],
    error: errorMessage,
    metadata: {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      responseTimeMs: totalTimeMs,
      retryCount,
      estimatedCostUSD: 0
    }
  }
}

