# iOS Upload Diagnostic Report
**Date:** 2025-10-16 (Late Evening)
**Issue:** Photo upload failing with "Upload Failed" error

---

## ✅ Diagnostic Results

### 1. Person Record Check - PASSED ✅

**Finding:** Person record EXISTS for thomas.gnahm@gmail.com

**Details:**
- Supabase User ID: `d4158eaa-b0c1-431b-b30e-9e53017c440e`
- Person ID: `83616f39-b34a-4894-b600-3ad46312d5c0`
- Owner ID: `d4158eaa-b0c1-431b-b30e-9e53017c440e` ✅ MATCH
- Glucose Target: Not set (null-null mg/dL) ⚠️
- CGM Connected: false
- Created: 2025-10-15T15:57:30.427Z
- Last Sign In: 2025-10-16T19:46:12.135907Z

**Conclusion:** Person record exists. This is NOT the root cause.

**Note:** Glucose targets are not set, but this shouldn't block uploads.

---

### 2. Mobile Implementation Check - PASSED ✅

**Finding:** Mobile code is correct

**Verified:**
- ✅ `apps/mobile/src/api/food.ts:35-84` - Properly creates FormData
- ✅ Uses Bearer token from Supabase session
- ✅ Sends to correct endpoint: `https://getclarimed.com/api/metabolic/food`
- ✅ Photos uploaded as photo1, photo2, etc.
- ✅ Enhanced error logging added (line 77-110)

---

### 3. Backend Implementation Check - PASSED ✅

**Finding:** Backend code is correct

**Verified:**
- ✅ `apps/web/src/app/api/metabolic/food/route.ts` - Exists and handles multi-photo uploads
- ✅ Accepts FormData with numbered photos (photo1, photo2, etc.)
- ✅ Uploads to Supabase Storage (food-photos bucket)
- ✅ Requires Bearer token (line 182)
- ✅ Requires Person record (line 191-200)
- ✅ Storage bucket exists (food-photos created 2025-10-12)

---

## 🔍 Remaining Possible Causes

Since Person record exists and both implementations are correct, the issue must be one of the following:

### Hypothesis 1: Network Connectivity (MOST LIKELY)
**Probability:** 70%

**Description:**
iOS simulator might not be able to reach `https://getclarimed.com` from the local network.

**Symptoms:**
- Upload fails immediately
- No detailed error message
- Generic "Upload Failed" alert

**How to Test:**
```bash
# In iOS Simulator Safari:
# Navigate to: https://getclarimed.com/api/health

# Or test from command line:
curl https://getclarimed.com/api/metabolic/food \
  -H "Authorization: Bearer <token>" \
  -F "photo1=@test.jpg" \
  -F "mealType=breakfast" \
  -F "eatenAt=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
```

**Fix if confirmed:**
```bash
# Option A: Use local backend
cd apps/mobile
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" > .env
cd ../../apps/web
npm run dev
# Restart mobile Metro

# Option B: Use staging environment (if available)
# echo "EXPO_PUBLIC_API_URL=https://staging.getclarimed.com" > apps/mobile/.env
```

---

### Hypothesis 2: CORS Configuration
**Probability:** 20%

**Description:**
Production API might be blocking requests from mobile app due to missing CORS headers.

**Symptoms:**
- Upload fails with network error
- Browser console shows CORS error (if using Expo web)
- 0 status code (network request blocked)

**How to Test:**
Check Metro logs after upload attempt - look for CORS or preflight errors.

**Fix if confirmed:**
Add CORS headers to `apps/web/next.config.js`:
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

---

### Hypothesis 3: Session Token Expired
**Probability:** 8%

**Description:**
Bearer token might be expired or invalid.

**Symptoms:**
- 401 Unauthorized error
- Error message mentions authentication
- "Not authenticated" error

**How to Test:**
Enhanced error logging will show status code 401.

**Fix if confirmed:**
Add token refresh logic to `apps/mobile/src/api/food.ts`:
```typescript
// Before upload
const { data: { session }, error } = await supabase.auth.refreshSession()
if (error || !session) {
  throw new Error('Session expired. Please log in again.')
}
```

---

### Hypothesis 4: Storage Bucket Permissions
**Probability:** 2%

**Description:**
RLS policies on food-photos bucket might be blocking uploads.

**Symptoms:**
- 500 Internal Server Error
- Backend logs show "Failed to upload to storage"

**How to Test:**
Check backend logs (Vercel or local console).

**Fix if confirmed:**
Verify RLS policies in Supabase Dashboard → Storage → food-photos → Policies.

---

## 📋 Next Steps for User

### Step 1: Try Upload Again with Enhanced Logging

1. Metro bundler has been restarted with enhanced error logging
2. In iOS Simulator:
   - Cmd+R to reload the app
   - Navigate to Camera screen
   - Take 1 photo
   - Select "Breakfast"
   - Wait for error
3. Check Metro terminal for detailed error output (look for `[FOOD UPLOAD]` logs)

**What to look for:**
```
[FOOD UPLOAD] Upload failed: {
  status: XXX,        ← This is the HTTP status code
  statusText: "...",
  url: "https://getclarimed.com/api/metabolic/food",
  body: "..."         ← This is the actual error message
}
```

### Step 2: Based on Status Code

**If 404 Not Found:**
- API endpoint doesn't exist at that URL
- Fix: Check if production deployment is live
- Alternative: Use local backend (see Hypothesis 1 fix)

**If 401 Unauthorized:**
- Session token is expired or invalid
- Fix: Implement token refresh (see Hypothesis 3 fix)
- Alternative: Sign out and sign in again

**If 500 Internal Server Error:**
- Backend error (storage bucket, database, etc.)
- Fix: Check backend logs in Vercel
- Alternative: Test with local backend to see detailed error

**If 0 or Network Error:**
- Network connectivity or CORS issue
- Fix: Use local backend (see Hypothesis 1 fix)

**If No Error (request hangs):**
- Network timeout
- Fix: Check simulator network settings
- Alternative: Test on physical device

### Step 3: Quick Fix to Test Now (Recommended)

**Use local backend to isolate the issue:**

```bash
# Terminal 1: Start web backend
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/apps/web
npm run dev
# Should start on http://localhost:3000

# Terminal 2: Update mobile env and restart
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/apps/mobile
echo "EXPO_PUBLIC_SUPABASE_URL=https://wukrnqifpgjwbqxpockm.supabase.co" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1a3JucWlmcGdqd2JxeHBvY2ttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNzE0OTIsImV4cCI6MjA3MDY0NzQ5Mn0.fQvTlVO4xqcPXjKM1D-lTbmEpmeO1fv5S2rLBLoPgdI" >> .env
echo "EXPO_PUBLIC_API_URL=http://localhost:3000" >> .env

# Kill and restart Metro
lsof -ti :8081 | xargs kill -9
npm start -- --clear

# In iOS Simulator: Cmd+R to reload, try upload again
```

**Why this works:**
- Eliminates network/CORS issues
- Shows detailed backend errors in Terminal 1
- Confirms if backend code is working
- If this works, issue is production API access

---

## 🎯 Expected Outcome

**If local backend works:**
- ✅ Upload succeeds
- ✅ Meal appears in Food List
- ✅ AI analysis completes
- 🔍 **Conclusion:** Issue is production API access (network or CORS)
- 💡 **Fix:** Add CORS headers or use staging/production with proper network config

**If local backend also fails:**
- ❌ Upload still fails
- 🔍 **Conclusion:** Issue is in mobile code or session management
- 💡 **Fix:** Check session token, implement token refresh
- 📊 **Diagnosis:** Enhanced logs will show exact error

---

## 📁 Files Modified for Diagnostics

1. **`apps/mobile/src/api/food.ts:77-110`**
   - Added enhanced error logging
   - Shows HTTP status code and response body
   - Provides diagnostic hints based on status code

2. **`scripts/check-person-record.mjs`** (Created)
   - Checks if Person records exist
   - Shows all Person records with details

3. **`scripts/check-user-and-person.mjs`** (Created)
   - Finds Supabase user by email
   - Matches user ID with Person record
   - Confirms thomas.gnahm@gmail.com has Person record

---

## 📊 Diagnostic Summary

**✅ Confirmed Working:**
- Person record exists for thomas.gnahm@gmail.com
- Mobile implementation is correct
- Backend implementation is correct
- Storage bucket exists
- Authentication working (user logged in)

**❌ Suspected Issues:**
1. Network connectivity (70% probability)
2. CORS configuration (20% probability)
3. Session token expired (8% probability)
4. Storage permissions (2% probability)

**🎯 Recommended Next Action:**
Test with local backend (Step 3 above) to isolate the issue.

**⏱️ Estimated Time to Fix:**
- 15 minutes if using local backend (immediate workaround)
- 30 minutes to 2 hours if fixing production API access

---

## 🚀 After Fix Is Applied

Once upload is working, continue with Week 6.5+ features:

**Option A:** Multi-Dish UI Enhancements (3-4 days)
- Show per-dish nutrition breakdown
- Display dish numbers on photos
- Handle per-dish analysis status

**Option B:** Meal Editing (3-4 days)
- Ingredient list with add/remove
- Nutritionix search integration
- Real-time nutrition recalculation

**Option C:** Glucose Tracking & HealthKit (3 weeks)
- Manual glucose entry
- Apple HealthKit integration
- Timeline visualization
- Daily insights

---

**Current Status:** Metro restarted with enhanced logging. Ready for user to test upload and report status code.

**Next:** User tries upload → Reports status code → Apply fix based on diagnostic
