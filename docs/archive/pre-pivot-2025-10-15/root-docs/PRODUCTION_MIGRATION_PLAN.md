# Production Migration Plan - Metabolic Insights Feature

**Target Environment:** Production Supabase (glqtomnhltolgbxiagbk)
**Created:** 2025-10-14
**Status:** Ready for Execution

---

## Overview

This document provides a step-by-step plan to deploy the Metabolic Insights feature to production. The feature is already deployed and tested in staging (jwarorrwgpqrksrxmesx), and this plan ensures a safe, reversible deployment to production.

---

## Pre-Deployment Checklist

### Environment Configuration

- [ ] **Verify production Supabase project ID:** glqtomnhltolgbxiagbk
- [ ] **Ensure you have admin access** to production Supabase dashboard
- [ ] **Verify Vercel production environment** has correct `DATABASE_URL` pointing to production
- [ ] **Backup production database** (automatic daily backups are enabled, but verify latest)
- [ ] **Notify team** of deployment window (estimated 15-20 minutes)

### Local Setup

- [ ] **Install Supabase CLI** (v2.51.0 or later recommended)
- [ ] **Authenticate with Supabase CLI:** `supabase login`
- [ ] **Clone/pull latest code** from `main` branch

---

## Migration Components

### 1. Database Schema Migrations (3 files)

**Total: 11 new tables + 3 Person table columns**

| Migration File | Description | Tables Created |
|---------------|-------------|----------------|
| `20251010090000_add_metabolic_insights` | Core metabolic tables | 9 tables + 3 columns |
| `20251010090001_add_metabolic_rls_policies` | Row-level security policies | 0 tables (policies only) |
| `20251012000000_add_admin_users` | Admin authentication table | 1 table |

**Tables to be created:**
1. `food_entries` - Meal logging with nutrition totals
2. `food_photos` - Photo storage metadata with analysis status
3. `food_ingredients` - Detailed ingredient breakdown
4. `glucose_readings` - Time-series glucose data (CGM/manual)
5. `glucose_predictions` - AI glucose forecasts
6. `personal_models` - Per-user ML model metadata
7. `meal_templates` - Reusable meal recipes
8. `metabolic_insights` - Daily/weekly summaries
9. `subscription_tiers` - Usage limits and billing
10. `admin_users` - Admin role tracking (security-critical)

**Enums to be created:**
- `MealType` (breakfast, lunch, dinner, snack)
- `AnalysisStatus` (pending, completed, failed)
- `IngredientSource` (ai_detected, manual_entry, nutrition_api)
- `GlucoseSource` (cgm, fingerstick, lab, interpolated)
- `InsightType` (daily_summary, weekly_report, pattern_detected)
- `TierLevel` (free, premium, family)

### 2. Storage Buckets (2 buckets)

| Bucket ID | Visibility | Size Limit | MIME Types | Path Structure |
|-----------|-----------|------------|------------|----------------|
| `food-photos` | PUBLIC (required for OpenAI) | 5 MB | JPEG, PNG, WEBP | `{userId}/{photoId}.jpg` |
| `ml-models` | PRIVATE | 50 MB | JSON, binary | `{userId}/{modelType}/{version}.json` |

**IMPORTANT:** `food-photos` MUST be public for OpenAI Vision API to access images. RLS policies enforce write-only access (users can only upload to their own folder).

### 3. RLS Policies

**Total: 45 policies**

- **9 tables × 4 operations (SELECT, INSERT, UPDATE, DELETE)** = 36 policies for user data
- **2 storage buckets × 4 operations** = 8 storage policies
- **1 admin_users table** = 3 service-role-only policies

**Security enforcement:**
- All queries filter by `Person.ownerId = auth.uid()`
- Transitive ownership through foreign keys (e.g., food_photos → food_entries → Person)
- Storage policies enforce path-based isolation: `{userId}/*`

---

## Step-by-Step Deployment Procedure

### Phase 1: Pre-Deployment Validation (5 minutes)

1. **Link to production Supabase:**
   ```bash
   supabase link --project-ref glqtomnhltolgbxiagbk
   ```

2. **Verify connection:**
   ```bash
   supabase projects list
   # Should show "glqtomnhltolgbxiagbk" as LINKED
   ```

3. **Check migration status:**
   ```bash
   supabase db diff
   # Should show pending migrations
   ```

4. **Verify no uncommitted local changes:**
   ```bash
   git status
   # Should be clean on main branch
   ```

### Phase 2: Database Schema Migration (8-10 minutes)

**Option A: Using Prisma (Recommended for schema-only changes)**

```bash
# Set DATABASE_URL to production (from .env.production)
export DATABASE_URL="postgresql://postgres.glqtomnhltolgbxiagbk:..."

# Deploy migrations
npm run prisma:migrate:deploy

# Verify migration status
npx prisma migrate status
```

**Option B: Using Supabase CLI (If RLS policies fail with Prisma)**

```bash
# Push local migrations to production
supabase db push

# Verify tables were created
supabase db diff
# Should show "No schema changes detected"
```

**Verification queries (run in Supabase SQL Editor):**

```sql
-- Check that all 11 tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'food_entries', 'food_photos', 'food_ingredients',
    'glucose_readings', 'glucose_predictions', 'personal_models',
    'meal_templates', 'metabolic_insights', 'subscription_tiers',
    'admin_users'
  )
ORDER BY table_name;
-- Expected: 10 rows

-- Check that enums were created
SELECT typname
FROM pg_type
WHERE typname IN ('MealType', 'AnalysisStatus', 'IngredientSource', 'GlucoseSource', 'InsightType', 'TierLevel');
-- Expected: 6 rows

-- Verify RLS is enabled on all metabolic tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%food%' OR tablename LIKE '%glucose%' OR tablename LIKE '%metabolic%'
ORDER BY tablename;
-- All should have rowsecurity = true

-- Count RLS policies
SELECT COUNT(*)
FROM pg_policies
WHERE tablename IN ('food_entries', 'food_photos', 'food_ingredients', 'glucose_readings', 'glucose_predictions', 'personal_models', 'meal_templates', 'metabolic_insights', 'subscription_tiers');
-- Expected: 36 policies (9 tables × 4 operations)
```

### Phase 3: Storage Bucket Creation (3-5 minutes)

**3.1 Create `food-photos` bucket:**

Run in Supabase SQL Editor:

```sql
-- From: db/storage-food-photos.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  true, -- PUBLIC (required for OpenAI Vision API)
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Upload policy
DROP POLICY IF EXISTS "Users can upload food photos to own folder" ON storage.objects;
CREATE POLICY "Users can upload food photos to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- View policy
DROP POLICY IF EXISTS "Users can view own food photos" ON storage.objects;
CREATE POLICY "Users can view own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update policy
DROP POLICY IF EXISTS "Users can update own food photos" ON storage.objects;
CREATE POLICY "Users can update own food photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete policy
DROP POLICY IF EXISTS "Users can delete own food photos" ON storage.objects;
CREATE POLICY "Users can delete own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Verify `food-photos` bucket:**

```sql
-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'food-photos';
-- Expected: 1 row, public = true, file_size_limit = 5242880

-- List policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%food photos%'
ORDER BY policyname;
-- Expected: 4 rows (SELECT, INSERT, UPDATE, DELETE)
```

**3.2 Create `ml-models` bucket:**

Run in Supabase SQL Editor:

```sql
-- From: db/storage-ml-models.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ml-models',
  'ml-models',
  false, -- PRIVATE
  52428800, -- 50MB
  ARRAY['application/json', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/json', 'application/octet-stream'];

-- Upload policy
DROP POLICY IF EXISTS "Users can upload ML models to own folder" ON storage.objects;
CREATE POLICY "Users can upload ML models to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- View policy
DROP POLICY IF EXISTS "Users can view own ML models" ON storage.objects;
CREATE POLICY "Users can view own ML models"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update policy
DROP POLICY IF EXISTS "Users can update own ML models" ON storage.objects;
CREATE POLICY "Users can update own ML models"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'ml-models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete policy
DROP POLICY IF EXISTS "Users can delete own ML models" ON storage.objects;
CREATE POLICY "Users can delete own ML models"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Verify `ml-models` bucket:**

```sql
-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'ml-models';
-- Expected: 1 row, public = false, file_size_limit = 52428800

-- List policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%ML models%'
ORDER BY policyname;
-- Expected: 4 rows (SELECT, INSERT, UPDATE, DELETE)
```

### Phase 4: Admin User Setup (2 minutes)

**CRITICAL SECURITY STEP:** Add initial admin user to `admin_users` table.

**4.1 Get your Supabase user ID:**

1. Go to Supabase Dashboard → Authentication → Users
2. Find your admin account
3. Copy the `UUID` (e.g., `550e8400-e29b-41d4-a716-446655440000`)

**4.2 Insert admin user:**

```sql
-- Replace with your actual user ID and email
INSERT INTO admin_users (user_id, email, created_by)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000', -- YOUR USER ID
  'admin@evermed.ai', -- YOUR EMAIL
  'system'
);
```

**Verify admin user:**

```sql
SELECT user_id, email, created_at
FROM admin_users;
-- Expected: 1 row with your admin account
```

**4.3 Test admin authentication:**

After deploying to Vercel production:

```bash
# Test admin endpoint (should return 200 OK)
curl -X GET https://evermed.app/api/admin/metabolic \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

### Phase 5: Vercel Production Deployment (2 minutes)

**5.1 Verify Vercel environment variables:**

Go to Vercel Dashboard → Project Settings → Environment Variables → Production

Ensure the following are set correctly:

- `DATABASE_URL` → Production Supabase connection string
- `NEXT_PUBLIC_SUPABASE_URL` → `https://glqtomnhltolgbxiagbk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → Production service role key
- All other vars from `.env.production.template`

**5.2 Trigger production deployment:**

```bash
# Option A: Deploy from main branch (recommended)
git push origin main

# Option B: Trigger manual deployment from Vercel Dashboard
# Vercel → Deployments → Deploy → main branch
```

**5.3 Monitor deployment:**

1. Watch build logs in Vercel Dashboard
2. Wait for deployment to complete (typically 2-3 minutes)
3. Note the production URL (e.g., `https://evermed.app`)

### Phase 6: Post-Deployment Validation (5 minutes)

**6.1 Test basic app functionality:**

```bash
# Check homepage loads
curl -I https://evermed.app

# Check API health
curl https://evermed.app/api/health
```

**6.2 Test metabolic insights feature:**

1. **Login to production** with your admin account
2. **Navigate to Metabolic Insights:** `/metabolic/dashboard`
3. **Test photo upload:** `/metabolic/camera`
   - Upload a test food photo
   - Verify it appears in dashboard with "pending" status
   - Wait for analysis to complete (background job)
   - Verify status changes to "completed"
4. **Check storage:** Supabase Dashboard → Storage → food-photos
   - Should see your uploaded photo in `{userId}/{photoId}.jpg`

**6.3 Verify RLS policies are working:**

1. Create a second test user account
2. Login as second user
3. Navigate to `/metabolic/dashboard`
4. Verify you CANNOT see the first user's meals
5. Upload a photo as second user
6. Verify only your own meals are visible

**6.4 Check database integrity:**

```sql
-- Verify no data corruption
SELECT COUNT(*) FROM food_entries;
-- Expected: 0 (fresh production database)

-- Verify RLS is enforced
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%food%';
-- All should have rowsecurity = true
```

### Phase 7: Monitoring Setup (Ongoing)

**7.1 Enable Supabase monitoring:**

1. Supabase Dashboard → Reports
2. Monitor API usage, database connections, storage usage
3. Set up alerts for:
   - Database CPU > 80%
   - Storage > 80% of quota
   - API error rate > 5%

**7.2 Enable Vercel monitoring:**

1. Vercel Dashboard → Analytics
2. Monitor page load times, API response times
3. Set up alerts for:
   - Error rate > 1%
   - p95 response time > 10s (per PRD requirements)

**7.3 Set up Sentry (optional but recommended):**

```bash
# Install Sentry
npm install @sentry/nextjs

# Configure in next.config.js
# See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

---

## Rollback Plan

If issues are discovered post-deployment, follow this rollback procedure:

### Option A: Rollback Vercel Deployment (Fast - 2 minutes)

1. **Vercel Dashboard → Deployments**
2. **Find previous successful deployment** (before metabolic insights)
3. **Click "..." → Promote to Production**
4. **Verify rollback:** Check that `/metabolic/dashboard` returns 404

**Note:** Database schema and storage buckets remain in place. This only reverts application code.

### Option B: Rollback Database Schema (Destructive - 10 minutes)

**WARNING:** This will delete all metabolic insights data. Only use if absolutely necessary.

```sql
-- Drop all metabolic tables
DROP TABLE IF EXISTS subscription_tiers CASCADE;
DROP TABLE IF EXISTS metabolic_insights CASCADE;
DROP TABLE IF EXISTS meal_templates CASCADE;
DROP TABLE IF EXISTS personal_models CASCADE;
DROP TABLE IF EXISTS glucose_predictions CASCADE;
DROP TABLE IF EXISTS glucose_readings CASCADE;
DROP TABLE IF EXISTS food_ingredients CASCADE;
DROP TABLE IF EXISTS food_photos CASCADE;
DROP TABLE IF EXISTS food_entries CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "TierLevel";
DROP TYPE IF EXISTS "InsightType";
DROP TYPE IF EXISTS "GlucoseSource";
DROP TYPE IF EXISTS "IngredientSource";
DROP TYPE IF EXISTS "AnalysisStatus";
DROP TYPE IF EXISTS "MealType";

-- Remove Person table columns
ALTER TABLE "Person" DROP COLUMN IF EXISTS "cgm_connected";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "target_glucose_min";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "target_glucose_max";

-- Drop storage buckets (data will be lost!)
DELETE FROM storage.buckets WHERE id IN ('food-photos', 'ml-models');
```

**After rollback:**
1. Revert Prisma schema to previous version
2. Regenerate Prisma client: `npm run prisma:generate`
3. Rebuild and redeploy: `npm run build && git push origin main`

---

## Known Issues and Mitigations

### Issue 1: Admin Authentication Placeholder

**Problem:** Admin authentication currently returns `true` for all users (see `apps/web/src/lib/auth.ts:isAdmin()`).

**Mitigation:** Admin endpoints are NOT exposed in production navigation. Only users who know the direct URL can access them. After deployment, update `isAdmin()` to check `admin_users` table.

**Fix (apply immediately after deployment):**

```typescript
// apps/web/src/lib/auth.ts
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single()

  return !!data
}
```

### Issue 2: LSTM Model Not Implemented

**Problem:** Glucose prediction API uses mock baseline, not real LSTM model.

**Mitigation:** Mock predictions are still useful for demo purposes. Real LSTM training is planned for Sprint 8.

**Status:** NOT a blocker for production launch. Can be added incrementally.

### Issue 3: OpenAI Vision API Costs

**Problem:** Food analysis uses GPT-4o Vision, which is expensive (~$0.01/image).

**Mitigation:**
- Implement cost tracking in `TokenUsage` table
- Set up Vercel spending alerts
- Consider switching to Gemini 2.5 Flash (10x cheaper)

**Recommendation:** Monitor OpenAI costs closely in first week.

---

## Success Criteria

Deployment is considered successful when ALL of the following are true:

- [ ] All 11 tables exist in production database
- [ ] All 6 enums are created
- [ ] All 45 RLS policies are active
- [ ] Both storage buckets (`food-photos`, `ml-models`) exist with correct policies
- [ ] Admin user is added to `admin_users` table
- [ ] Vercel production deployment succeeds
- [ ] Test user can upload a food photo
- [ ] Photo appears in dashboard with "pending" status
- [ ] Background analysis completes and status changes to "completed"
- [ ] RLS policies prevent cross-user data access
- [ ] No console errors on production site
- [ ] p95 response time < 10s (per PRD requirement)
- [ ] Admin endpoint returns 403 for non-admin users

---

## Post-Deployment Checklist

After successful deployment, complete these tasks:

- [ ] **Update project documentation** with production deployment date
- [ ] **Notify stakeholders** that metabolic insights is live
- [ ] **Schedule code review** for admin authentication fix
- [ ] **Create Jira ticket** for LSTM model implementation
- [ ] **Set up weekly cost monitoring** for OpenAI API usage
- [ ] **Add production URL** to onboarding documentation
- [ ] **Update CLAUDE.md** with production environment details
- [ ] **Commit and push** this migration plan to repository

---

## Support and Troubleshooting

### Common Errors

**Error:** `relation "food_entries" does not exist`
- **Cause:** Migrations not applied
- **Fix:** Run `npm run prisma:migrate:deploy` again

**Error:** `new row violates row-level security policy`
- **Cause:** RLS policies not created or incorrect Person.ownerId
- **Fix:** Verify RLS policies exist and user has Person record

**Error:** `The resource already exists` (storage bucket)
- **Cause:** Bucket already created in previous attempt
- **Fix:** This is safe to ignore. Verify bucket exists in dashboard.

**Error:** `Failed to upload photo` (403 Forbidden)
- **Cause:** RLS policy preventing upload
- **Fix:** Check that path is `{userId}/...` and user is authenticated

### Rollback Decision Tree

```
Is the issue critical (data loss, security breach, app completely down)?
  ├── YES → Rollback Vercel deployment immediately (Option A)
  └── NO → Can we fix forward?
        ├── YES → Apply hotfix and redeploy
        └── NO → Rollback Vercel deployment (Option A)
```

**Only use Option B (database rollback) if:**
- Data corruption detected
- RLS policies are fundamentally broken
- Migration caused cascading failures

---

## Timeline Estimate

| Phase | Duration | Can Run in Parallel? |
|-------|----------|---------------------|
| Pre-deployment validation | 5 min | No |
| Database schema migration | 8-10 min | No |
| Storage bucket creation | 3-5 min | No (depends on schema) |
| Admin user setup | 2 min | No (depends on schema) |
| Vercel deployment | 2 min | No (depends on database) |
| Post-deployment validation | 5 min | No (depends on deployment) |
| **Total** | **25-30 minutes** | Sequential |

**Recommended deployment window:** Off-peak hours (e.g., Saturday 10 AM CET)

---

## Sign-Off

**Deployment performed by:** _________________
**Date and time:** _________________
**Production URL:** https://evermed.app
**Deployment successful:** ☐ Yes ☐ No
**Rollback required:** ☐ Yes ☐ No

**Notes:**
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

---

## Appendix: Migration File Locations

All migration files are located in the repository:

- **Schema migration:** `db/migrations/20251010090000_add_metabolic_insights/migration.sql`
- **RLS policies:** `db/migrations/20251010090001_add_metabolic_rls_policies/migration.sql`
- **Admin users:** `db/migrations/20251012000000_add_admin_users/migration.sql`
- **Food photos storage:** `db/storage-food-photos.sql`
- **ML models storage:** `db/storage-ml-models.sql`

**Backup copies (for quick reference):**
- `db/storage-food-photos-bucket-only.sql` - Bucket creation only
- `db/storage-food-photos-rls-only.sql` - RLS policies only

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-14 | Claude Code | Initial production migration plan |

---

**End of Migration Plan**
