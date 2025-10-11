# Developer Workflow Guide

This document provides step-by-step guidance for common development tasks in the EverMed project.

## Table of Contents

1. [Making Schema Changes](#making-schema-changes)
2. [Before Every Push](#before-every-push)
3. [Deploying to Staging](#deploying-to-staging)
4. [Deploying to Production](#deploying-to-production)
5. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
6. [Troubleshooting](#troubleshooting)

---

## Making Schema Changes

**The Correct Workflow (Follow this EXACTLY):**

### 1. Modify Prisma Schema
Edit `db/schema.prisma` with your changes.

```prisma
// Example: Adding a new field
model Person {
  id String @id @default(cuid())
  // ... existing fields
  newField String? // Your new field
}
```

### 2. Create Migration
```bash
npm run prisma:migrate:dev --name descriptive_name
```

This will:
- Generate migration SQL in `db/migrations/TIMESTAMP_descriptive_name/`
- Apply the migration to your local database
- Regenerate Prisma Client with new types

### 3. Verify Migration SQL
Open the generated migration file and **verify it matches your intent**:

```bash
cat db/migrations/TIMESTAMP_descriptive_name/migration.sql
```

**Red flags to check for:**
- [ ] Is it trying to drop data without preserving it?
- [ ] Are there any unexpected `DROP TABLE` or `DROP COLUMN` statements?
- [ ] Are the column types correct?
- [ ] Are indexes being created for foreign keys?

### 4. Generate Prisma Client
```bash
npm run prisma:generate
```

This regenerates TypeScript types from your schema.

### 5. Write Code Using New Types
Now you can safely use the new fields in your code:

```typescript
const person = await prisma.person.create({
  data: {
    newField: 'value', // TypeScript knows about this field now
  },
});
```

### 6. Run Full Build
**CRITICAL**: Always run the full build locally before pushing:

```bash
npm run build
```

This catches:
- Type errors
- Import errors
- Build-time errors

### 7. Test Locally
Manually test your changes in the browser:

```bash
npm run dev
# Open http://localhost:3000
# Test your feature thoroughly
```

### 8. Commit Migration + Code Together
**Never commit migration and code separately!**

```bash
git add db/migrations/TIMESTAMP_descriptive_name/
git add db/schema.prisma
git add [your code files]
git commit -m "feat: add newField to Person model"
```

### 9. Push to GitHub
```bash
git push origin your-branch
```

### 10. Deploy Migration to Staging FIRST
**Before deploying code to Vercel**, apply the migration to staging:

```bash
./scripts/deploy-staging.sh
```

This script will:
- Validate your local build
- Apply migrations to staging database
- Verify schema synchronization

### 11. Deploy Code to Vercel Staging
After the migration is applied, Vercel deployment will succeed because:
- Staging DB has new schema ✅
- Prisma generates types from staging DB ✅
- Code expects new types ✅
- **Types match → Build succeeds!** ✅

### 12. Verify Staging Works
Test your changes on the staging environment:
- Navigate to staging URL
- Test the feature end-to-end
- Check for console errors
- Verify analytics tracking (if applicable)

### 13. Deploy Migration to Production
**Only after staging verification passes:**

```bash
./scripts/deploy-production.sh
```

This script will:
- Prompt for manual backup confirmation
- Validate your local build
- Apply migrations to production database
- Verify schema synchronization

### 14. Deploy Code to Vercel Production
Merge your PR to `main` branch, which triggers production deployment.

---

## Before Every Push

**Run this script before EVERY push:**

```bash
./scripts/pre-push-checks.sh
```

This validates:
- ✅ TypeScript type check passes
- ✅ ESLint passes
- ✅ Build succeeds
- ✅ No uncommitted migrations

**If any check fails, DO NOT push. Fix the errors first.**

### Manual Alternative

If you can't run the script, run these commands individually:

```bash
npm run typecheck
npm run lint
npm run build

# Check for uncommitted migrations
git status db/migrations
```

---

## Deploying to Staging

### Prerequisites
- [ ] All tests pass locally
- [ ] Pre-push checks pass
- [ ] Code pushed to GitHub
- [ ] GitHub Actions CI passes

### Deployment Steps

1. **Run staging deployment script:**
   ```bash
   ./scripts/deploy-staging.sh
   ```

2. **Script will:**
   - Verify local build passes
   - Apply migrations to staging database
   - Validate schema synchronization
   - Provide next steps

3. **Deploy to Vercel staging:**
   - GitHub Actions automatically deploys to staging on push to `staging` branch
   - OR manually trigger deployment in Vercel dashboard

4. **Smoke test staging:**
   ```bash
   # Test critical flows
   - Authentication (login/logout)
   - Vault (view documents)
   - Upload (add new document)
   - Chat (RAG query)
   - Analytics (page views tracked)
   ```

5. **Check for errors:**
   - Vercel function logs (check for Prisma errors)
   - Supabase database logs
   - Browser console (no errors)
   - Network tab (no failed API calls)

---

## Deploying to Production

### Prerequisites
- [ ] Staging deployment successful
- [ ] Staging smoke tests passed
- [ ] No console errors on staging
- [ ] All PR checks passed
- [ ] PR approved by at least 1 reviewer

### Deployment Steps

1. **Create manual backup:**
   - Go to Supabase dashboard → Database → Backups
   - Click "Create manual backup"
   - Wait for confirmation

2. **Run production deployment script:**
   ```bash
   ./scripts/deploy-production.sh
   ```

3. **Script will:**
   - Prompt for backup confirmation (type "yes")
   - Verify staging deployment succeeded
   - Verify local build passes
   - Apply migrations to production database
   - Validate schema synchronization
   - Provide next steps

4. **Deploy to Vercel production:**
   - Merge PR to `main` branch
   - Vercel automatically deploys to production
   - Monitor deployment logs in Vercel dashboard

5. **Smoke test production:**
   ```bash
   # Test critical flows immediately after deployment
   - Login/logout
   - View vault
   - Upload document
   - Chat query
   - Analytics tracking
   ```

6. **Monitor production:**
   - Vercel function logs (first 10 minutes)
   - Supabase database logs (check for errors)
   - Error tracking (Sentry, if configured)
   - User reports (if any)

### Rollback Procedure

If production deployment fails:

1. **Restore database from backup:**
   - Supabase dashboard → Database → Backups
   - Find the manual backup created before deployment
   - Click "Restore"

2. **Revert Vercel deployment:**
   - Vercel dashboard → Deployments
   - Find previous working deployment
   - Click "Promote to Production"

3. **Investigate root cause:**
   - Check Vercel build logs
   - Check Supabase database logs
   - Check migration SQL for errors
   - Fix issues before re-attempting

---

## Common Mistakes to Avoid

### ❌ Mistake 1: "I changed the schema locally, it works on my machine"

**Problem:** Local DB has new schema, staging/prod have old schema.

**Why it fails:**
- Vercel runs `prisma generate` using staging/prod database (old schema)
- Prisma Client generates types with old fields
- Your code expects new fields
- **Type mismatch → Build fails**

**Fix:** Apply migration to staging/prod BEFORE deploying code.

---

### ❌ Mistake 2: "I modified the Prisma schema after creating the migration"

**Problem:** Migration SQL doesn't match schema → permanent drift.

**Example:**
```bash
# 1. Created migration for "newField String"
npm run prisma:migrate:dev --name add_new_field

# 2. Then changed Prisma schema to "newField Int" (WRONG!)
# Migration still has "TEXT" but schema expects "Int"
```

**Fix:**
1. Delete the migration directory
2. Fix the Prisma schema
3. Recreate the migration

```bash
rm -rf db/migrations/TIMESTAMP_add_new_field
# Fix db/schema.prisma
npm run prisma:migrate:dev --name add_new_field
```

---

### ❌ Mistake 3: "I pushed without running npm run build"

**Problem:** Type errors discovered during Vercel deployment (slow feedback loop).

**Why it's bad:**
- Vercel build takes 2-3 minutes
- Reveals one error at a time
- Wastes build minutes
- Frustrating debug cycle

**Fix:** Always run `./scripts/pre-push-checks.sh` before pushing.

---

### ❌ Mistake 4: "I applied the migration to production first"

**Problem:** No way to verify migration works before production.

**Why it's dangerous:**
- If migration fails, production is down
- No rollback path (database already modified)
- Users affected immediately

**Fix:** Always deploy to staging first, verify, then production.

---

### ❌ Mistake 5: "I skipped the backup before production deployment"

**Problem:** No rollback path if deployment fails.

**Why it's critical:**
- Database changes are **destructive**
- Can't undo `DROP COLUMN` or `ALTER TABLE`
- Lost data is unrecoverable

**Fix:** Always create manual backup before production deployment.

---

## Troubleshooting

### Build fails with "Property 'newField' does not exist on type..."

**Cause:** Prisma Client not regenerated after schema change.

**Fix:**
```bash
npm run prisma:generate
npm run build
```

---

### Vercel build fails but local build succeeds

**Cause:** Schema drift - staging/prod database has different schema than local.

**Fix:**
1. Check which environment Vercel is building against (staging or prod)
2. Run schema validation:
   ```bash
   # For staging
   DATABASE_URL="<staging-url>" node scripts/test-schema.mjs

   # For production
   DATABASE_URL="<prod-url>" node scripts/test-schema.mjs
   ```
3. Apply migrations to the environment:
   ```bash
   # For staging
   ./scripts/deploy-staging.sh

   # For production
   ./scripts/deploy-production.sh
   ```

---

### Migration fails with "column already exists"

**Cause:** Migration was partially applied or run twice.

**Fix:**
1. Check migration history:
   ```sql
   SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;
   ```
2. If migration is marked as applied but failed, manually fix the schema:
   ```sql
   -- Example: Remove failed column if needed
   ALTER TABLE "table_name" DROP COLUMN IF EXISTS "column_name";
   ```
3. Mark migration as rolled back in `_prisma_migrations`
4. Re-run migration

**Prevention:** Always test migrations on staging first.

---

### Schema drift detected between environments

**Cause:** Migrations not applied consistently across environments.

**Fix:**
1. Run schema inspection:
   ```bash
   # Check which migrations are pending
   DATABASE_URL="<env-url>" npm run prisma:migrate:status
   ```
2. Apply pending migrations:
   ```bash
   DATABASE_URL="<env-url>" npm run prisma:migrate:deploy
   ```
3. Verify schema matches:
   ```bash
   DATABASE_URL="<env-url>" node scripts/test-schema.mjs
   ```

---

### "It works locally but fails on Vercel"

**Debugging checklist:**
- [ ] Did you run `npm run build` locally? (Catches most issues)
- [ ] Did you apply migrations to staging/prod? (Schema sync)
- [ ] Did you regenerate Prisma Client? (`npm run prisma:generate`)
- [ ] Did you commit both migration and code together?
- [ ] Did Vercel build run `prisma generate`? (Check build logs)
- [ ] Are environment variables set correctly in Vercel?

**Common causes:**
1. **Schema drift**: Staging/prod DB has old schema
   - Fix: Apply migrations to staging/prod
2. **Missing env vars**: Vercel missing `DATABASE_URL`
   - Fix: Set in Vercel dashboard → Settings → Environment Variables
3. **Prisma Client not regenerated**: Vercel build cache
   - Fix: Clear build cache in Vercel, redeploy

---

## Quick Reference

### Essential Commands

```bash
# Before making schema changes
npm run build                    # Verify clean state

# Making schema changes
npm run prisma:migrate:dev       # Create migration
npm run prisma:generate          # Regenerate client

# Before pushing
./scripts/pre-push-checks.sh     # Validate everything

# Before deploying
./scripts/deploy-staging.sh      # Staging deployment
./scripts/deploy-production.sh   # Production deployment

# Troubleshooting
npm run validate:migrations      # Check migration status
npm run validate:schema          # Verify schema compatibility
node scripts/test-schema.mjs     # Test schema against DB
```

### Environment URLs

**Local:**
- Database: `wukrnqifpgjwbqxpockm.supabase.co`
- App: `http://localhost:3000`

**Staging:**
- Database: `jwarorrwgpqrksrxmesx.supabase.co`
- App: `https://staging-evermed.vercel.app` (or similar)

**Production:**
- Database: `nqlxlkhbriqztkzwbdif.supabase.co`
- App: `https://evermed.app` (or similar)

---

## Getting Help

If you're stuck:

1. Check `.claude/sops/database-changes.md` - Database workflow SOP
2. Check `.claude/sops/deployment.md` - Deployment workflow SOP
3. Check this file's Troubleshooting section
4. Ask in team chat with:
   - What you're trying to do
   - What error you're getting
   - What you've already tried
   - Relevant logs/screenshots

---

**Remember:** The workflow exists to prevent production incidents. It may seem like extra steps, but it saves hours of debugging and prevents user-facing issues.
