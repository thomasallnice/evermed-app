# External API Services

This directory contains production-ready API client wrappers for third-party services used in Sprint 2 - AI Intelligence.

## Overview

Two external APIs are integrated for automated food recognition and nutrition data enrichment:

1. **Google Cloud Vision API** - Food image analysis and recognition
2. **Nutritionix API** - Nutrition database and natural language food parsing

Both clients feature:
- ✅ Exponential backoff retry logic (3-5 attempts)
- ✅ Client-side rate limiting with Bottleneck
- ✅ Comprehensive error handling (client vs server errors)
- ✅ TypeScript type safety with Zod validation
- ✅ Sanitized logging (no API keys or PHI)
- ✅ Mock implementations for testing
- ✅ Environment variable configuration

---

## Google Cloud Vision API

**File:** `google-vision.ts`

### Purpose
Analyze food photos to identify ingredients using label detection and safe search filtering.

### Authentication
- **Method:** API key
- **Environment Variable:** `GOOGLE_VISION_API_KEY`

### Rate Limits
- **Quota:** 1,800 requests/minute (30 req/sec)
- **Implementation:** Bottleneck configured for 25 req/sec with burst capacity

### API Endpoint
```
POST https://vision.googleapis.com/v1/images:annotate
```

### Features
- **Label Detection:** Identifies foods in images with confidence scores
- **Safe Search Detection:** Filters inappropriate content
- **Image Optimization:** Supports image resizing to reduce costs

### Usage Example

```typescript
import { createGoogleVisionClient } from './services/google-vision';

// Create client (uses real API or mock based on USE_MOCK_APIS)
const client = createGoogleVisionClient();

// Analyze food image
const result = await client.analyzeFoodImage('https://example.com/food.jpg');

console.log(result.labels); // Array of detected food labels
console.log(result.isSafeForFood); // Boolean: safe for food analysis
console.log(result.safeSearch); // Safe search annotation
```

### Response Type

```typescript
interface FoodAnalysisResult {
  labels: LabelAnnotation[];
  safeSearch?: SafeSearchAnnotation;
  isSafeForFood: boolean;
}

interface LabelAnnotation {
  description: string;
  score: number; // 0-1 confidence
  topicality?: number;
}
```

### Error Handling

| Status Code | Error Type | Retryable | Description |
|-------------|------------|-----------|-------------|
| 400 | `GoogleVisionError` | No | Malformed image or invalid request |
| 403 | `GoogleVisionError` | No | Invalid or missing API key |
| 429 | `GoogleVisionError` | Yes | Rate limit exceeded |
| 500-504 | `GoogleVisionError` | Yes | Server errors |

### Retry Strategy
- **Attempts:** 3 retries
- **Backoff:** Exponential with jitter (1s, 2s, 4s)
- **Timeout:** 30 seconds per request

---

## Nutritionix API

**File:** `nutritionix.ts`

### Purpose
Get detailed nutrition data for identified foods using natural language parsing and branded food database.

### Authentication
- **Method:** Custom headers
- **Environment Variables:**
  - `NUTRITIONIX_APP_ID`
  - `NUTRITIONIX_APP_KEY`

### Rate Limits
- **Quota:** Varies by plan (typically 500-5000 requests/day)
- **Implementation:** Bottleneck configured for 2 req/sec with burst capacity

### API Endpoints

#### 1. Natural Nutrients
```
POST https://trackapi.nutritionix.com/v2/natural/nutrients
```
Parse natural language food queries (e.g., "1 cup of rice", "medium apple")

#### 2. Instant Search
```
GET https://trackapi.nutritionix.com/v2/search/instant?query={query}
```
Search for foods in common and branded databases

### Features
- **Natural Language Parsing:** Handles queries like "1 slice of pizza"
- **Branded Food Database:** Includes nutrition data from thousands of brands
- **Common Food Database:** Generic foods with standardized nutrition
- **In-Memory Caching:** 24-hour TTL for common food lookups

### Usage Example

```typescript
import { createNutritionixClient } from './services/nutritionix';

// Create client (uses real API or mock based on USE_MOCK_APIS)
const client = createNutritionixClient();

// Get nutrition data from natural language
const nutrition = await client.getNutrition('1 slice of pizza');

console.log(nutrition[0].calories); // 285
console.log(nutrition[0].protein); // 12g
console.log(nutrition[0].carbs); // 36g
console.log(nutrition[0].fat); // 10g

// Search for foods
const searchResults = await client.searchFoods('pizza');

console.log(searchResults.common); // Common foods
console.log(searchResults.branded); // Branded foods
```

### Response Type

```typescript
interface NutritionSummary {
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

interface InstantSearchResponse {
  common?: CommonFood[];
  branded?: BrandedFood[];
}
```

### Error Handling

| Status Code | Error Type | Retryable | Description |
|-------------|------------|-----------|-------------|
| 400 | `NutritionixError` | No | Invalid query or malformed request |
| 401 | `NutritionixError` | No | Invalid credentials |
| 404 | `NutritionixError` | No | Food not found |
| 429 | `NutritionixError` | Yes | Rate limit exceeded |
| 500-504 | `NutritionixError` | Yes | Server errors |

### Retry Strategy
- **Attempts:** 3 retries
- **Backoff:** Exponential with jitter (1s, 2s, 4s)
- **Timeout:** 30 seconds per request

### Caching Behavior
- **Strategy:** In-memory cache with 24-hour TTL
- **Cache Key:** Normalized query (lowercase, trimmed)
- **Clear Cache:** `client.clearCache()`

---

## Environment Setup

### Production (Vercel)

Add these environment variables in Vercel project settings:

```bash
GOOGLE_VISION_API_KEY=your-google-api-key
NUTRITIONIX_APP_ID=your-nutritionix-app-id
NUTRITIONIX_APP_KEY=your-nutritionix-app-key
```

### Development (Local)

Create `.env.local` file:

```bash
# Copy from .env.example
cp .env.example .env.local

# Add your API keys
GOOGLE_VISION_API_KEY=your-google-api-key
NUTRITIONIX_APP_ID=your-nutritionix-app-id
NUTRITIONIX_APP_KEY=your-nutritionix-app-key

# Optional: Use mock APIs for testing
USE_MOCK_APIS=true
```

---

## Testing

### Mock Mode

Enable mock implementations for testing without hitting real APIs:

```bash
# In .env.local or .env.test
USE_MOCK_APIS=true
```

**Mock implementations:**
- `/tests/mocks/google-vision-mock.ts`
- `/tests/mocks/nutritionix-mock.ts`

### Run Tests

```bash
# Run all integration tests
npm run test

# Run specific test file
npm run test -- tests/integration/google-vision.test.ts
npm run test -- tests/integration/nutritionix.test.ts
```

### Test Coverage

Both API clients have comprehensive integration tests covering:
- ✅ Successful API responses
- ✅ Error handling (4xx, 5xx)
- ✅ Response schema validation
- ✅ Safe content filtering (Google Vision)
- ✅ Caching behavior (Nutritionix)
- ✅ Performance/timing validation

---

## Integration Flow

**Sprint 2 - AI Intelligence Workflow:**

```
1. User uploads photo → FoodEntry created (status: "pending")
2. Background job triggered:
   a. Google Vision analyzes photo → identifies foods (e.g., "pizza", "salad")
   b. For each detected food:
      - Query Nutritionix for nutrition data
      - Create FoodIngredient record
   c. Update FoodEntry totals:
      - totalCalories
      - totalProteinsG
      - totalCarbsG
      - totalFatsG
   d. Update FoodPhoto.analysisStatus = "completed"
3. User sees enriched meal data in app
```

**Example Implementation:**

```typescript
// Background job handler
async function analyzeFoodPhoto(foodEntryId: string, imageUrl: string) {
  const visionClient = createGoogleVisionClient();
  const nutritionClient = createNutritionixClient();

  // Step 1: Analyze image
  const analysis = await visionClient.analyzeFoodImage(imageUrl);

  if (!analysis.isSafeForFood) {
    throw new Error('Unsafe content detected');
  }

  // Step 2: Get nutrition for detected foods
  const detectedFoods = analysis.labels
    .filter(label => label.score > 0.8) // High confidence only
    .slice(0, 5); // Top 5 labels

  for (const food of detectedFoods) {
    const nutrition = await nutritionClient.getNutrition(food.description);

    // Step 3: Create FoodIngredient records
    await prisma.foodIngredient.create({
      data: {
        foodEntryId,
        name: nutrition[0].foodName,
        calories: nutrition[0].calories,
        proteinG: nutrition[0].protein,
        carbsG: nutrition[0].carbs,
        fatG: nutrition[0].fat,
      },
    });
  }

  // Step 4: Update FoodEntry totals
  // (aggregate FoodIngredient records)
}
```

---

## Medical Safety Considerations

Since this is a medical application:

- ✅ **Never cache medical data indefinitely** - Respect data freshness requirements
- ✅ **Log all external API calls** for audit trails (sanitized PHI)
- ✅ **Implement fallback strategies** - Don't block critical user flows
- ✅ **Validate all external data** - Never trust third-party APIs blindly
- ✅ **Handle API downtime gracefully** - Provide clear user messaging
- ✅ **Filter unsafe content** - Google Vision safe search detection

---

## Cost Optimization

### Google Cloud Vision API

- **Pricing:** ~$1.50 per 1,000 requests (label detection)
- **Optimization Tips:**
  - Resize images before sending (reduce bandwidth and costs)
  - Cache analysis results for duplicate images
  - Use label detection only (avoid expensive features like OCR)
  - Set maxResults to 20 (sufficient for food identification)

### Nutritionix API

- **Pricing:** Varies by plan (free tier available)
- **Optimization Tips:**
  - Cache common food lookups (implemented: 24-hour TTL)
  - Batch requests when possible
  - Use natural nutrients endpoint (more efficient than instant search)
  - Monitor daily quota usage

---

## Troubleshooting

### Issue: "Missing API key" error

**Solution:** Verify environment variables are set correctly:

```bash
# Check if variables are loaded
echo $GOOGLE_VISION_API_KEY
echo $NUTRITIONIX_APP_ID
echo $NUTRITIONIX_APP_KEY

# Restart dev server after adding variables
npm run dev
```

### Issue: Rate limit errors (429)

**Solution:** Rate limiting is implemented, but you may need to adjust:

```typescript
// In google-vision.ts or nutritionix.ts
// Reduce maxConcurrent or increase minTime
this.limiter = new Bottleneck({
  maxConcurrent: 2, // Lower concurrency
  minTime: 1000, // Slower requests
});
```

### Issue: Timeout errors

**Solution:** Increase timeout duration:

```typescript
// In makeRequest() method
signal: AbortSignal.timeout(60000), // 60s timeout
```

### Issue: Mock mode not working

**Solution:** Ensure environment variable is set:

```bash
# In .env.local
USE_MOCK_APIS=true

# Restart dev server
npm run dev
```

---

## Self-Verification Checklist

Before deploying to production:

- [ ] API keys are stored in environment variables, not hardcoded
- [ ] Retry logic is implemented with exponential backoff
- [ ] Rate limiting is configured based on API quotas
- [ ] Error handling covers all documented error codes
- [ ] Logging is comprehensive but sanitized (no API keys or PHI)
- [ ] Mock implementation exists for testing
- [ ] TypeScript types match API documentation
- [ ] Timeout configuration is set appropriately
- [ ] Circuit breaker or fallback strategy is in place
- [ ] Integration tests cover success and failure scenarios

---

## Resources

- [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Nutritionix API Documentation](https://www.nutritionix.com/business/api)
- [Bottleneck Rate Limiter](https://github.com/SGrondin/bottleneck)
- [p-retry Library](https://github.com/sindresorhus/p-retry)
- [Zod Schema Validation](https://zod.dev/)
