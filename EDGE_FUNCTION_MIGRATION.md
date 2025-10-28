# Supabase Edge Function Migration - Food Analysis

**Created:** October 28, 2025
**Status:** ✅ Edge Function Created, Pending Deployment

---

## Problem Statement

Food photo analysis was failing in production due to Vercel serverless function timeout issues:
1. Gemini API takes 15-30 seconds to analyze images
2. Vercel's "fire-and-forget" background execution terminates when HTTP response is sent
3. Analysis never completes, photos stuck in "pending" state forever

## Solution: Supabase Edge Function

We've created a Supabase Edge Function that handles food analysis asynchronously with proper timeout handling.

### Architecture

**Before (Broken):**
```
Mobile/Web → Vercel API → Upload Photo → Return "pending"
                        ↓ (fire-and-forget - gets killed)
                   Gemini Analysis → ❌ Never completes
```

**After (Fixed):**
```
Mobile/Web → Vercel API → Upload Photo → Invoke Edge Function → Return "pending"
                                              ↓ (async execution continues)
                                         Gemini Analysis → ✅ Completes successfully
                                              ↓
                                         Update Database
```

---

## Files Created

### 1. Edge Function
**Path:** `/supabase/functions/analyze-food-photo/index.ts`

**Features:**
- ✅ Deno-based serverless function
- ✅ Calls Google Gemini 2.5 Flash API
- ✅ Downloads image from Supabase Storage
- ✅ Parses nutrition data from Gemini response
- ✅ Inserts ingredients into database
- ✅ Updates FoodEntry totals
- ✅ Marks photo as completed/failed
- ✅ Proper error handling and logging
- ✅ CORS headers for web app support

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`

---

## Deployment Steps

### Step 1: Deploy Edge Function to Supabase

```bash
# Navigate to project root
cd /Users/Tom/Arbeiten/Arbeiten/2025_Carbly

# Deploy the Edge Function
supabase functions deploy analyze-food-photo --project-ref glqtomnhltolgbxiagbk

# Set environment secrets
supabase secrets set \
  GOOGLE_CLOUD_PROJECT="your-project-id" \
  GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}' \
  --project-ref glqtomnhltolgbxiagbk
```

### Step 2: Update Vercel API Route

**File:** `apps/web/src/app/api/metabolic/food/route.ts`

**Change required (around line 373):**

```typescript
// BEFORE (fire-and-forget - broken)
foodEntry.photos.forEach((photo, index) => {
  analyzeSinglePhoto(
    foodEntry.id,
    photo.id,
    uploadedPhotos[index].publicUrl,
    useGemini,
    prisma
  ).catch(error => {
    console.error(`[FOOD UPLOAD] Background analysis failed for photo ${photo.id}:`, error)
  })
})

// AFTER (invoke Edge Function)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

for (const [index, photo] of foodEntry.photos.entries()) {
  // Invoke Edge Function asynchronously (fire-and-forget is OK here)
  supabase.functions.invoke('analyze-food-photo', {
    body: {
      foodPhotoId: photo.id,
      photoUrl: uploadedPhotos[index].publicUrl,
    }
  }).catch(error => {
    console.error(`[FOOD UPLOAD] Failed to invoke Edge Function for photo ${photo.id}:`, error)
  })
}
```

### Step 3: Update Mobile App API Client

**File:** `mobile/src/api/food.ts` (or similar)

**Change required:**

```typescript
// BEFORE (calls Vercel API)
export async function uploadFoodPhoto(
  photo: { uri: string; type: string; name: string },
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
) {
  const formData = new FormData()
  formData.append('photo', {
    uri: photo.uri,
    type: photo.type,
    name: photo.name,
  } as any)
  formData.append('mealType', mealType)
  formData.append('eatenAt', new Date().toISOString())

  const response = await fetch('https://app.getcarbly.app/api/metabolic/food', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    body: formData,
  })

  return await response.json()
}

// AFTER (calls Supabase Edge Function via Vercel API - NO CHANGE NEEDED!)
// The Vercel API route will handle invoking the Edge Function
// Mobile app code stays the same!
```

**Note:** With this hybrid approach, the mobile app doesn't need any changes! The Vercel API route acts as a proxy and invokes the Edge Function internally.

---

## Testing Steps

### 1. Test Edge Function Locally

```bash
# Start Supabase local development
supabase functions serve analyze-food-photo --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/analyze-food-photo' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "foodPhotoId": "test-photo-id",
    "photoUrl": "https://nqlxlkhbriqztkzwbdif.supabase.co/storage/v1/object/public/food-photos/test.jpg"
  }'
```

### 2. Test in Production

```bash
# Upload a food photo via mobile app or web app
# Check Edge Function logs
supabase functions logs analyze-food-photo --project-ref glqtomnhltolgbxiagbk

# Check database for completed analysis
psql $DATABASE_URL -c "SELECT id, analysis_status, created_at FROM food_photos ORDER BY created_at DESC LIMIT 5;"
```

---

## Benefits of This Approach

1. ✅ **Fixes timeout issue** - Edge Functions support up to 150s execution time
2. ✅ **No mobile app changes** - Vercel API acts as proxy
3. ✅ **Better performance** - Edge Function runs closer to database
4. ✅ **Proper async execution** - No more fire-and-forget issues
5. ✅ **Better logging** - Can view Edge Function logs in Supabase dashboard
6. ✅ **Cost savings** - Reduces Vercel function usage

---

## Next Steps

- [ ] Deploy Edge Function to Supabase production
- [ ] Set environment secrets in Supabase
- [ ] Update Vercel API route to invoke Edge Function
- [ ] Test with schnitzel image
- [ ] Monitor Edge Function logs
- [ ] Update memory files with successful deployment

---

## Rollback Plan

If Edge Function fails, revert to synchronous analysis:

```typescript
// Emergency rollback: Make analysis synchronous in Vercel API
const analysisResult = await analyzeSinglePhoto(...)
// This will work but may timeout on large images
```

---

## Future Enhancements

1. Add retry logic with exponential backoff
2. Implement Edge Function for CGM sync
3. Migrate all API routes to Edge Functions
4. Remove Vercel dependency entirely
5. Host static Next.js build on Supabase Storage or Cloudflare Pages
