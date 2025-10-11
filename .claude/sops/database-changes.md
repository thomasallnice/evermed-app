# SOP: Database Schema Changes

## Overview

This SOP defines the **mandatory workflow** for all database schema changes to prevent schema drift and deployment failures.

## The Problem: Schema Drift

**Schema drift** occurs when:
- Prisma schema is modified AFTER migration creation
- Migrations are created locally but NOT applied to staging/production
- Code is deployed to Vercel BEFORE migrations are applied to remote databases
- Vercel builds with `prisma generate` against OLD database schema → type mismatches → build failures

**Symptoms:**
- Vercel build failures with Prisma type errors
- "Column does not exist" errors in production
- Infinite fix-push-fail loops

## The Correct Workflow

### Step 1: Modify Prisma Schema

Edit `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma`:

```prisma
model Example {
  id        String   @id @default(uuid())
  newField  String   // Add your new field
  createdAt DateTime @default(now())
}
```

### Step 2: Create Migration

```bash
npm run prisma:migrate:dev --name descriptive_migration_name
```

This will:
- Generate migration SQL in `db/migrations/`
- Apply migration to LOCAL database
- Regenerate Prisma Client with new types

### Step 3: Verify Migration SQL

**CRITICAL:** Open the generated migration file and verify:
- SQL syntax is correct
- Column names match Prisma schema exactly
- Data migrations preserve existing data
- Constraints are appropriate

**Example:**
```sql
-- db/migrations/20251011120000_add_example_field/migration.sql
ALTER TABLE "Example" ADD COLUMN "newField" TEXT NOT NULL DEFAULT '';
```

### Step 4: DO NOT Modify Prisma Schema After Migration

**❌ NEVER DO THIS:**
```bash
npm run prisma:migrate:dev --name add_field
# Migration created with old schema
# Then modify Prisma schema AFTER
# This creates permanent schema drift!
```

**If you need to change the schema after creating a migration:**
1. Delete the migration directory
2. Fix the Prisma schema
3. Recreate the migration with correct schema

### Step 5: Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 6: Write Code Using New Types

```typescript
// Now safe to use new field in code
await prisma.example.create({
  data: {
    newField: 'value' // TypeScript knows about this field
  }
});
```

### Step 7: Validate Locally

```bash
# Type check
npm run typecheck

# Build
npm run build

# Test schema
DATABASE_URL="postgres://..." node scripts/test-schema.mjs
```

**BLOCK if any fail!**

### Step 8: Commit Migration + Code Together

```bash
git add db/migrations/ db/schema.prisma apps/web/src/
git commit -m "feat: add Example.newField with migration"
```

**NEVER commit code without migrations, or migrations without code.**

### Step 9: Push to GitHub

```bash
# Run pre-push checks
./scripts/pre-push-checks.sh

# Push
git push
```

### Step 10: Deploy Migration to Staging FIRST

```bash
# Apply migration to staging database
./scripts/deploy-staging.sh
```

This will:
- Verify local build
- Apply migrations to staging DB
- Validate schema matches Prisma schema

### Step 11: Deploy Code to Vercel Staging

Deploy code to Vercel staging AFTER migration is applied.

Vercel build will now succeed because:
- Migration already applied → staging DB has new schema
- `prisma generate` generates types from STAGING DB (with new schema)
- Code expects new types → types match → build succeeds ✅

### Step 12: Verify Staging Works

```bash
# Run smoke tests
./scripts/smoke-e2e.sh

# Manual testing of affected features
```

### Step 13: Deploy Migration to Production

```bash
# Apply migration to production database
./scripts/deploy-production.sh
```

**CRITICAL:** Create manual backup in Supabase dashboard before running this!

### Step 14: Deploy Code to Vercel Production

Only after production migration succeeds.

## Common Mistakes to Avoid

### ❌ Mistake 1: "I changed the schema locally, it works on my machine"

**Problem:** Local DB has new schema, staging/prod have old schema.

**Fix:** Apply migration to staging/prod BEFORE deploying code.

### ❌ Mistake 2: "I modified the Prisma schema after creating the migration"

**Problem:** Migration SQL doesn't match schema → permanent drift.

**Fix:**
1. Delete migration directory
2. Fix Prisma schema
3. Recreate migration

### ❌ Mistake 3: "I pushed without running `npm run build`"

**Problem:** Type errors discovered during Vercel deployment (slow feedback).

**Fix:** Always run `./scripts/pre-push-checks.sh` before pushing.

### ❌ Mistake 4: "I deployed code to Vercel before applying migrations"

**Problem:** Vercel `prisma generate` uses OLD database schema → type mismatches.

**Fix:** Always apply migrations to remote DB BEFORE deploying code.

### ❌ Mistake 5: "I manually modified the database schema without creating a migration"

**Problem:** Database schema diverges from Prisma schema → schema drift.

**Fix:**
1. Run `npx prisma db pull` to sync Prisma schema with database
2. Create migration to formalize the change
3. Apply migration to all environments

## Emergency: Fixing Schema Drift

If schema drift occurs (database schema doesn't match Prisma schema):

1. **Identify the drift:**
   ```bash
   DATABASE_URL="..." node scripts/test-schema.mjs
   ```

2. **Create corrective migration:**
   - Compare database schema vs Prisma schema
   - Write SQL to transform database → Prisma schema
   - Make migration idempotent (use `IF NOT EXISTS`, `DO $$` blocks)

3. **Apply corrective migration:**
   ```bash
   DATABASE_URL="..." npm run prisma:migrate:deploy
   ```

4. **Validate schema:**
   ```bash
   DATABASE_URL="..." node scripts/test-schema.mjs
   ```

## Rollback Procedure

If a migration fails in production:

1. **Restore database from backup** (Supabase dashboard)
2. **Revert Vercel deployment** to previous version
3. **Investigate root cause:**
   - Review migration SQL
   - Check database logs
   - Test migration on staging copy
4. **Fix migration** and re-test on staging
5. **Re-attempt deployment** following correct workflow

## Scripts Reference

- `./scripts/pre-push-checks.sh` — Validate before pushing to GitHub
- `./scripts/deploy-staging.sh` — Deploy migrations to staging
- `./scripts/deploy-production.sh` — Deploy migrations to production
- `./scripts/test-schema.mjs` — Validate database schema matches Prisma schema

## Key Principles

1. **Migrations are source of truth** for database changes
2. **Never modify Prisma schema after creating migration**
3. **Always apply migrations to remote DB BEFORE deploying code**
4. **Always validate locally before pushing**
5. **Always test on staging before production**
6. **Always create backups before production migrations**
