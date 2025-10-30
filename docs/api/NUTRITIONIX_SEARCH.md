# Nutritionix Search API

Backend proxy endpoint for searching foods in the Nutritionix database (800,000+ foods).

## Endpoint

```
POST /api/metabolic/nutritionix/search
```

## Purpose

- Provide mobile app with secure access to Nutritionix API
- Keep API credentials on backend (never expose to mobile)
- Enable food ingredient search when adding/editing meals
- Support both common (generic) and branded foods
- Implement caching to reduce API calls and stay within rate limits

## Authentication

**Required:** Supabase session (cookie or Bearer token)

- **Mobile apps:** `Authorization: Bearer <supabase-token>`
- **Web app:** Supabase session cookie
- **Dev/Testing:** `x-user-id: <user-id>` header

## Request

### Headers

```
Content-Type: application/json
Authorization: Bearer <supabase-token>  // Mobile
```

### Body (JSON)

```json
{
  "query": "apple"  // 1-100 characters, trimmed
}
```

### Query Examples

- **Generic foods:** `"apple"`, `"chicken breast"`, `"brown rice"`
- **Branded foods:** `"coke"`, `"doritos"`, `"starbucks latte"`
- **Complex queries:** `"grilled salmon"`, `"greek yogurt"`
- **Typos (fuzzy matching):** `"appl"` → returns "apple" results

## Response

### Success (200)

```json
{
  "results": [
    {
      "name": "Apple",
      "brandName": null,
      "servingQty": 1,
      "servingUnit": "medium apple",
      "calories": 95,
      "totalCarbs": 25,
      "protein": 0.5,
      "totalFat": 0.3,
      "dietaryFiber": 4.4,
      "isCommon": true,
      "photoUrl": "https://d2xdmhkmkbyw75.cloudfront.net/apple.jpg"
    },
    {
      "name": "Fuji Apple",
      "brandName": "Dole",
      "servingQty": 1,
      "servingUnit": "medium",
      "calories": 80,
      "totalCarbs": 22,
      "protein": 0,
      "totalFat": 0,
      "dietaryFiber": 4,
      "isCommon": false,
      "photoUrl": "https://d2xdmhkmkbyw75.cloudfront.net/dole-apple.jpg"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Food name (e.g., "Apple", "Fuji Apple") |
| `brandName` | string \| null | Brand name for branded foods (e.g., "Dole"), null for common foods |
| `servingQty` | number | Serving quantity (e.g., 1, 2, 0.5) |
| `servingUnit` | string | Serving unit (e.g., "medium apple", "cup", "oz") |
| `calories` | number | Calories per serving (rounded to integer) |
| `totalCarbs` | number | Total carbohydrates in grams (rounded) |
| `protein` | number | Protein in grams (rounded) |
| `totalFat` | number | Total fat in grams (rounded) |
| `dietaryFiber` | number | Dietary fiber in grams (rounded) |
| `isCommon` | boolean | `true` for generic foods, `false` for branded foods |
| `photoUrl` | string \| undefined | URL to food photo (if available) |

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": ["Query cannot be empty"]
}
```

**Causes:**
- Empty query (`""` or whitespace only)
- Query too long (>100 characters)
- Missing `query` field

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

**Causes:**
- Missing authentication headers
- Invalid Supabase token
- Expired session

#### 429 Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

**Causes:**
- Nutritionix API quota exceeded (500 requests/day on free tier)
- Client-side rate limiting triggered

#### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

**Causes:**
- Nutritionix API temporarily unavailable
- Invalid API credentials (misconfiguration)
- Unexpected server error

#### 503 Service Unavailable
```json
{
  "error": "Nutritionix API temporarily unavailable"
}
```

**Causes:**
- Nutritionix API is down (500-504 errors from Nutritionix)

## Performance

### Caching Strategy

- **In-memory cache** (24-hour TTL)
- **Cache key:** Lowercase, trimmed query
- **Max entries:** 1000 (LRU eviction)
- **Cache hit:** ~10-50ms
- **Cache miss:** ~200-500ms (network + API processing)

### Rate Limiting

**Client-side (Bottleneck):**
- **Max concurrent requests:** 2
- **Min time between requests:** 500ms (2 req/sec)
- **Burst capacity:** 50 requests per minute

**Nutritionix API Limits:**
- **Free tier:** 500 requests/day
- **Paid tier:** Unlimited ($99/month)

### Expected Latency

- **p50:** ~100ms (cache hit)
- **p95:** ~300ms (cache miss)
- **p99:** ~500ms (slow network or API)

## Mobile Integration

### React Native Example (TypeScript)

```typescript
import { supabase } from './supabase';

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

async function searchFoods(query: string): Promise<NutritionixSearchResult[]> {
  // Get Supabase session token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('https://your-domain.vercel.app/api/metabolic/nutritionix/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search foods');
  }

  const data = await response.json();
  return data.results;
}

// Usage
const results = await searchFoods('apple');
console.log(`Found ${results.length} foods`);
```

### Mobile UI Considerations

1. **Debounce search input** (300-500ms) to avoid excessive API calls
2. **Show loading state** while searching
3. **Group results** by `isCommon` (show common foods first)
4. **Display photos** if `photoUrl` is available
5. **Handle errors gracefully** (show user-friendly message)

## Environment Variables

### Required

```bash
NUTRITIONIX_APP_ID=your_app_id
NUTRITIONIX_APP_KEY=your_app_key
```

**Get credentials at:** https://developer.nutritionix.com/signup

### Optional

```bash
USE_MOCK_APIS=true  # Use mock implementation for testing
```

## Testing

### Local Testing

```bash
# Set environment variables in .env.local
NUTRITIONIX_APP_ID=your_app_id
NUTRITIONIX_APP_KEY=your_app_key
USE_MOCK_APIS=false  # Use real API

# Start dev server
npm run dev

# Test with curl (dev mode - x-user-id header)
curl -X POST http://localhost:3000/api/metabolic/nutritionix/search \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{"query": "apple"}'
```

### Integration Tests

```bash
# Run integration tests (uses mock by default)
USE_MOCK_APIS=true npm run test tests/integration/nutritionix-search.spec.ts

# Test against real API (requires credentials)
USE_MOCK_APIS=false \
NUTRITIONIX_APP_ID=your_app_id \
NUTRITIONIX_APP_KEY=your_app_key \
npm run test tests/integration/nutritionix-search.spec.ts
```

## Common Issues

### 1. "Nutritionix API authentication failed"

**Cause:** Invalid or missing `NUTRITIONIX_APP_ID` or `NUTRITIONIX_APP_KEY`

**Fix:**
- Verify credentials in `.env.local` (dev) or Vercel dashboard (prod)
- Generate new credentials at https://developer.nutritionix.com/signup

### 2. "Rate limit exceeded"

**Cause:** Exceeded 500 requests/day on free tier

**Fix:**
- Implement client-side caching (cache recent searches)
- Upgrade to paid Nutritionix plan ($99/month)
- Reduce search frequency (debounce user input)

### 3. Empty results for valid foods

**Cause:** Nutritionix database doesn't have exact match

**Fix:**
- Try different query variations (e.g., "chicken" vs "chicken breast")
- Use more generic terms (e.g., "apple" instead of "honeycrisp apple")
- Fall back to USDA FoodData Central API (future enhancement)

### 4. Slow response times (>1s)

**Cause:** Cache miss + slow network

**Fix:**
- Ensure caching is enabled (check logs for "Cache hit" messages)
- Use CDN (Vercel Edge Network) for faster API responses
- Consider Redis cache for production (replace in-memory cache)

## Production Considerations

### Monitoring

**Key metrics to track:**
- API call count (should stay < 500/day on free tier)
- Cache hit rate (target: >80%)
- p95 latency (target: <500ms)
- Error rate (target: <1%)

**Log aggregation:**
- All searches logged with: `query`, `resultsCount`, `elapsedMs`, `userId` (partial)
- Errors logged with: `code`, `statusCode`, `retryable`

### Scaling

**Current limitations (free tier):**
- 500 requests/day
- In-memory cache (not shared across serverless instances)

**Recommended upgrades for production:**
- **Paid Nutritionix plan** ($99/month) for unlimited requests
- **Redis cache** (Upstash/Vercel KV) to share cache across instances
- **CDN caching** (Vercel Edge Network) for popular queries

### Security

- ✅ API keys stored on backend (never exposed to mobile)
- ✅ Authentication required (Supabase session)
- ✅ Input validation (Zod schema)
- ✅ Rate limiting (client-side)
- ✅ Error sanitization (don't expose internal details)

## API Contract Validation

**This endpoint follows the API contract specification:**
- Request/response shapes validated with Zod
- Error codes standardized (400, 401, 429, 500, 503)
- Authentication using `requireUserId` helper
- Logging with structured context
- Non-PHI telemetry only (userId is partially redacted)

**Contract validation checklist:**
- [x] Request body schema validation
- [x] Response shape consistency
- [x] Error handling (all error codes documented)
- [x] Authentication enforcement
- [x] Rate limiting
- [x] Logging (no PHI exposure)
- [x] Integration tests

## Alternative APIs

If Nutritionix fails or exceeds quota, consider:

### USDA FoodData Central API

- **URL:** https://fdc.nal.usda.gov/api-guide.html
- **Cost:** Free, unlimited requests
- **Database size:** ~350,000 foods (smaller than Nutritionix)
- **Pros:** Free, reliable, government-maintained
- **Cons:** No branded foods, less user-friendly search

### Implementation Note

The Nutritionix client already supports mock mode (`USE_MOCK_APIS=true`), making it easy to test without API credentials.

## Related Documentation

- **Nutritionix Client:** `/apps/web/src/lib/services/nutritionix.ts`
- **Mock Implementation:** `/tests/mocks/nutritionix-mock.ts`
- **Integration Tests:** `/tests/integration/nutritionix-search.spec.ts`
- **API Contract Spec:** `/docs/CODEX_REFIT_PLAN.md`
- **Food Entry API:** `/docs/api/FOOD_ENTRY.md` (future doc)

## Support

**Nutritionix Documentation:** https://docs.nutritionix.com/v1_1
**Support:** https://developer.nutritionix.com/contact

---

**Last Updated:** 2025-10-30
**API Version:** v2
**Status:** Production Ready
