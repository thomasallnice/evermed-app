# Multi-Photo Food API Contract

**Version:** 1.0
**Last Updated:** October 16, 2025
**Status:** Production-ready (supports 1-5 photos per meal)

## Overview

The food API supports uploading 1-5 photos per meal for multi-dish tracking. Each photo is analyzed separately using AI (Gemini 2.5 Flash or OpenAI Vision), and ingredients are linked to their specific dishes. Total nutrition is calculated across all dishes.

## Authentication

All endpoints require authentication:

**Development:**
```
Header: x-user-id: {userId}
```

**Production:**
```
Cookie: sb-{project-ref}-auth-token={supabase-session-token}
```

## Endpoints

### POST /api/metabolic/food

Upload 1-5 food photos and create a meal entry with multi-dish support.

#### Request

**Content-Type:** `multipart/form-data`

**Single Photo Format:**
```
photo: File (JPEG/PNG/WebP, max 5MB)
mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
eatenAt: ISO 8601 timestamp (optional, defaults to now)
```

**Multi-Photo Format (iOS Week 6.5+):**
```
photo1: File (JPEG/PNG/WebP, max 5MB)
photo2: File (JPEG/PNG/WebP, max 5MB)
photo3: File (JPEG/PNG/WebP, max 5MB)
photo4: File (JPEG/PNG/WebP, max 5MB)
photo5: File (JPEG/PNG/WebP, max 5MB)
mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
eatenAt: ISO 8601 timestamp (optional, defaults to now)
```

**Validation Rules:**
- At least 1 photo required, maximum 5 photos
- Each photo: max 5MB
- Total size: max 15MB across all photos
- Supported formats: JPEG, PNG, WebP
- All photos must be valid images

#### Response (201 Created)

```json
{
  "foodEntryId": "uuid",
  "photoUrls": [
    "https://.../storage/v1/object/public/food-photos/person-id/meals/timestamp-1.jpg",
    "https://.../storage/v1/object/public/food-photos/person-id/meals/timestamp-2.jpg"
  ],
  "mealType": "breakfast",
  "timestamp": "2025-10-16T08:30:00.000Z",
  "analysisStatus": "pending",
  "ingredients": [],
  "totalCalories": 0,
  "totalCarbsG": 0,
  "totalProteinG": 0,
  "totalFatG": 0,
  "totalFiberG": 0
}
```

**Notes:**
- Response is immediate with `analysisStatus: "pending"`
- AI analysis runs in background (takes 8-15 seconds)
- Poll `GET /api/metabolic/food/[id]` to check analysis completion
- Or subscribe to status updates via WebSocket (future feature)

#### Error Responses

**400 Bad Request - Missing photo:**
```json
{
  "error": "At least one photo is required"
}
```

**400 Bad Request - Invalid meal type:**
```json
{
  "error": "Valid mealType is required (breakfast, lunch, dinner, snack)"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found - Person record missing:**
```json
{
  "error": "Person record not found"
}
```

**413 Payload Too Large - Single photo too large:**
```json
{
  "error": "Each photo must be less than 5MB"
}
```

**413 Payload Too Large - Total size too large:**
```json
{
  "error": "Total photo size must be less than 15MB"
}
```

**415 Unsupported Media Type:**
```json
{
  "error": "All files must be images (JPEG, PNG, WebP)"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

### GET /api/metabolic/food

List food entries with optional filtering.

#### Request

**Query Parameters:**
- `mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'` - Filter by meal type
- `startDate?: string` - ISO 8601 date (inclusive), e.g., `2025-10-01T00:00:00Z`
- `endDate?: string` - ISO 8601 date (inclusive), e.g., `2025-10-31T23:59:59Z`
- `limit?: number` - Default: 20, Max: 100

**Example:**
```
GET /api/metabolic/food?mealType=breakfast&startDate=2025-10-01T00:00:00Z&limit=10
```

#### Response (200 OK)

```json
{
  "entries": [
    {
      "id": "uuid",
      "mealType": "breakfast",
      "timestamp": "2025-10-16T08:30:00.000Z",
      "photoUrl": "https://.../food-photos/person-id/meals/timestamp-1.jpg",
      "analysisStatus": "completed",
      "ingredients": [
        {
          "name": "Scrambled eggs",
          "quantity": 2,
          "unit": "egg",
          "calories": 140,
          "carbsG": 1.2,
          "proteinG": 12.6,
          "fatG": 9.5,
          "fiberG": 0
        },
        {
          "name": "Whole wheat toast",
          "quantity": 2,
          "unit": "slice",
          "calories": 160,
          "carbsG": 28,
          "proteinG": 8,
          "fatG": 2,
          "fiberG": 4
        }
      ],
      "totalCalories": 300,
      "totalCarbsG": 29.2,
      "totalProteinG": 20.6,
      "totalFatG": 11.5,
      "totalFiberG": 4
    }
  ],
  "total": 45
}
```

**Notes:**
- Returns only the first photo URL (primary photo)
- Full multi-photo data available in `GET /api/metabolic/food/[id]`
- Entries sorted by `timestamp` descending (newest first)

#### Error Responses

**400 Bad Request - Invalid query params:**
```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "code": "invalid_enum_value",
      "path": ["mealType"],
      "message": "Invalid enum value. Expected 'breakfast' | 'lunch' | 'dinner' | 'snack'"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

### GET /api/metabolic/food/[id]

Get detailed information about a specific food entry with all photos and per-dish ingredients.

#### Response (200 OK)

```json
{
  "id": "uuid",
  "personId": "uuid",
  "timestamp": "2025-10-16T12:30:00.000Z",
  "mealType": "lunch",
  "notes": "Birthday lunch with family",
  "photos": [
    {
      "id": "photo-uuid-1",
      "storagePath": "person-id/meals/timestamp-1.jpg",
      "publicUrl": "https://.../food-photos/person-id/meals/timestamp-1.jpg",
      "analysisStatus": "completed",
      "analysisCompletedAt": "2025-10-16T12:30:15.000Z",
      "ingredients": [
        {
          "name": "Grilled chicken breast",
          "quantity": 150,
          "unit": "g",
          "calories": 165,
          "carbsG": 0,
          "proteinG": 31,
          "fatG": 3.6,
          "fiberG": 0
        }
      ]
    },
    {
      "id": "photo-uuid-2",
      "storagePath": "person-id/meals/timestamp-2.jpg",
      "publicUrl": "https://.../food-photos/person-id/meals/timestamp-2.jpg",
      "analysisStatus": "completed",
      "analysisCompletedAt": "2025-10-16T12:30:18.000Z",
      "ingredients": [
        {
          "name": "Caesar salad",
          "quantity": 200,
          "unit": "g",
          "calories": 180,
          "carbsG": 12,
          "proteinG": 8,
          "fatG": 12,
          "fiberG": 3
        }
      ]
    }
  ],
  "totalCalories": 345,
  "totalCarbsG": 12,
  "totalProteinG": 39,
  "totalFatG": 15.6,
  "totalFiberG": 3,
  "predictedGlucosePeak": 125.5,
  "actualGlucosePeak": null,
  "createdAt": "2025-10-16T12:30:00.000Z",
  "updatedAt": "2025-10-16T12:30:18.000Z"
}
```

#### Error Responses

**404 Not Found:**
```json
{
  "error": "Food entry not found"
}
```

---

## iOS Implementation Examples (React Native + Expo)

### Single Photo Upload (Week 5)

```typescript
import * as ImagePicker from 'expo-image-picker'
import { MealType } from '@evermed/shared'

async function uploadSinglePhoto(mealType: MealType) {
  // Pick image from camera
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  })

  if (result.canceled) return

  const photo = result.assets[0]

  // Create FormData
  const formData = new FormData()
  formData.append('photo', {
    uri: photo.uri,
    type: 'image/jpeg',
    name: 'food.jpg',
  } as any)
  formData.append('mealType', mealType)
  formData.append('eatenAt', new Date().toISOString())

  // Upload to API
  const response = await fetch('https://api.evermed.ai/api/metabolic/food', {
    method: 'POST',
    headers: {
      'x-user-id': userId, // or use Supabase session token
    },
    body: formData,
  })

  const data = await response.json()
  console.log('Upload success:', data.foodEntryId)
  console.log('Analysis status:', data.analysisStatus) // "pending"

  // Poll for completion
  await pollAnalysisStatus(data.foodEntryId)
}
```

### Multi-Photo Upload (Week 6.5)

```typescript
import * as ImagePicker from 'expo-image-picker'
import { MealType } from '@evermed/shared'

async function uploadMultiplePhotos(mealType: MealType) {
  // Pick multiple images (1-5)
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 5,
    quality: 0.8,
  })

  if (result.canceled) return

  const photos = result.assets

  // Validate: max 5 photos
  if (photos.length > 5) {
    Alert.alert('Too many photos', 'You can upload up to 5 photos per meal')
    return
  }

  // Create FormData with numbered photos
  const formData = new FormData()
  photos.forEach((photo, index) => {
    formData.append(`photo${index + 1}`, {
      uri: photo.uri,
      type: 'image/jpeg',
      name: `food-${index + 1}.jpg`,
    } as any)
  })
  formData.append('mealType', mealType)
  formData.append('eatenAt', new Date().toISOString())

  // Upload to API
  const response = await fetch('https://api.evermed.ai/api/metabolic/food', {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    Alert.alert('Upload failed', error.error)
    return
  }

  const data = await response.json()
  console.log('Uploaded', photos.length, 'photos')
  console.log('Food entry ID:', data.foodEntryId)
  console.log('Photo URLs:', data.photoUrls)

  // Navigate to meal detail screen (shows all dishes)
  navigation.navigate('MealDetail', { foodEntryId: data.foodEntryId })
}
```

### Polling for Analysis Completion

```typescript
async function pollAnalysisStatus(foodEntryId: string, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(
      `https://api.evermed.ai/api/metabolic/food/${foodEntryId}`,
      {
        headers: { 'x-user-id': userId },
      }
    )

    const data = await response.json()

    // Check if ALL photos are analyzed
    const allCompleted = data.photos.every(
      (photo: any) => photo.analysisStatus === 'completed' || photo.analysisStatus === 'failed'
    )

    if (allCompleted) {
      console.log('Analysis complete!')
      console.log('Total calories:', data.totalCalories)
      return data
    }

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('Analysis timeout after 60 seconds')
}
```

### Fetching Food History

```typescript
import { MealType } from '@evermed/shared'

async function fetchFoodHistory(mealType?: MealType, limit = 20) {
  const params = new URLSearchParams()
  if (mealType) params.append('mealType', mealType)
  params.append('limit', limit.toString())

  const response = await fetch(
    `https://api.evermed.ai/api/metabolic/food?${params}`,
    {
      headers: { 'x-user-id': userId },
    }
  )

  const data = await response.json()
  console.log('Found', data.total, 'meals')
  console.log('Entries:', data.entries)

  return data.entries
}
```

---

## Data Model

### Multi-Dish Structure

Each meal can have 1-5 photos, where each photo represents a separate dish:

```
FoodEntry (1 meal)
  ├── FoodPhoto #1 (main course)
  │   ├── Ingredient: Grilled chicken
  │   ├── Ingredient: Brown rice
  │   └── Ingredient: Steamed broccoli
  ├── FoodPhoto #2 (side dish)
  │   ├── Ingredient: Caesar salad
  │   └── Ingredient: Parmesan cheese
  └── FoodPhoto #3 (dessert)
      └── Ingredient: Greek yogurt with berries
```

**Nutrition Aggregation:**
- Each photo analyzed separately
- Ingredients linked to specific photo via `foodPhotoId`
- Total nutrition = sum across all dishes
- Per-dish nutrition available in detailed response

---

## Performance Characteristics

**Upload Response Time:**
- Single photo: 200-500ms (upload only, analysis in background)
- 5 photos: 800-1200ms (upload only)

**AI Analysis Time (background):**
- Gemini 2.5 Flash: 8-12s per photo
- OpenAI Vision: 10-15s per photo
- 5 photos: 40-60s total (analyzed in parallel)

**Storage:**
- Photos stored in Supabase Storage (public bucket)
- Path format: `{personId}/meals/{timestamp}-{index}.{ext}`
- Public URLs cached indefinitely (immutable)

---

## Feature Flags

**USE_GEMINI_FOOD_ANALYSIS:**
```bash
# Use Gemini 2.5 Flash (recommended, 40% cheaper)
USE_GEMINI_FOOD_ANALYSIS=true

# Use OpenAI GPT-4o Vision (fallback)
USE_GEMINI_FOOD_ANALYSIS=false
```

**Cost Comparison (per photo):**
- Gemini 2.5 Flash: $0.000972 (~$0.19/month at 200 photos)
- OpenAI GPT-4o: $0.001620 (~$0.32/month at 200 photos)

---

## Testing

### Manual Testing with curl

**Single Photo:**
```bash
curl -X POST https://api.evermed.ai/api/metabolic/food \
  -H "x-user-id: test-user-123" \
  -F "photo=@chicken-salad.jpg" \
  -F "mealType=lunch" \
  -F "eatenAt=2025-10-16T12:30:00Z"
```

**Multiple Photos:**
```bash
curl -X POST https://api.evermed.ai/api/metabolic/food \
  -H "x-user-id: test-user-123" \
  -F "photo1=@main-course.jpg" \
  -F "photo2=@side-dish.jpg" \
  -F "photo3=@dessert.jpg" \
  -F "mealType=dinner" \
  -F "eatenAt=2025-10-16T19:00:00Z"
```

### Integration Tests

See `tests/integration/food-upload.spec.ts` for comprehensive test suite covering:
- Single photo upload
- Multi-photo upload (2-5 photos)
- Validation errors (file size, file type, missing fields)
- Authentication errors
- Concurrent uploads
- Analysis completion polling

---

## Migration Notes

**From Single Photo to Multi-Photo:**

The API is **backwards compatible**. Existing clients using `photo` field will continue to work:

```typescript
// Old format (still works)
formData.append('photo', file)

// New format (supports 1-5 photos)
formData.append('photo1', file1)
formData.append('photo2', file2)
```

**Database Changes:**
- `FoodIngredient.foodPhotoId` added (nullable, links ingredient to specific dish)
- No breaking changes to existing tables

---

## Security

**Authentication:**
- All endpoints require valid user session
- RLS enforced: users can only access their own food entries

**File Validation:**
- Max 5MB per photo
- Max 15MB total per request
- Only image MIME types allowed
- Supabase Storage virus scanning enabled

**Privacy:**
- Photos stored in public bucket (non-PHI, food is not medical data)
- Storage paths use UUID-based personId (not guessable)
- RLS policies prevent unauthorized access to FoodEntry/FoodIngredient records

---

## Roadmap

**v1.1 (Post-Beta):**
- [ ] WebSocket for real-time analysis status updates
- [ ] Batch upload optimization (process all photos in single request)
- [ ] Image compression on server (reduce storage costs)
- [ ] Video upload support (extract frames, analyze multiple angles)

**v2.0 (Future):**
- [ ] Apple Watch photo capture
- [ ] Siri Shortcuts integration
- [ ] Offline queue (upload when connection restored)
- [ ] ML-based duplicate meal detection

---

## Support

**Questions:** Open GitHub issue with `api` label
**Bugs:** Report in `#engineering` Slack channel
**Documentation:** See `docs/metabolic-insights-prd.md` for product context
