# Gemini 2.5 Flash Staging Deployment Plan

**Date:** 2025-10-12
**Feature:** Gemini 2.5 Flash food photo analysis integration
**Environment:** Staging
**Deployment Type:** Feature flag (backwards compatible)
**Risk Level:** Low (feature flag rollback available)

---

## Overview

Deploy Gemini 2.5 Flash food analysis integration to staging environment for validation before production deployment. This is a **backwards-compatible feature flag deployment** that requires **no database migrations** or **RLS policy changes**.

---

## Pre-Deployment Checklist

### Code Status
- [x] Gemini integration implemented (`apps/web/src/lib/food-analysis-gemini.ts`)
- [x] API route updated with feature flag (`apps/web/src/app/api/metabolic/food/route.ts`)
- [x] Benchmark completed and documented
- [x] Pricing constants updated to Vertex AI rates ($0.30 input, $2.50 output)
- [x] All changes committed to git (commit: 8c37412)

### Environment Requirements
- [ ] Google Cloud service account key exists in staging environment
- [ ] GOOGLE_CLOUD_PROJECT configured in Vercel staging
- [ ] GOOGLE_APPLICATION_CREDENTIALS path accessible in Vercel staging
- [ ] USE_GEMINI_FOOD_ANALYSIS set to `true` in Vercel staging
- [ ] Existing OpenAI integration remains as fallback

---

## Environment Variables Required

### Google Cloud Vertex AI
```bash
# Project ID (required)
GOOGLE_CLOUD_PROJECT=evermed-ai-1753452627

# Service account credentials (required)
# For Vercel: Store as base64-encoded JSON secret
GOOGLE_APPLICATION_CREDENTIALS_JSON=<base64-encoded service account key>

# Feature flag (required for this deployment)
USE_GEMINI_FOOD_ANALYSIS=true
```

### Existing Variables (No Changes)
```bash
# Supabase (unchanged)
NEXT_PUBLIC_SUPABASE_URL=<staging-url>
SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
DATABASE_URL=<staging-db-url>

# OpenAI (fallback - unchanged)
OPENAI_API_KEY=<existing-key>
```

---

## Deployment Steps

### Step 1: Verify Google Cloud Credentials

**Local Verification:**
```bash
# Check local service account key exists
ls -la /Users/Tom/keys/evermed-ai-1753452627-1eacdb5c2b16.json

# Test Vertex AI access locally
npm run test:gemini
```

**Expected Output:**
- Service account key file exists (2391 bytes)
- Test script successfully analyzes sample food photo
- No authentication errors

---

### Step 2: Link to Supabase Staging

```bash
# List Supabase projects
supabase projects list

# Link to staging project
supabase link --project-ref xstvypflxzyfjookyuou

# Verify database schema is in sync
supabase db diff

# Expected: No schema differences (no migrations required)
```

**Why:** Validates that staging database schema matches local development state.

**Success Criteria:**
- Successfully linked to staging project
- `supabase db diff` shows no differences
- All tables (FoodEntry, FoodIngredient, FoodPhoto) exist and match schema

---

### Step 3: Configure Vercel Staging Environment

**Navigate to Vercel Dashboard:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select EverMed project
3. Go to Settings → Environment Variables
4. Select "Preview" environment (staging)

**Add/Update Environment Variables:**

| Variable | Value | Type | Notes |
|----------|-------|------|-------|
| `GOOGLE_CLOUD_PROJECT` | `evermed-ai-1753452627` | Plain Text | Project ID |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | `<base64-encoded-json>` | Secret | Service account key (base64) |
| `USE_GEMINI_FOOD_ANALYSIS` | `true` | Plain Text | Feature flag |

**How to Encode Service Account Key:**
```bash
# Base64 encode the service account key
cat /Users/Tom/keys/evermed-ai-1753452627-1eacdb5c2b16.json | base64 > /tmp/gcp-creds-base64.txt

# Copy to clipboard
cat /tmp/gcp-creds-base64.txt | pbcopy

# Paste into Vercel environment variable
```

**Verify Existing Variables:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Set correctly for staging
- [ ] `SUPABASE_ANON_KEY` - Set correctly for staging
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Set correctly for staging
- [ ] `DATABASE_URL` - Set correctly for staging
- [ ] `OPENAI_API_KEY` - Set (fallback provider)

---

### Step 4: Deploy to Vercel Staging

**Push to staging branch:**
```bash
# Switch to dev branch (current)
git status

# Push to trigger staging deployment
git push origin dev

# Monitor deployment
vercel --prod=false
```

**Alternative: Manual Deploy via Vercel Dashboard:**
1. Go to Vercel Dashboard → Deployments
2. Click "Deploy" → Select "dev" branch
3. Wait for build to complete

**Monitor Build Logs:**
- [ ] `npm ci` completes successfully
- [ ] `prisma generate` runs without errors
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors
- [ ] No missing environment variable warnings

**Expected Build Time:** 3-5 minutes

---

### Step 5: Validate Deployment

**Automated Validation:**
```bash
# Run deployment validator subagent
# (Will navigate to staging URL and verify functionality)
./scripts/validate-deployment.sh --env staging
```

**Manual Validation Checklist:**

#### 5.1 Health Check
- [ ] Navigate to staging URL: `https://evermed-staging.vercel.app`
- [ ] App loads without errors
- [ ] Console shows no errors

#### 5.2 Authentication
- [ ] Login with test account: `testaccount@evermed.ai`
- [ ] Session persists after page refresh
- [ ] Profile loads correctly

#### 5.3 Food Photo Upload Flow
- [ ] Navigate to "Food Tracker" page
- [ ] Upload a test food photo (use `tests/fixtures/food-photos/chicken-kiev.jpg`)
- [ ] Verify analysis starts (check console logs for "Starting food photo analysis")
- [ ] Check which provider is used: Should log `(Provider: Gemini)`
- [ ] Wait for analysis to complete (10-15 seconds)
- [ ] Verify ingredients are detected and displayed
- [ ] Verify nutrition totals are calculated

#### 5.4 API Contract Validation
```bash
# Test POST /api/metabolic/food endpoint
curl -X POST https://evermed-staging.vercel.app/api/metabolic/food \
  -H "Content-Type: multipart/form-data" \
  -H "x-user-id: <test-user-id>" \
  -F "photo=@tests/fixtures/food-photos/chicken-kiev.jpg" \
  -F "mealType=lunch"
```

**Expected Response:**
```json
{
  "foodEntryId": "cm...",
  "photoUrl": "https://...",
  "mealType": "lunch",
  "timestamp": "2025-10-12T...",
  "analysisStatus": "completed",
  "ingredients": [...],
  "totalCalories": 877,
  "totalCarbsG": 45,
  "totalProteinG": 35,
  "totalFatG": 60,
  "totalFiberG": 3
}
```

#### 5.5 Performance Validation
- [ ] Response time < 15s (target: 10-12s)
- [ ] No timeouts or network errors
- [ ] Supabase storage upload succeeds
- [ ] Database write succeeds (FoodEntry, FoodPhoto, FoodIngredient created)

#### 5.6 Console Log Verification
**Expected logs in browser console:**
```
Starting food photo analysis for: <person-id>/meals/<timestamp>.jpg (Provider: Gemini)
[Gemini] Analyzing food photo: <url> (attempt 1/3)
[Gemini] Success: 5 ingredients detected in 10546ms (retry: 0, cost: $0.000972)
Analysis succeeded with 5 ingredients
```

**Expected logs in Vercel deployment logs:**
- No authentication errors
- No Vertex AI API errors
- No missing environment variable warnings
- Cost tracking logs present

---

### Step 6: Feature Flag Rollback Test

**Purpose:** Validate that disabling Gemini flag falls back to OpenAI correctly.

```bash
# Temporarily set USE_GEMINI_FOOD_ANALYSIS=false in Vercel staging
# Redeploy
# Upload test photo
# Expected console log: "(Provider: OpenAI)"
# Re-enable USE_GEMINI_FOOD_ANALYSIS=true
```

**Success Criteria:**
- [ ] Fallback to OpenAI works seamlessly
- [ ] No errors during fallback
- [ ] Food analysis still completes successfully
- [ ] Re-enabling Gemini flag works without issues

---

## Post-Deployment Verification

### Database Validation
```sql
-- Connect to staging database
-- Verify recent FoodEntry records exist
SELECT id, "personId", "mealType", timestamp, "totalCalories", "analysisStatus"
FROM "FoodEntry"
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 10;

-- Verify FoodPhoto records
SELECT id, "foodEntryId", "storagePath", "analysisStatus", "analysisCompletedAt"
FROM "FoodPhoto"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Verify FoodIngredient records
SELECT id, "foodEntryId", name, quantity, unit, calories, "carbsG"
FROM "FoodIngredient"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Success Criteria:**
- [ ] FoodEntry records created with correct `mealType`, `timestamp`, `totalCalories`
- [ ] FoodPhoto records have `analysisStatus = 'completed'`
- [ ] FoodIngredient records contain detected ingredients with nutrition data
- [ ] All foreign key relationships are correct

---

### Supabase Storage Validation
```bash
# Verify food-photos bucket is accessible
supabase storage ls food-photos

# Check recent uploads
supabase storage ls food-photos/<person-id>/meals/
```

**Success Criteria:**
- [ ] food-photos bucket exists and is public
- [ ] Recent uploads are visible
- [ ] Files are accessible via public URL
- [ ] RLS policies allow user-specific uploads

---

### Cost Monitoring
```bash
# Check Google Cloud Console → Vertex AI → Usage
# Verify API calls are logged
# Expected cost per photo: $0.000972
# Expected cost for 10 test photos: ~$0.01
```

**Success Criteria:**
- [ ] Vertex AI API calls logged in Google Cloud Console
- [ ] Cost per request matches expected ($0.000972)
- [ ] No unexpected API errors or retries

---

## Known Issues & Warnings

### ⚠️ Pre-Existing Test Failures
**Issue:** 9 test failures in analytics tests (unrelated to Gemini integration)
- `tests/unit/analytics/daily-insights.spec.ts` (6 failures)
- `tests/unit/analytics/glucose-correlation.spec.ts` (1 failure)
- `tests/unit/analytics/timeline-queries.spec.ts` (1 failure)
- `tests/unit/auth.spec.ts` (1 failure)

**Impact:** None on Gemini deployment (analytics features not used in staging)

**Action Required:** Fix tests in separate PR before production deployment

---

### ⚠️ Google Cloud Service Account Key Storage
**Issue:** Service account key must be stored securely in Vercel

**Recommended Approach:**
1. Store as **base64-encoded Secret** in Vercel
2. Decode at runtime in Next.js API route
3. Never commit raw service account key to git
4. Rotate key every 90 days

**Alternative:** Use Google Cloud Workload Identity (for production)

---

### ⚠️ Response Time Variance
**Expected:** Gemini 2.5 Flash response time: 8-12 seconds
**Spike Potential:** First request after cold start may take 15-20 seconds
**Mitigation:** Implement loading state in UI (spinner + "Analyzing your meal..." message)

---

### ⚠️ Context Caching Not Yet Implemented
**Current Cost:** $0.000972 per photo (no optimization)
**Planned Cost:** $0.000300 per photo (with context caching - 70% savings)
**Implementation:** Phase 2 (after production validation)

---

## Rollback Plan

### Scenario 1: Gemini API Fails
**Symptoms:** 500 errors, "Vertex AI unavailable" logs
**Action:** Set `USE_GEMINI_FOOD_ANALYSIS=false` in Vercel staging
**Rollback Time:** < 2 minutes (instant feature flag toggle)
**Impact:** Falls back to OpenAI (no user-facing downtime)

### Scenario 2: Service Account Key Issue
**Symptoms:** Authentication errors, 403 Forbidden
**Action:**
1. Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
2. Re-encode and re-upload service account key
3. Redeploy staging
**Rollback Time:** < 5 minutes

### Scenario 3: Cost Overrun
**Symptoms:** Unexpected high costs in Google Cloud Console
**Action:**
1. Set billing alert in Google Cloud (threshold: $10/day)
2. Disable feature flag immediately
3. Investigate cost spike (retry loops, image size issues)
**Rollback Time:** < 2 minutes

### Scenario 4: Low Accuracy
**Symptoms:** User reports incorrect ingredient detection
**Action:**
1. Collect 10+ sample photos with incorrect results
2. Analyze prompt engineering improvements
3. Consider hybrid approach (GPT-4.1-mini for simple meals)
**Rollback Time:** N/A (not a blocker, iterate on prompt)

---

## Success Criteria

### Technical
- [x] Build completes successfully
- [ ] No console errors on staging
- [ ] Food photo analysis completes in < 15s
- [ ] Gemini provider logs present
- [ ] Fallback to OpenAI works correctly
- [ ] Database records created correctly
- [ ] Supabase storage uploads succeed

### Functional
- [ ] User can upload food photo
- [ ] Ingredients detected correctly (≥80% accuracy)
- [ ] Nutrition totals calculated correctly
- [ ] Food entry displays in timeline
- [ ] No user-facing errors

### Business
- [ ] Cost per photo ≤ $0.001 (target: $0.000972)
- [ ] No critical errors in 24-hour monitoring
- [ ] Ready for production deployment

---

## Next Steps

### After Staging Validation (Day 1-2)
- [ ] Monitor staging for 24-48 hours
- [ ] Collect user feedback from internal testing
- [ ] Validate cost projections are accurate
- [ ] Update `FOOD_ANALYSIS_MODEL_DECISION.md` with staging results

### Production Deployment (Week 1)
- [ ] Fix pre-existing test failures
- [ ] Run full CI/CD pipeline
- [ ] Update Vercel production environment variables
- [ ] Deploy to production with `USE_GEMINI_FOOD_ANALYSIS=true`
- [ ] Monitor for 2 weeks (see success criteria in decision doc)

### Optimization (Month 1)
- [ ] Implement context caching (90% discount on system prompts)
- [ ] Optimize prompt for better granularity
- [ ] Benchmark Gemini 2.5 Flash-Lite for simple meals

---

## Contact & Support

**Deployment Owner:** Product/Engineering Team
**Google Cloud Support:** Enterprise support enabled
**Supabase Support:** Pro tier support
**Vercel Support:** Pro tier support

**Escalation Path:**
1. Check deployment logs in Vercel
2. Check Vertex AI logs in Google Cloud Console
3. Check Supabase logs for database/storage issues
4. Rollback via feature flag if critical

---

## Documentation References

- **Decision Doc:** `docs/FOOD_ANALYSIS_MODEL_DECISION.md`
- **Benchmark Report:** `docs/GEMINI_VS_OPENAI_BENCHMARK_REPORT.md`
- **Implementation:** `apps/web/src/lib/food-analysis-gemini.ts`
- **API Route:** `apps/web/src/app/api/metabolic/food/route.ts`
- **Environment Setup:** `docs/DEVELOPER_WORKFLOW.md`

---

**Deployment Status:** Ready for staging deployment
**Last Updated:** 2025-10-12
**Next Review:** After 24-hour staging validation
