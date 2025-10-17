# iOS Action Plan - Photo Upload Fix
**Created:** 2025-10-16 (Evening)
**Status:** Ready for Implementation

## 🎯 Current Situation

**✅ What's Working:**
- iOS app successfully running in simulator
- All 4 tabs rendering correctly (Dashboard, Food, Glucose, Profile)
- Authentication working (thomas.gnahm@gmail.com logged in)
- Camera capture working (photos successfully taken and shown as "1/5 Photos")
- Session persistence working (stays logged in after app reload)

**❌ Current Blocker:**
- Photo upload failing with generic "Upload Failed" error
- User can select meal type (Breakfast/Lunch/Dinner/Snack) but upload request fails

**📊 Progress:**
- **Weeks 1-7 Complete** (~50% of 15-week roadmap)
- 18 files created, ~2,500 lines of production code
- Full TypeScript type safety
- All iOS best practices followed

---

## 🔍 Root Cause Analysis

### Investigation Findings

**Mobile Implementation (Correct ✅):**
- `apps/mobile/src/api/food.ts:35-84` - Properly creates FormData with photos
- Uses Bearer token from Supabase session
- Sends to `https://getclarimed.com/api/metabolic/food`
- Photos uploaded as `photo1`, `photo2`, etc.

**Backend Implementation (Correct ✅):**
- `apps/web/src/app/api/metabolic/food/route.ts` - Exists and handles multi-photo uploads
- Accepts FormData with `photo1`, `photo2`, etc.
- Requires Bearer token authentication
- Uploads to Supabase Storage (`food-photos` bucket)

**Likely Issues (Need Investigation):**

1. **Network Connectivity** (MOST LIKELY)
   - iOS simulator might not be able to reach `https://getclarimed.com`
   - Production API might be blocking mobile origins
   - CORS configuration issue

2. **Person Record Missing**
   - Backend requires `Person` record: `apps/web/src/app/api/metabolic/food/route.ts:191-200`
   - New user `thomas.gnahm@gmail.com` might not have completed onboarding
   - Would return 404: "Person record not found"

3. **Authentication Token Issue**
   - Bearer token might be expired or invalid
   - Session refresh might not be working

4. **Storage Bucket Permissions**
   - `food-photos` bucket might not exist
   - RLS policies might be blocking uploads

---

## 🛠️ Action Plan

### Phase 1: Diagnose Upload Failure (30 minutes)

#### Step 1.1: Check Person Record
```bash
# Check if Person record exists for thomas.gnahm@gmail.com
cd apps/web
npm run dev

# In browser console or API test:
# GET https://getclarimed.com/api/metabolic/onboarding
# Headers: { "x-user-id": "<supabase-user-id>" }
```

**Expected Result:**
- If Person exists → Continue to Step 1.2
- If Person missing → Create Person record (see Step 1.1a)

#### Step 1.1a: Create Person Record (If Missing)
```bash
# Option A: Use onboarding endpoint
curl -X POST https://getclarimed.com/api/metabolic/onboarding \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "glucoseTargetMin": 70,
    "glucoseTargetMax": 180,
    "preferredUnits": "mg/dL"
  }'

# Option B: Manually create in Supabase dashboard
# Go to Supabase → Table Editor → Person → Insert row
# Set: ownerId = <supabase-user-id>, preferredUnits = "mg/dL"
```

#### Step 1.2: Test Backend Endpoint Directly
```bash
# Test if backend endpoint is accessible from command line
curl -X POST https://getclarimed.com/api/metabolic/food \
  -H "Authorization: Bearer <session-access-token>" \
  -F "photo1=@/path/to/test-image.jpg" \
  -F "mealType=breakfast" \
  -F "eatenAt=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
```

**Expected Results:**
- 201 Created → Backend working, issue is mobile-specific
- 401 Unauthorized → Token issue
- 404 Person not found → Person record missing
- 500 Server Error → Backend issue (check logs)

#### Step 1.3: Add Detailed Error Logging to Mobile
Edit `apps/mobile/src/api/food.ts:77-80` to capture full error:

```typescript
if (!response.ok) {
  const errorText = await response.text()
  console.error('[FOOD UPLOAD] Upload failed:', {
    status: response.status,
    statusText: response.statusText,
    body: errorText,
    url: `${API_BASE_URL}/api/metabolic/food`,
  })

  let errorMessage = `Upload failed: ${response.status}`
  try {
    const error = JSON.parse(errorText)
    errorMessage = error.error || errorMessage
  } catch {
    errorMessage = errorText || errorMessage
  }

  throw new Error(errorMessage)
}
```

**Then:**
1. Restart Metro bundler: `cd apps/mobile && npm start -- --clear`
2. Reload app in simulator: Cmd+R
3. Try upload again
4. Check Metro logs for detailed error

#### Step 1.4: Check Metro Logs
```bash
# Check running Metro process
lsof -ti :8081

# If Metro is running, check logs:
# Look for [FOOD UPLOAD] error messages in terminal
```

---

### Phase 2: Fix Based on Diagnosis (1-2 hours)

#### Fix A: Person Record Missing (15 minutes)

**If Step 1.1 shows Person record missing:**

1. Complete onboarding in mobile app:
   - Add onboarding screen before dashboard
   - Collect glucose targets (70-180 mg/dL)
   - POST to `/api/metabolic/onboarding`

2. **Quick Fix (For Testing):**
   - Manually create Person record in Supabase dashboard
   - Table: `Person`
   - Columns: `ownerId = <supabase-user-id>`, `preferredUnits = "mg/dL"`

#### Fix B: Network/CORS Issue (30 minutes)

**If Step 1.2 shows CORS or network errors:**

1. **Option A: Use Local Backend for Development**
   ```bash
   # Update mobile .env
   cd apps/mobile
   echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env

   # Start web backend locally
   cd ../../apps/web
   npm run dev

   # Restart mobile Metro
   cd ../mobile
   npm start -- --clear
   ```

2. **Option B: Add CORS Headers to Production**
   Edit `apps/web/next.config.js` to allow mobile origins:
   ```javascript
   async headers() {
     return [
       {
         source: '/api/:path*',
         headers: [
           { key: 'Access-Control-Allow-Origin', value: '*' },
           { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
           { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
         ],
       },
     ]
   }
   ```

#### Fix C: Storage Bucket Missing (20 minutes)

**If Step 1.2 shows "Failed to upload to storage":**

1. Check if `food-photos` bucket exists:
   ```bash
   supabase link --project-ref wukrnqifpgjwbqxpockm
   supabase storage ls
   ```

2. Create bucket if missing:
   ```bash
   supabase storage create food-photos --public
   ```

3. Apply RLS policies:
   ```sql
   -- Allow authenticated users to upload to their own folder
   CREATE POLICY "Users can upload their own food photos"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'food-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow authenticated users to read their own photos
   CREATE POLICY "Users can view their own food photos"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'food-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

#### Fix D: Token Refresh Issue (30 minutes)

**If Step 1.2 shows 401 Unauthorized:**

1. Update `apps/mobile/src/api/food.ts` to refresh token:
   ```typescript
   export async function uploadFoodPhotos(
     photoUris: string[],
     mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
   ): Promise<FoodEntry> {
     // Refresh session before upload
     const { data: { session }, error } = await supabase.auth.refreshSession()

     if (error || !session) {
       throw new Error('Session expired. Please log in again.')
     }

     // ... rest of upload logic
   }
   ```

---

### Phase 3: Test End-to-End (30 minutes)

**After applying fixes:**

1. **Restart Everything:**
   ```bash
   # Kill Metro
   lsof -ti :8081 | xargs kill -9

   # Restart Metro with clear cache
   cd apps/mobile
   npm start -- --clear

   # Reload app in simulator (Cmd+R)
   ```

2. **Test Upload Flow:**
   - [ ] Open Camera screen
   - [ ] Take 1 photo
   - [ ] Select "Breakfast"
   - [ ] Verify success message appears
   - [ ] Navigate to Food List
   - [ ] Verify meal appears with "pending" status
   - [ ] Wait 10-15 seconds for AI analysis
   - [ ] Pull-to-refresh Food List
   - [ ] Verify meal shows nutrition data

3. **Test Multi-Photo Upload:**
   - [ ] Take 3 photos
   - [ ] Select "Lunch"
   - [ ] Verify all 3 photos uploaded
   - [ ] Check backend database for FoodEntry with 3 FoodPhoto records

4. **Test Error Cases:**
   - [ ] Try upload with no photos → Should show "No Photos" alert
   - [ ] Try upload with 6 photos → Should block at 5 photos
   - [ ] Turn off WiFi → Should show network error

---

### Phase 4: Next Features (Once Upload Working)

#### Option A: Week 6.5 - Multi-Dish UI Enhancements (3-4 days)
**Goal:** Show per-dish nutrition breakdown

**Files to Modify:**
- `apps/mobile/src/screens/food/FoodDetailScreen.tsx`
- `apps/mobile/src/screens/food/FoodListScreen.tsx`

**Features:**
- Display dish numbers on photo thumbnails (Dish 1, Dish 2, etc.)
- Show per-dish nutrition breakdown in detail view
- Handle per-dish analysis status (pending/completed/failed per photo)
- Horizontal scroll through dishes with nutrition for each

**Estimated Time:** 3-4 days

#### Option B: Week 7.5 - Meal Editing (3-4 days)
**Goal:** Edit ingredients and recalculate nutrition

**Files to Create:**
- `apps/mobile/src/screens/food/EditIngredientScreen.tsx`

**Files to Modify:**
- `apps/mobile/src/screens/food/FoodDetailScreen.tsx` (add Edit button)
- `apps/mobile/src/api/food.ts` (add updateFoodEntry function)

**Features:**
- Ingredient list with add/remove buttons
- Nutritionix search integration
- Real-time nutrition recalculation
- PATCH `/api/metabolic/food/[id]` integration

**Estimated Time:** 3-4 days

#### Option C: Week 8-10 - Glucose Tracking & HealthKit (3 weeks)
**Goal:** Manual glucose entry and Apple Health integration

**Files to Create:**
- `apps/mobile/src/screens/glucose/ManualEntryScreen.tsx`
- `apps/mobile/src/api/healthkit.ts`
- `apps/mobile/src/screens/glucose/TimelineScreen.tsx`
- `apps/mobile/src/screens/glucose/InsightsScreen.tsx`

**Features:**
- Manual glucose entry form (value, timestamp, source)
- Apple HealthKit integration (request permissions, read glucose data)
- Timeline visualization (glucose + meals on same chart)
- Daily insights display (glucose spikes, stable meals, trends)
- Pattern detection (glucose-meal correlation)

**Estimated Time:** 3 weeks

---

## 📋 Recommended Next Steps

### Immediate (Today):
1. ✅ **Run Phase 1 diagnostics** (30 minutes)
2. ✅ **Apply appropriate fix from Phase 2** (1-2 hours)
3. ✅ **Test end-to-end upload flow** (30 minutes)

### Short-Term (Next 3-4 Days):
4. ✅ **Choose between:**
   - **Option A:** Multi-Dish UI Enhancements (Week 6.5)
   - **Option B:** Meal Editing (Week 7.5)
   - **Option C:** Skip ahead to Glucose Tracking (Week 8-10)

### Medium-Term (Next 2 Weeks):
5. ✅ Complete remaining Week 6.5 and 7.5 features
6. ✅ Begin Week 8-10 glucose tracking implementation

### Long-Term (Next 8 Weeks):
7. ✅ Complete Weeks 8-15 (Glucose, Analytics, Reports, Polish, Testing, App Store)

---

## 🎯 Success Criteria

**Phase 1 Complete When:**
- ✅ Root cause of upload failure identified
- ✅ Clear error message shown in Metro logs

**Phase 2 Complete When:**
- ✅ Photo upload succeeds (201 Created response)
- ✅ Meal appears in Food List with "pending" status
- ✅ AI analysis completes within 15 seconds
- ✅ Nutrition data appears after refresh

**Phase 3 Complete When:**
- ✅ All upload test cases pass (1 photo, 3 photos, error cases)
- ✅ End-to-end flow works without errors
- ✅ Pull-to-refresh updates meal list correctly

**Ready for Next Feature When:**
- ✅ Upload tested with 10+ meals
- ✅ No crashes or errors in Metro logs
- ✅ UI flows smoothly without lag

---

## 🔧 Troubleshooting Tips

### If Metro Won't Start:
```bash
lsof -ti :8081 | xargs kill -9
cd apps/mobile
rm -rf .expo node_modules
npm install
npm start -- --clear
```

### If App Shows Blank Screen:
```bash
# Clear iOS simulator cache
xcrun simctl erase all

# Reinstall app
cd apps/mobile
npm start -- --clear
# Press 'i' to open iOS simulator
```

### If Upload Hangs Indefinitely:
1. Check Metro logs for network errors
2. Verify backend is running: `curl https://getclarimed.com/api/health`
3. Check simulator has network access: `ping google.com` in simulator Safari

### If Session Expired:
1. Sign out and sign in again
2. Check token expiry: `console.log(session.expires_at)` in code
3. Verify Supabase project is active (not paused)

---

## 📊 Current Roadmap Status

**✅ Completed (Weeks 1-7):**
- Week 1-2: Foundation
- Prerequisites: Backend API Support
- Week 3-4: Authentication & Navigation
- Week 5-7: Food Tracking & Camera

**🚨 BLOCKED (Photo Upload Fix Required):**
- Week 6.5: Multi-Photo & Multi-Dish Support
- Week 7.5: Meal Editing & Deletion

**⏳ Remaining (Weeks 8-15):**
- Week 8-10: Glucose Tracking & HealthKit (3 weeks)
- Week 10.5: Correlation Analytics & Settings (3-4 days)
- Week 11: Weekly Reports & PDF Export (1 week)
- Week 12: Polish (1 week)
- Week 13-14: Beta Testing (2 weeks)
- Week 15: App Store Submission

**Total Remaining:** ~8 weeks development + 2 weeks testing

---

## 🎉 When Upload Is Fixed

**You'll be able to:**
- ✅ Take photos of meals in <5 seconds
- ✅ Get AI nutrition analysis automatically
- ✅ View complete meal history
- ✅ Delete meals with confirmation
- ✅ Pull-to-refresh to update status

**Then move on to:**
- Multi-dish support (show per-photo nutrition)
- Meal editing (add/remove ingredients)
- Glucose tracking (manual entry + HealthKit)
- Timeline visualization (glucose + meals)
- Weekly reports for doctor appointments

---

**Next Step:** Run Phase 1 diagnostics to identify the root cause of upload failure.

**Let me know when you're ready to start Phase 1, or if you want me to run the diagnostics automatically!**
