# SOP: Deployment to Staging & Production

**Version:** 1.0
**Last Updated:** 2025-10-08

---

## When to Use This SOP
- Deploying to staging environment
- Deploying to production
- Running database migrations
- Configuring environment variables
- Setting up Supabase infrastructure

---

## Prerequisites

### Required Tools
- [ ] Node.js 20+ installed
- [ ] npm installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Git configured

### Required Access
- [ ] Supabase project access (staging & production)
- [ ] Vercel project access
- [ ] GitHub repository access
- [ ] Environment variable secrets

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Smoke test passes: `./scripts/smoke-e2e.sh`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No uncommitted changes: `git status`
- [ ] On correct branch

### Staging Deployment
- [ ] Link to staging Supabase project
- [ ] Preview database migrations
- [ ] Deploy migrations to staging
- [ ] Configure Vercel staging env vars
- [ ] Deploy to Vercel staging
- [ ] Verify staging deployment
- [ ] Run smoke test on staging URL

### Production Deployment
- [ ] Staging deployment successful
- [ ] Backup production database
- [ ] Link to production Supabase project
- [ ] Preview database migrations
- [ ] Deploy migrations to production
- [ ] Configure Vercel production env vars
- [ ] Deploy to Vercel production
- [ ] Verify production deployment
- [ ] Run smoke test on production URL
- [ ] Monitor logs for errors

---

## Staging Deployment Workflow

### 1. Link to Staging Supabase Project

```bash
# Link to staging environment
supabase link --project-ref <staging-project-ref>

# Verify connection
supabase projects list
```

### 2. Preview Database Changes

```bash
# See what will change in staging database
supabase db diff

# Review the diff carefully!
# Look for:
# - Unexpected schema changes
# - Missing migrations
# - RLS policy changes
```

### 3. Deploy Database Migrations

**Option A: Prisma migrations (schema-only changes)**
```bash
npm run prisma:migrate:deploy
```

**Option B: Supabase push (when RLS/triggers/functions involved)**
```bash
supabase db push
```

**Which to use?**
- Use Prisma: Pure schema changes (tables, columns, relations)
- Use Supabase: When RLS policies, triggers, or functions are included

### 4. Deploy Edge Functions (if applicable)

```bash
# Deploy specific function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy --all
```

### 5. Sync Environment Secrets

```bash
# Set secrets for Supabase Functions
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set PDF_EXTRACT_BEARER=...

# List secrets to verify
supabase secrets list
```

### 6. Configure Vercel Staging Environment

**Go to:** Vercel Dashboard → Project → Settings → Environment Variables

**Required variables (see VERCEL_ENV_VARS.txt):**
- `DATABASE_URL` (direct postgres:// URL, NOT ${VAR})
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SHARE_LINK_PEPPER`
- `PDF_EXTRACT_URL`
- `PDF_EXTRACT_BEARER`
- All other env vars from template

**⚠️ CRITICAL:** Select "Preview" environment for staging vars

### 7. Deploy to Vercel Staging

```bash
# Push to staging branch (triggers auto-deployment)
git push origin refit/user-auth-onboarding

# OR manual deployment
vercel deploy --preview
```

### 8. Verify Staging Deployment

**Check deployment status:**
```bash
# View deployment logs
vercel logs <deployment-url>
```

**Manual testing:**
1. Visit staging URL
2. Test authentication (sign up, login)
3. Test document upload
4. Test core features:
   - [ ] Upload works
   - [ ] Explain generates summaries
   - [ ] Chat works
   - [ ] Track page loads
   - [ ] Packs can be created
   - [ ] Mobile responsive

**Run smoke test:**
```bash
# Set staging URL as base URL
STAGING_URL=https://your-staging-url.vercel.app ./scripts/smoke-e2e.sh --auth
```

### 9. Create Supabase Storage Bucket (First-Time Only)

**Go to:** Supabase Dashboard → Storage → Buckets

**Create bucket:**
1. Click "New Bucket"
2. Name: `documents`
3. Public: **No** (keep private)
4. Click "Create bucket"

**Apply RLS policies:**

Go to: SQL Editor → New Query

```sql
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to read all files
CREATE POLICY "Service role can read all files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');
```

---

## Production Deployment Workflow

### ⚠️ CRITICAL: Production is Live

**Production deployments affect real users. Follow this checklist carefully.**

### 1. Verify Staging Success

**Checklist:**
- [ ] Staging deployment successful
- [ ] All features tested in staging
- [ ] No errors in staging logs
- [ ] Performance acceptable
- [ ] Mobile responsive verified

**If staging has issues, DO NOT proceed to production.**

### 2. Backup Production Database

**Go to:** Supabase Dashboard → Database → Backups

**Create backup:**
1. Click "Create backup"
2. Wait for backup to complete
3. Verify backup exists

**⚠️ CRITICAL:** Always backup before migrations!

### 3. Link to Production Supabase Project

```bash
# Link to production environment
supabase link --project-ref <production-project-ref>

# Verify connection
supabase projects list
```

### 4. Preview Database Changes

```bash
# See what will change in production database
supabase db diff

# Review VERY carefully!
# Verify this matches what you deployed to staging
```

### 5. Deploy Database Migrations

**⚠️ Off-peak hours recommended**

```bash
# Option A: Prisma migrations
npm run deploy:production

# Option B: Supabase push
supabase db push
```

**Monitor migration:**
- Watch for errors in terminal
- Check Supabase Dashboard → Logs

### 6. Configure Vercel Production Environment

**Go to:** Vercel Dashboard → Project → Settings → Environment Variables

**Add production variables:**
- Same variables as staging
- But with **production** values
- Select "Production" environment

**⚠️ CRITICAL:**
- Use production Supabase credentials
- Use production OpenAI key (with budget limits)
- Generate new `SHARE_LINK_PEPPER` (don't reuse staging)

### 7. Deploy to Vercel Production

**Merge to main branch:**
```bash
# Switch to main
git checkout main

# Merge feature branch
git merge refit/user-auth-onboarding

# Push to main (triggers production deployment)
git push origin main
```

**OR manual deployment:**
```bash
vercel deploy --prod
```

### 8. Monitor Production Deployment

**Watch deployment:**
```bash
# View live logs
vercel logs --follow
```

**Check for errors:**
- Vercel Dashboard → Deployments → Latest → Logs
- Supabase Dashboard → Logs Explorer

### 9. Verify Production

**Manual testing:**
1. Visit production URL
2. Sign up with test account
3. Test critical flows:
   - [ ] Authentication works
   - [ ] Upload works
   - [ ] Core features functional
   - [ ] No console errors

**Run smoke test:**
```bash
PRODUCTION_URL=https://your-production-url.vercel.app ./scripts/smoke-e2e.sh --auth
```

### 10. Monitor for 24 Hours

**Check:**
- [ ] Vercel logs (no errors)
- [ ] Supabase logs (no unusual queries)
- [ ] Error rate (should be low)
- [ ] Performance metrics (p95 < 10s)

**If issues detected:**
1. Check `.claude/memory/active-issues.md` for known issues
2. Investigate logs
3. Consider rollback if critical

---

## Rollback Procedure

### If Production Deployment Fails

**Option 1: Revert Vercel Deployment**
```bash
# Go to Vercel Dashboard → Deployments
# Find last successful deployment
# Click "Promote to Production"
```

**Option 2: Restore Database from Backup**

**Go to:** Supabase Dashboard → Database → Backups

1. Find backup from before migration
2. Click "Restore"
3. Wait for restore to complete
4. Verify application works

**Option 3: Rollback Migration**

```bash
# Create rollback migration
npm run prisma:migrate:dev
# Name: rollback_[original_migration_name]

# Deploy rollback to production
npm run deploy:production
```

### After Rollback

- [ ] Document what went wrong in `.claude/memory/active-issues.md`
- [ ] Update `.claude/memory/recent-changes.md` with rollback
- [ ] Investigate root cause
- [ ] Fix issue in staging
- [ ] Re-test thoroughly before next production attempt

---

## Common Mistakes to Avoid

### ❌ MISTAKE: Using ${VAR} in Vercel environment variables
```bash
# BAD
DATABASE_URL=${SUPABASE_DB_URL}
```

**Why bad:** Shell variable substitution doesn't work in Vercel

**Fix:**
```bash
# GOOD: Use direct value
DATABASE_URL=postgres://postgres:PASSWORD@db.project.supabase.co:5432/postgres
```

---

### ❌ MISTAKE: Deploying to production without testing in staging
**Why bad:** Issues discovered in production affect real users

**Fix:** Always deploy to staging first, verify everything works, then deploy to production

---

### ❌ MISTAKE: Not backing up database before migrations
**Why bad:** No rollback option if migration corrupts data

**Fix:** Always create backup before production migrations

---

### ❌ MISTAKE: Deploying during peak hours
**Why bad:** If something breaks, affects maximum number of users

**Fix:** Deploy during off-peak hours (late night, early morning)

---

### ❌ MISTAKE: Not monitoring after deployment
**Why bad:** Issues might go unnoticed for hours

**Fix:** Monitor logs for at least 1 hour after deployment, check again after 24 hours

---

## Environment-Specific Notes

### Staging Environment
- Used for: Testing before production
- URL: Preview deployments on Vercel
- Database: Staging Supabase project
- Safe to break: Yes
- Data: Test data only (can be deleted)

### Production Environment
- Used for: Real users
- URL: Main production domain
- Database: Production Supabase project
- Safe to break: **NO**
- Data: Real user data (MUST protect)

---

## Quick Reference

### Supabase CLI Commands
```bash
supabase link --project-ref <ref>
supabase db diff
supabase db push
supabase db pull
supabase functions deploy <name>
supabase secrets set KEY=value
supabase projects list
```

### Deployment Scripts
```bash
npm run deploy:staging      # Deploy DB to staging
npm run deploy:production   # Deploy DB to production
npm run build              # Build for deployment
./scripts/smoke-e2e.sh     # Run smoke tests
```

### Vercel Commands
```bash
vercel deploy --preview    # Deploy to staging
vercel deploy --prod       # Deploy to production
vercel logs --follow       # Monitor logs
```

---

## Emergency Contacts

**If critical production issue:**
1. Check `.claude/memory/active-issues.md` for known issues
2. Check Vercel logs
3. Check Supabase logs
4. Consider rollback
5. Document incident in memory files

**Escalation:**
- Contact team lead
- Create incident report
- Update active issues with blocker severity
