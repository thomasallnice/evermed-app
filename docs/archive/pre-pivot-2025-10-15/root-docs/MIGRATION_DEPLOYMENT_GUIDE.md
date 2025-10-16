# Migration Deployment Guide

## Overview

This guide ensures safe, reliable database migrations across all environments (dev → staging → production).

## Migration Lifecycle

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Local Dev  │ -> │   Staging   │ -> │ Validation  │ -> │ Production  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Step-by-Step Process

### Phase 1: Local Development

#### 1.1 Make Schema Changes

Edit `db/schema.prisma`:

```prisma
model Person {
  id          String   @id @default(uuid())
  // Add new field
  displayName String?
  // ... rest of model
}
```

#### 1.2 Generate Migration

```bash
# Create migration
npm run prisma:migrate:dev

# Enter migration name when prompted
# Example: "add_display_name_to_person"
```

This creates:
- Migration SQL file in `db/migrations/`
- Updates Prisma Client types
- Applies migration to local database

#### 1.3 Validate Locally

```bash
# Ensure no TypeScript errors
npm run typecheck

# Run validation
npm run validate:all

# Build to catch issues
npm run build
```

#### 1.4 Test Changes

```bash
# Run unit tests
npm run test

# Manual testing
npm run dev
# Test affected features
```

### Phase 2: Staging Deployment

#### 2.1 Link to Staging

```bash
# Link Supabase CLI to staging project
supabase link --project-ref <your-staging-ref>

# Verify connection
supabase projects list
```

#### 2.2 Preview Migration

```bash
# See what will be applied
npm run prisma:migrate:status

# Or use Supabase CLI
supabase db diff
```

#### 2.3 Apply Migration

**Option A: Prisma Migrate (Recommended for schema-only changes)**

```bash
npm run prisma:migrate:deploy
```

**Option B: Supabase Push (For RLS, triggers, functions)**

```bash
supabase db push
```

#### 2.4 Verify Migration

```bash
# Check migration status
npm run validate:migrations

# Should output: "✅ All migrations are up to date!"
```

#### 2.5 Deploy Code to Staging

```bash
# Push to staging branch
git push origin main:staging

# Monitor Vercel build
# Ensure build passes
```

#### 2.6 Validate Staging

```bash
# Run deployment validator
# (This checks the live staging environment)
npm run validate:deployment:staging
```

### Phase 3: Production Deployment

#### 3.1 Pre-Flight Checks

**CRITICAL: Complete these before production migration**

- [ ] Staging migration successful
- [ ] All staging tests passing
- [ ] No schema drift detected
- [ ] Backup plan prepared
- [ ] Rollback SQL ready
- [ ] Team notified of deployment window

#### 3.2 Prepare Rollback

Create rollback SQL before applying migration:

```bash
# Generate rollback SQL
npx prisma migrate diff \
  --from-schema-datamodel db/schema.prisma \
  --to-schema-datasource \
  --script > rollback.sql
```

#### 3.3 Link to Production

```bash
supabase link --project-ref <your-production-ref>
```

#### 3.4 Apply Migration (Production)

**During low-traffic window:**

```bash
# Final check
npm run validate:migrations

# Apply migration
npm run prisma:migrate:deploy

# Verify immediately
npm run validate:migrations
```

#### 3.5 Deploy Code (Production)

```bash
# Merge staging to main
git checkout main
git merge staging
git push origin main

# Monitor Vercel production build
```

#### 3.6 Validate Production

```bash
# Run deployment validator on production
npm run validate:deployment:prod

# Monitor error rates
# Check application logs
# Verify affected features work
```

## Rollback Procedures

### If Migration Fails

**Immediately:**

```bash
# Run rollback SQL (prepared in step 3.2)
psql $DATABASE_URL -f rollback.sql

# Or use Supabase SQL editor
# Paste rollback.sql content and execute
```

### If Code Fails After Migration

**Option 1: Quick Fix (Preferred)**

```bash
# Fix code issue
git commit -m "fix: resolve migration issue"
git push origin main

# Deploy fixed code
```

**Option 2: Full Rollback**

```bash
# Rollback code deployment
# (Revert to previous Vercel deployment)

# Then rollback database
psql $DATABASE_URL -f rollback.sql
```

## Common Migration Scenarios

### Scenario 1: Adding a New Table

```prisma
// db/schema.prisma
model Notification {
  id        String   @id @default(uuid())
  personId  String
  message   String
  readAt    DateTime?
  createdAt DateTime @default(now())

  person Person @relation(fields: [personId], references: [id], onDelete: Cascade)
}
```

**Steps:**
1. Add model to schema
2. Generate migration: `npm run prisma:migrate:dev`
3. Add RLS policies in migration SQL
4. Test locally
5. Deploy to staging → production

### Scenario 2: Renaming a Column

**⚠️ DANGEROUS - Requires careful planning**

```sql
-- Step 1: Add new column
ALTER TABLE "Person" ADD COLUMN "display_name" TEXT;

-- Step 2: Copy data
UPDATE "Person" SET "display_name" = "displayName";

-- Step 3: Update code to use new column
-- Deploy code that reads from BOTH columns

-- Step 4: Drop old column (separate migration)
ALTER TABLE "Person" DROP COLUMN "displayName";
```

**Multi-step deployment required!**

### Scenario 3: Adding Non-Nullable Column

```sql
-- Step 1: Add as nullable
ALTER TABLE "Person" ADD COLUMN "tier_level" TEXT;

-- Step 2: Backfill data
UPDATE "Person" SET "tier_level" = 'free' WHERE "tier_level" IS NULL;

-- Step 3: Make NOT NULL (separate migration)
ALTER TABLE "Person" ALTER COLUMN "tier_level" SET NOT NULL;
```

## Validation Checklist

Before each deployment:

### Pre-Migration
- [ ] Local migration applied successfully
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] `npm run validate:all` passes
- [ ] Rollback plan documented

### Post-Migration (Staging)
- [ ] Migration status clean
- [ ] Staging app healthy
- [ ] No error spikes
- [ ] Affected features tested

### Post-Migration (Production)
- [ ] Migration status clean
- [ ] Production app healthy
- [ ] No error spikes
- [ ] Critical paths verified
- [ ] Monitoring shows normal metrics

## Monitoring

### After Production Migration

**First 15 minutes:**
- Watch error rates in Vercel/Supabase dashboard
- Monitor application logs
- Check critical user flows

**First hour:**
- Run full smoke test suite
- Monitor performance metrics
- Check database query performance

**First 24 hours:**
- Review error logs daily
- Monitor user reports
- Check database size/performance

## Emergency Contacts

**If migration fails in production:**

1. Execute rollback immediately
2. Notify team in #engineering Slack
3. Post incident report
4. Schedule post-mortem

## Best Practices

### DO ✅

- Always test migrations on staging first
- Create rollback SQL before production migration
- Apply migrations during low-traffic windows
- Monitor actively after deployment
- Use feature flags to decouple schema from code
- Document complex migrations

### DON'T ❌

- Never apply untested migrations to production
- Never skip staging validation
- Never deploy code before migrations
- Never make breaking schema changes without compatibility layer
- Never run migrations during peak hours
- Never skip rollback preparation

## Troubleshooting

### "Pending migrations detected"

**Cause**: Migrations exist but not applied.

**Fix**: Apply migrations before deploying code.

```bash
npm run prisma:migrate:deploy
```

### "Migration failed halfway"

**Cause**: Migration SQL error or timeout.

**Fix**:
1. Check Supabase logs for exact error
2. Fix migration SQL
3. Reset migration status if needed:

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration-name>

# Fix and reapply
npm run prisma:migrate:deploy
```

### "Type errors after migration"

**Cause**: Prisma client not regenerated.

**Fix**:

```bash
npm run prisma:generate
npm run typecheck
```

## Automation

### GitHub Actions Integration

Migrations are validated automatically in CI:

```yaml
- name: Validate migrations
  run: npm run validate:migrations

- name: Validate schema
  run: npm run validate:schema
```

Builds fail if:
- Pending migrations exist
- Schema drift detected
- Type safety violations

### Scheduled Checks

Add to cron or GitHub Actions:

```bash
# Daily schema parity check
npm run validate:all
```

## Summary

**Golden Rule**: **Migrations first, code second.**

Never deploy code that depends on un-applied migrations.

**Safety Net**: Validation scripts catch drift before deployment.

**Rollback Ready**: Always prepare rollback SQL before production migrations.
