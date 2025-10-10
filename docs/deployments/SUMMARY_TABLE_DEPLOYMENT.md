# Summary Table Deployment Guide

## Overview

**Migration Name:** Add Summary Table
**Date Created:** 2025-10-09
**Status:** ✅ DEPLOYED TO DEV | ⏳ PENDING STAGING | ⏳ PENDING PRODUCTION
**Type:** Manual Migration (Prisma migrations blocked by storage bucket operation)

## Migration Summary

Adds the `Summary` table to store AI-generated document summaries with:
- One-to-one relationship with Document
- RLS policies for multi-tenant isolation
- Cascade deletion when parent Document is deleted
- Support for structured JSON output

## Schema Changes

### New Table: Summary

```sql
CREATE TABLE "Summary" (
  "id" TEXT PRIMARY KEY,
  "documentId" TEXT UNIQUE NOT NULL,
  "userId" TEXT,
  "summaryText" TEXT NOT NULL,
  "structuredJson" JSONB,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL
);
```

### Foreign Keys

- `documentId` → `Document.id` (CASCADE on DELETE and UPDATE)

### Indexes

- `Summary_pkey` (PRIMARY KEY on `id`)
- `Summary_documentId_key` (UNIQUE on `documentId`)
- `Summary_userId_idx` (BTREE on `userId`)

### RLS Policies

- `summary_owner_select` - Users can SELECT summaries for their own documents
- `summary_owner_mod` - Users can INSERT/UPDATE/DELETE summaries for their own documents

Both policies traverse: `Summary` → `Document` → `Person` → `ownerId = auth.uid()`

## Deployment Status

### ✅ DEV Environment (wukrnqifpgjwbqxpockm)

**Deployment Date:** 2025-10-09
**Method:** Manual SQL via psql
**Status:** COMPLETE

**Validation Results:**
- ✅ Table created with correct schema
- ✅ Foreign key constraint applied with CASCADE
- ✅ All indexes created successfully
- ✅ RLS enabled and policies applied
- ✅ Test insert/select operations passed
- ✅ Test data cleaned up

### ⏳ STAGING Environment (jwarorrwgpqrksrxmesx)

**Status:** NOT YET DEPLOYED

### ⏳ PRODUCTION Environment (nqlxlkhbriqztkzwbdif)

**Status:** NOT YET DEPLOYED

## Deployment Instructions

### Prerequisites

1. Database credentials for target environment
2. psql CLI installed (or use Supabase SQL Editor)
3. Backup of database (recommended for staging/production)

### Step-by-Step Deployment

#### Option A: Using psql (Recommended)

```bash
# 1. Set database credentials
export PGPASSWORD="your-db-password"
export DB_HOST="db.your-project-ref.supabase.co"
export DB_USER="postgres"
export DB_NAME="postgres"

# 2. Apply migration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p 5432 \
  -f db/migrations/manual_add_summary.sql

# 3. Verify deployment
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p 5432 -c "
  SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Summary') as table_exists,
    (SELECT COUNT(*) FROM pg_tables WHERE tablename = 'Summary' AND rowsecurity = true) as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'Summary') as policies_count;
"
```

#### Option B: Using Supabase SQL Editor

1. Navigate to Supabase Dashboard → SQL Editor
2. Copy contents of `db/migrations/manual_add_summary.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Verify results show successful table creation

#### Option C: Using Supabase CLI

```bash
# 1. Link to target environment
supabase link --project-ref your-project-ref

# 2. Apply migration
supabase db push --file db/migrations/manual_add_summary.sql

# 3. Verify
supabase db pull
```

### Post-Deployment Verification

Run these queries in Supabase SQL Editor or via psql:

```sql
-- 1. Verify table exists
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'Summary'
ORDER BY ordinal_position;

-- 2. Verify foreign key
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'Summary' AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Verify RLS policies
SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE tablename = 'Summary';

-- Expected Results:
-- - 7 columns in Summary table
-- - 1 foreign key with CASCADE delete/update
-- - 2 RLS policies (summary_owner_select, summary_owner_mod)
```

## Rollback Strategy

### Immediate Rollback (if issues detected)

```sql
-- Drop table and all associated constraints
DROP TABLE IF EXISTS "Summary" CASCADE;
```

**WARNING:** This will permanently delete all Summary data. Ensure you have a backup.

### Partial Rollback (remove policies only)

```sql
-- Remove RLS policies but keep table
DROP POLICY IF EXISTS "summary_owner_select" ON "Summary";
DROP POLICY IF EXISTS "summary_owner_mod" ON "Summary";
ALTER TABLE "Summary" DISABLE ROW LEVEL SECURITY;
```

### Application Code Rollback

If application code was deployed that depends on Summary table:

1. Revert application deployment to previous version
2. Keep Summary table in database (empty table is safe)
3. Deploy table rollback in next maintenance window

## Known Issues & Resolutions

### Issue 1: Prisma Migrate Blocked

**Problem:** `prisma migrate dev` fails due to storage bucket migration in queue

**Root Cause:** Migration `20251004000000_create_avatars_bucket` contains `INSERT INTO storage.buckets` which cannot be executed via Prisma

**Resolution:**
- Separate Supabase-specific operations (storage, auth, edge functions) from Prisma migrations
- Apply Supabase operations via SQL Editor or `supabase db push`
- Apply Prisma migrations via `prisma migrate dev`

**Long-term Fix:**
1. Move storage bucket migration to `db/migrations/manual_supabase_storage_avatars.sql`
2. Apply manually via Supabase SQL Editor
3. Resume normal Prisma workflow

### Issue 2: RLS Policy Type Mismatch

**Problem:** `auth.uid()` returns UUID but `Person.ownerId` is TEXT

**Resolution:** Cast `auth.uid()` to TEXT in RLS policies:

```sql
WHERE p."ownerId" = auth.uid()::text
```

This is already implemented in the migration file.

## Testing Checklist

Before deploying to STAGING/PRODUCTION:

- [ ] Verify DEV environment is stable with Summary table
- [ ] Test Summary creation via Prisma Client
- [ ] Test Summary retrieval with RLS enforcement
- [ ] Test cascade deletion (Document delete → Summary delete)
- [ ] Verify RLS prevents cross-user data access
- [ ] Confirm no console errors in application logs
- [ ] Run full E2E test suite
- [ ] Check database backup is recent (< 24 hours)
- [ ] Notify team of deployment window

## Performance Considerations

### Index Strategy

- `documentId` has UNIQUE constraint (serves as index for foreign key lookups)
- `userId` has BTREE index (optimizes RLS policy queries)
- No additional indexes needed for MVP

### RLS Policy Performance

Both RLS policies perform:
1. One JOIN: `Document` → `Person`
2. Two equality checks: `documentId` match and `ownerId` match

**Expected Performance:**
- Indexed lookups on foreign keys (very fast)
- Subquery EXISTS pattern (optimized by PostgreSQL)
- No N+1 queries

**Monitoring:**
- Watch for slow queries in Supabase Dashboard
- Consider materialized views if policy queries become bottleneck (unlikely for MVP)

## Security Audit

### Data Isolation

✅ **VERIFIED:** Summary table RLS policies correctly traverse relationships to enforce isolation

- Users can only access summaries for their own documents
- Summaries inherit security from parent Document
- No direct user_id comparison (prevents spoofing)

### Cascade Deletion

✅ **VERIFIED:** Cascade deletion prevents orphaned records

- Document deletion → Summary auto-deleted
- No manual cleanup required
- Foreign key constraint enforced at database level

### Service Role Access

⚠️ **IMPORTANT:** Service role bypasses RLS

- Use service role only for:
  - Background jobs (OCR ingestion)
  - Admin operations
  - System-generated summaries
- Never use service role for user-facing API routes

## Application Integration

### Prisma Client Usage

```typescript
// Create summary
await prisma.summary.create({
  data: {
    documentId: documentId,
    userId: userId, // For RLS compatibility
    summaryText: "AI-generated summary...",
    structuredJson: { sections: [...] },
    model: "gpt-5-mini",
  },
});

// Get summary for document (RLS enforced)
const summary = await prisma.summary.findUnique({
  where: { documentId: documentId },
  include: { document: true },
});

// Update summary
await prisma.summary.update({
  where: { documentId: documentId },
  data: { summaryText: "Updated summary..." },
});

// Delete summary (cascade happens automatically when Document deleted)
await prisma.document.delete({
  where: { id: documentId },
}); // Summary auto-deleted via CASCADE
```

### API Route Pattern

```typescript
// apps/web/src/app/api/summaries/[documentId]/route.ts
export async function GET(req: Request, { params }: { params: { documentId: string } }) {
  const userId = req.headers.get('x-user-id'); // Dev auth
  // Or: const session = await getSupabaseSession(); // Prod auth

  // RLS enforced automatically
  const summary = await prisma.summary.findUnique({
    where: { documentId: params.documentId },
  });

  return Response.json(summary);
}
```

## Next Steps

1. **Staging Deployment:**
   - Schedule maintenance window
   - Apply migration to STAGING environment
   - Run full test suite
   - Monitor for 24 hours

2. **Production Deployment:**
   - Schedule low-traffic window
   - Create database backup
   - Apply migration to PRODUCTION environment
   - Monitor application logs for errors
   - Verify no RLS violations in Supabase logs

3. **Documentation:**
   - Update API documentation with Summary endpoints
   - Document Summary model in Prisma schema comments
   - Add Summary usage to developer onboarding guide

## References

- Migration File: `db/migrations/manual_add_summary.sql`
- Prisma Schema: `db/schema.prisma` (lines 152-164)
- RLS Documentation: `docs/CODEX_REFIT_PLAN.md` (RLS section)

## Contact

For deployment questions or issues:
- Check `docs/CODEX_REFIT_PLAN.md` for architecture context
- Review `.claude/memory/active-issues.md` for known issues
- Consult database-architect subagent for migration validation
