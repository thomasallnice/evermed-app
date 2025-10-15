# EverMed Staging Deployment Checklist

**Date**: 2025-10-15
**Branch**: `dev`
**Target Environment**: Staging (Supabase: `jwarorrwgpqrksrxmesx`)
**Status**: Ready to Deploy

---

## Pre-Deployment Verification

### 1. Local Build Status
- [x] Build passes locally (`npm run build`)
- [x] Prisma client generated
- [x] All pivot commits pushed to `dev` branch
- [x] Admin authentication secured

### 2. Environment Configuration
- [x] `.env.staging` file exists with all required variables
- [x] Staging Supabase project linked: `jwarorrwgpqrksrxmesx`
- [x] Database URL configured
- [ ] Verify all API keys present

---

## Deployment Steps

### Step 1: Database Migration (15-20 minutes)

**Link to Staging Supabase**:
```bash
supabase link --project-ref jwarorrwgpqrksrxmesx
```

**Apply All Migrations**:
```bash
# Set DATABASE_URL for staging
export DATABASE_URL="postgresql://postgres.jwarorrwgpqrksrxmesx:PX%3F%26onwW4n36d%3FCr3nHsnM7r@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Apply migrations
npm run prisma:migrate:deploy
```

**Expected Result**:
- All migrations applied successfully
- Health vault tables dropped (7 tables)
- Metabolic tables present (14 tables)

**Verification**:
```bash
# List all tables
npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Expected tables:
# - Person
# - food_entries, food_photos, food_ingredients, meal_templates
# - glucose_readings, glucose_predictions, personal_models
# - metabolic_insights, subscription_tiers
# - feature_flags, analytics_events, token_usage, admin_users
```

**Rollback Plan** (if needed):
- Restore from Supabase backup
- Or revert migrations: Contact Supabase support

---

### Step 2: Storage Buckets (5 minutes)

**Create Food Photos Bucket**:
```bash
# Via Supabase CLI
supabase storage create food-photos --public false

# Or via Supabase Dashboard:
# Storage → New Bucket → Name: "food-photos" → Private
```

**Configure RLS Policies for food-photos**:
```sql
-- Via SQL Editor in Supabase Dashboard

-- Policy: Users can upload their own photos
CREATE POLICY "Users can upload their own food photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own photos
CREATE POLICY "Users can read their own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Create ML Models Bucket** (optional for now):
```bash
supabase storage create ml-models --public false
```

**Verification**:
```bash
# List buckets
supabase storage list
```

---

### Step 3: Add First Admin User (5 minutes)

**Get Your Supabase User ID**:
1. Go to Supabase Dashboard → Authentication → Users
2. Find your email
3. Copy the `id` (UUID)

**Add Admin User**:
```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="postgresql://postgres.jwarorrwgpqrksrxmesx:PX%3F%26onwW4n36d%3FCr3nHsnM7r@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Add admin
npm run admin:add <your-user-id> <your-email>

# Example:
# npm run admin:add abc-123-def tom@evermed.ai
```

**Verification**:
```bash
npm run admin:list
```

---

### Step 4: Verify Environment Variables in Vercel (10 minutes)

**Required Variables for Staging**:

Go to Vercel Dashboard → evermed-app → Settings → Environment Variables

**Supabase**:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://jwarorrwgpqrksrxmesx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from `.env.staging`)
- `SUPABASE_URL` = `https://jwarorrwgpqrksrxmesx.supabase.co`
- `SUPABASE_ANON_KEY` = (from `.env.staging`)
- `SUPABASE_SERVICE_ROLE_KEY` = (from `.env.staging`)
- `DATABASE_URL` = (from `.env.staging`)

**AI/ML**:
- `OPENAI_API_KEY`
- `GOOGLE_CLOUD_PROJECT` = `evermed-ai-1753452627`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` = (base64 encoded)
- `USE_GEMINI_FOOD_ANALYSIS` = `true`

**Security**:
- `SHARE_LINK_PEPPER` = (from `.env.staging`)

**All Other Variables**: Copy from `.env.staging`

**Scope**: Set to "Preview" and select "staging" branch

---

### Step 5: Deploy to Vercel Staging (10 minutes)

**Option A: Via Git Push** (Recommended):
```bash
# Push dev branch to staging branch
git checkout staging
git merge dev --no-edit
git push origin staging

# Vercel will auto-deploy on push
```

**Option B: Via Vercel CLI**:
```bash
vercel --prod --scope=evermed --env=staging
```

**Monitor Deployment**:
- Go to Vercel Dashboard → Deployments
- Watch for staging deployment
- Check build logs for errors

**Expected Duration**: 3-5 minutes

---

### Step 6: Smoke Tests (15 minutes)

**Test Authentication**:
1. Go to staging URL (e.g., `staging.evermed.ai`)
2. Sign up with test account: `staging-test@evermed.ai`
3. Complete onboarding
4. Verify redirected to dashboard

**Test Metabolic Features**:
1. Go to `/metabolic/camera`
2. Upload a test food photo
3. Wait for AI analysis (15-30 seconds)
4. Verify ingredients displayed
5. Check nutrition totals
6. Go to `/metabolic/dashboard`
7. Verify meal appears in timeline

**Test Admin Endpoints** (if you're admin):
1. Go to `/api/admin/feature-flags` (via Postman/curl)
2. Verify returns feature flags (not 403)
3. Try `/api/admin/metabolic`
4. Verify returns metrics or stub response

**Check Console for Errors**:
- Open browser DevTools → Console
- Should have no red errors
- Check Network tab for failed requests

**Performance Check**:
- Dashboard should load in <2 seconds
- Food analysis should complete in <30 seconds
- No timeout errors

---

## Post-Deployment Verification

### Database Health Check
```bash
# Connect to staging database
export DATABASE_URL="postgresql://postgres.jwarorrwgpqrksrxmesx:PX%3F%26onwW4n36d%3FCr3nHsnM7r@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Count records
npx prisma db execute --stdin <<< "
SELECT
  'Person' as table_name, COUNT(*) as count FROM \"Person\"
UNION ALL
SELECT 'food_entries', COUNT(*) FROM food_entries
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users
ORDER BY table_name;
"
```

### Feature Flags Check
```bash
# List feature flags
npx prisma db execute --stdin <<< "SELECT name, enabled, rollout_percent FROM feature_flags ORDER BY name;"
```

**Expected**:
- `glucolens_public_beta` = enabled, 10% rollout
- (Or feature was created by migration)

### Storage Check
```bash
# Try uploading a test file
# (Via UI: /metabolic/camera)

# Verify file exists in Supabase Dashboard:
# Storage → food-photos → Check for folders with user IDs
```

---

## Troubleshooting

### Issue: Migration Fails with Connection Timeout
**Solution**:
- Check DATABASE_URL is correct
- Verify Supabase project is not paused
- Try direct connection instead of pooler
- Check firewall/network settings

### Issue: Build Fails in Vercel
**Possible Causes**:
- Missing environment variables
- Prisma client not generated
- TypeScript errors

**Solution**:
1. Check build logs in Vercel
2. Verify `DATABASE_URL` is set in Vercel
3. Check that all env vars are in "Preview" scope
4. Re-run deployment

### Issue: Food Photo Upload Fails
**Possible Causes**:
- Storage bucket not created
- RLS policies not applied
- Missing storage credentials

**Solution**:
1. Check Supabase Dashboard → Storage
2. Verify `food-photos` bucket exists
3. Check RLS policies in Storage settings
4. Test with admin user (RLS bypass)

### Issue: Admin Endpoints Return 403
**Possible Causes**:
- User not in `admin_users` table
- Wrong user ID used

**Solution**:
```bash
# List admin users
npm run admin:list

# Add yourself
npm run admin:add <correct-user-id> <your-email>
```

---

## Success Criteria

Deployment is successful when:

- [x] All migrations applied (14 metabolic tables present)
- [x] Storage buckets created and accessible
- [x] At least 1 admin user added
- [x] Staging site loads without errors
- [x] Food photo upload and analysis works
- [x] Dashboard displays meals correctly
- [x] Admin endpoints return data (not 403)
- [x] No critical console errors
- [x] Performance acceptable (<2s dashboard, <30s analysis)

---

## Next Steps After Staging Success

1. **Monitor for 24-48 hours**
   - Check error logs daily
   - Watch for performance issues
   - Collect any user feedback

2. **Beta User Recruitment**
   - Create beta signup form
   - Identify 10-20 initial testers
   - Send invitation emails
   - Prepare onboarding guide

3. **Production Deployment** (Week 2-3)
   - Repeat these steps for production
   - Set feature flag to 10% rollout
   - Monitor closely for first week

---

**Created**: 2025-10-15
**Last Updated**: 2025-10-15
**Owner**: Tom
**Status**: Ready to Execute
