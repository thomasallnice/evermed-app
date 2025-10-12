# Gemini 2.5 Flash Staging Deployment - Execution Checklist

**Date:** 2025-10-12
**Environment:** Staging
**Deployment Type:** Feature flag (no DB changes)
**Status:** Ready to execute

---

## Quick Summary

This is a **low-risk, backwards-compatible deployment** with:
- ✅ No database migrations required
- ✅ No RLS policy changes required
- ✅ Feature flag rollback available (< 2 minutes)
- ✅ OpenAI fallback if Gemini fails
- ✅ All code committed to git

**Estimated Time:** 15-20 minutes
**Risk Level:** Low

---

## Pre-Flight Checks

### Code Status
- [x] Latest commit: `8c37412` (Gemini pricing fix)
- [x] Branch: `dev`
- [x] All changes committed
- [x] No uncommitted migrations

### Local Environment
- [x] Google Cloud service account key exists: `/Users/Tom/keys/evermed-ai-1753452627-1eacdb5c2b16.json`
- [x] Local `.env.local` configured correctly
- [x] Project ID: `evermed-ai-1753452627`

---

## Execution Steps

### Step 1: Verify Local Build ✅

**Command:**
```bash
npm run build
```

**Expected:** Build completes without errors

**If fails:** Fix TypeScript errors before proceeding

---

### Step 2: Prepare Google Cloud Credentials

**Encode service account key for Vercel:**
```bash
# Navigate to project root
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed

# Base64 encode the service account key
cat /Users/Tom/keys/evermed-ai-1753452627-1eacdb5c2b16.json | base64 > /tmp/gcp-creds-base64.txt

# Display encoded value (copy this)
cat /tmp/gcp-creds-base64.txt
```

**Copy to clipboard:**
```bash
cat /tmp/gcp-creds-base64.txt | pbcopy
```

---

### Step 3: Configure Vercel Staging Environment Variables

**Navigate to Vercel:**
1. Go to https://vercel.com/dashboard
2. Select **EverMed** project
3. Click **Settings** → **Environment Variables**
4. Filter by **Preview** environment (staging)

**Add/Update these variables:**

| Variable Name | Value | Environment | Type |
|---------------|-------|-------------|------|
| `GOOGLE_CLOUD_PROJECT` | `evermed-ai-1753452627` | Preview | Plain Text |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | `<paste base64 value>` | Preview | Secret |
| `USE_GEMINI_FOOD_ANALYSIS` | `true` | Preview | Plain Text |

**Verify existing variables are correct:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Staging Supabase URL
- [ ] `SUPABASE_ANON_KEY` - Staging anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Staging service role key
- [ ] `DATABASE_URL` - Staging database URL
- [ ] `OPENAI_API_KEY` - Set (fallback provider)

**Screenshot for reference:** Save Vercel environment variables page

---

### Step 4: Run Staging Deployment Script

**Command:**
```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed
./scripts/deploy-staging.sh
```

**What it does:**
1. Verifies local build
2. Applies migrations to staging database (none expected)
3. Validates schema matches Prisma schema
4. Prints next steps

**Expected output:**
```
✅ Local build passed
✅ Migrations applied successfully
✅ Schema validated successfully
✅ Staging database is ready!
```

**If migration fails:**
- Check staging database connection
- Verify `DATABASE_URL` in staging environment
- Run `DATABASE_URL="<staging-url>" npm run prisma:migrate:status`

---

### Step 5: Deploy to Vercel Staging

**Option A: Push to trigger deployment**
```bash
# Push dev branch to trigger staging deployment
git push origin dev
```

**Option B: Manual deploy via Vercel UI**
1. Go to Vercel Dashboard → **Deployments**
2. Click **Deploy** → Select `dev` branch
3. Wait for build to complete

**Monitor deployment:**
- Open Vercel deployment logs
- Watch for:
  - `npm ci` success
  - `prisma generate` success
  - `npm run build` success
  - No environment variable warnings
  - No TypeScript errors

**Deployment URL:** `https://evermed-staging.vercel.app` (or Preview URL from Vercel)

**Expected build time:** 3-5 minutes

---

### Step 6: Initial Smoke Test

**Once deployment completes:**

**6.1 Navigate to staging URL**
```bash
# Open in browser
open https://evermed-staging.vercel.app
```

**6.2 Check browser console**
- [ ] No JavaScript errors
- [ ] No 404 errors for assets
- [ ] No CORS errors

**6.3 Test authentication**
- [ ] Navigate to `/auth/login`
- [ ] Login with: `testaccount@evermed.ai`
- [ ] Verify redirect to dashboard
- [ ] Check session persists after page refresh

---

### Step 7: Test Food Photo Analysis (Critical)

**7.1 Navigate to Food Tracker**
```
https://evermed-staging.vercel.app/food-tracker
```

**7.2 Upload test photo**
- Use local test file: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/tests/fixtures/food-photos/chicken-kiev.jpg`
- Or take a photo of real food

**7.3 Monitor browser console logs**

**Expected console output:**
```
Starting food photo analysis for: <person-id>/meals/<timestamp>.jpg (Provider: Gemini)
[Gemini] Analyzing food photo: <url> (attempt 1/3)
[Gemini] Success: 5 ingredients detected in 10546ms (retry: 0, cost: $0.000972)
Analysis succeeded with 5 ingredients
```

**7.4 Verify results**
- [ ] Analysis completes in 10-15 seconds
- [ ] Ingredients are displayed in UI
- [ ] Nutrition totals are calculated
- [ ] No error messages shown to user

**7.5 Check Vercel deployment logs**
- [ ] No Vertex AI authentication errors
- [ ] No missing environment variable warnings
- [ ] Cost tracking logs present

---

### Step 8: Database Validation

**Connect to staging database:**
```bash
# Use staging DB URL from deploy-staging.sh
DATABASE_URL="postgres://postgres:PX%3F%26onwW4n36d%3FCr3nHsnM7r@db.jwarorrwgpqrksrxmesx.supabase.co:5432/postgres" npx prisma studio
```

**Or use SQL query:**
```sql
-- Verify recent FoodEntry records
SELECT
  id,
  "personId",
  "mealType",
  timestamp,
  "totalCalories",
  "totalCarbsG",
  "totalProteinG",
  "totalFatG"
FROM "FoodEntry"
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 5;

-- Verify FoodPhoto analysis status
SELECT
  id,
  "foodEntryId",
  "storagePath",
  "analysisStatus",
  "analysisCompletedAt"
FROM "FoodPhoto"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Verify FoodIngredient details
SELECT
  id,
  "foodEntryId",
  name,
  quantity,
  unit,
  calories,
  "carbsG",
  "proteinG",
  "fatG"
FROM "FoodIngredient"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Success criteria:**
- [ ] FoodEntry created with correct data
- [ ] FoodPhoto has `analysisStatus = 'completed'`
- [ ] FoodIngredient records contain detected ingredients
- [ ] All foreign keys are correct

---

### Step 9: Test Feature Flag Rollback

**Purpose:** Verify fallback to OpenAI works

**9.1 Disable Gemini flag in Vercel**
1. Go to Vercel → Settings → Environment Variables
2. Change `USE_GEMINI_FOOD_ANALYSIS` to `false`
3. Trigger redeploy (or wait for next PR deployment)

**9.2 Upload another test photo**

**Expected console output:**
```
Starting food photo analysis for: <person-id>/meals/<timestamp>.jpg (Provider: OpenAI)
[OpenAI] Analyzing food photo...
Analysis succeeded with <N> ingredients
```

**9.3 Re-enable Gemini flag**
1. Change `USE_GEMINI_FOOD_ANALYSIS` back to `true`
2. Redeploy

**Success criteria:**
- [ ] Fallback to OpenAI works seamlessly
- [ ] No errors during provider switch
- [ ] Re-enabling Gemini works correctly

---

### Step 10: Performance & Cost Validation

**10.1 Check Google Cloud Console**
1. Go to https://console.cloud.google.com
2. Select project: `evermed-ai-1753452627`
3. Navigate to **Vertex AI** → **Usage**

**Verify:**
- [ ] API calls are logged
- [ ] Cost per request: ~$0.000972
- [ ] No unexpected errors or retries

**10.2 Performance check**
- [ ] Average response time: 10-12s
- [ ] No timeouts (30s threshold)
- [ ] Cold start time: < 20s

**10.3 Supabase Storage check**
- [ ] Photos uploaded successfully
- [ ] Public URLs are accessible
- [ ] No storage errors in logs

---

## Post-Deployment Monitoring

### 24-Hour Monitoring Period

**What to watch:**
1. **Error Rate:** Monitor Vercel logs for 500 errors
2. **Response Time:** Track average food analysis time
3. **Cost:** Monitor Google Cloud billing for unexpected spikes
4. **User Reports:** Collect internal feedback on accuracy

**Success criteria:**
- [ ] Error rate < 1%
- [ ] Average response time < 12s
- [ ] Cost per photo ≤ $0.001
- [ ] No critical user-facing issues

---

## Rollback Plan

### If Critical Issues Found

**Immediate rollback (< 2 minutes):**
```bash
# Option 1: Feature flag toggle in Vercel
# Set USE_GEMINI_FOOD_ANALYSIS=false

# Option 2: Revert git commit
git revert HEAD
git push origin dev
```

**When to rollback:**
- 500 errors > 5% of requests
- Average response time > 20s
- Cost spike (> $0.01 per photo)
- Authentication errors with Vertex AI
- Critical user-facing errors

---

## Known Issues & Warnings

### ⚠️ Pre-Existing Test Failures
- 9 tests failing in analytics suite (unrelated to Gemini)
- **Action:** Fix in separate PR before production

### ⚠️ First Request After Cold Start
- May take 15-20 seconds (vs 10-12s normally)
- **Mitigation:** Show loading spinner in UI

### ⚠️ Service Account Key Rotation
- Rotate every 90 days for security
- **Next rotation:** 2025-01-10

### ⚠️ Context Caching Not Yet Implemented
- Current cost: $0.000972 per photo
- Planned cost: $0.000300 per photo (Phase 2)

---

## Next Steps After Staging Validation

### Immediate (Day 1-2)
- [ ] Monitor staging for 24-48 hours
- [ ] Collect internal team feedback
- [ ] Validate cost projections match reality
- [ ] Document any issues or improvements needed

### Short-term (Week 1)
- [ ] Fix pre-existing test failures
- [ ] Update FOOD_ANALYSIS_MODEL_DECISION.md with staging results
- [ ] Prepare production deployment plan
- [ ] Get stakeholder approval for production deployment

### Medium-term (Month 1)
- [ ] Deploy to production with monitoring
- [ ] Implement context caching optimization
- [ ] Optimize prompt for better granularity
- [ ] Collect user feedback on accuracy

---

## Success Checklist

**Mark complete when:**
- [x] Code committed to git
- [ ] Local build passes
- [ ] Vercel environment variables configured
- [ ] Deployment script completes successfully
- [ ] Vercel staging deployment succeeds
- [ ] Browser console shows no errors
- [ ] Food photo analysis works with Gemini
- [ ] Database records created correctly
- [ ] Feature flag rollback tested successfully
- [ ] Google Cloud billing shows expected costs
- [ ] 24-hour monitoring shows no critical issues

---

## Contact & Escalation

**Deployment Owner:** Engineering Team
**Status Dashboard:** Vercel Deployment Logs
**Google Cloud Console:** https://console.cloud.google.com/vertex-ai?project=evermed-ai-1753452627
**Supabase Dashboard:** https://supabase.com/dashboard/project/xstvypflxzyfjookyuou

**Escalation Path:**
1. Check Vercel deployment logs
2. Check Vertex AI logs in Google Cloud Console
3. Check Supabase logs for database/storage issues
4. Rollback via feature flag if critical

---

**Deployment Status:** ✅ Ready to execute
**Last Updated:** 2025-10-12
**Estimated Time:** 15-20 minutes
