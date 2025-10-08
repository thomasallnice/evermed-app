# EverMed Database Deployment Fix Plan

**Critical Issues Found:** 3 blocking issues preventing production deployment
**Estimated Time to Fix:** 30-60 minutes
**Status:** Ready to execute

---

## Issue 1: Fix DocChunk Foreign Key Cascade (CRITICAL)

### Problem
The `DocChunk.documentId` foreign key was changed from `ON DELETE CASCADE` to `ON DELETE RESTRICT` in migration `20250917074244_add_chat_messages`. This prevents users from deleting documents that have chunks.

### Root Cause
When migration `20250917074244_add_chat_messages` was created, it unnecessarily dropped and recreated the DocChunk FK with incorrect cascade rule.

### Fix Steps

**Step 1: Update Prisma Schema**
```bash
# Edit db/schema.prisma
# Change line 112 from:
#   document Document @relation(fields: [documentId], references: [id])
# To:
#   document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
```

**Step 2: Create Fix Migration**
```bash
# Create new migration
npx prisma migrate dev --name fix_docchunk_cascade --create-only

# Edit the generated migration file to include:
# (See fix_docchunk_cascade.sql below)

# Apply migration
npx prisma migrate dev
```

**Step 3: Verify Fix**
```bash
# Check FK cascade rule in database
npx prisma db execute --stdin --schema=db/schema.prisma << 'EOF'
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'DocChunk';
EOF
# Expected output: delete_rule = 'CASCADE'
```

---

## Issue 2: Organize Loose Migration Files (CRITICAL)

### Problem
Two SQL files exist outside Prisma migration folder structure:
- `20250225120000_add_chat_message.sql` (obsolete, duplicates Sept migration)
- `20251004000000_create_avatars_bucket.sql` (valid, but not tracked by Prisma)

### Fix Steps

**Step 1: Archive Obsolete ChatMessage Migration**
```bash
mkdir -p /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/archive
mv /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/20250225120000_add_chat_message.sql \
   /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/archive/
```

**Step 2: Convert Avatars Bucket to Proper Migration**
```bash
mkdir -p /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/20251004000000_create_avatars_bucket
mv /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/20251004000000_create_avatars_bucket.sql \
   /Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/20251004000000_create_avatars_bucket/migration.sql
```

**Step 3: Update Migration Lock (if needed)**
```bash
# Prisma may detect the new migration folder
# Run migrate status to check
npx prisma migrate status --schema=/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma
```

---

## Issue 3: Add Person.ownerId Unique Constraint (RECOMMENDED)

### Problem
Multiple Person records could be created for the same Supabase user (ownerId).

### Fix Steps

**Step 1: Update Prisma Schema**
```bash
# Edit db/schema.prisma
# Change line 15 from:
#   ownerId String // supabase auth.uid()
# To:
#   ownerId String @unique // supabase auth.uid() - enforce 1:1 mapping
```

**Step 2: Create Migration**
```bash
npx prisma migrate dev --name add_person_ownerid_unique
```

**Step 3: Verify**
```bash
npx prisma db execute --stdin --schema=db/schema.prisma << 'EOF'
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Person'
AND indexname LIKE '%ownerId%';
EOF
# Should show unique index on ownerId
```

---

## Quick Fix Script (Run All at Once)

```bash
#!/bin/bash
set -e

echo "🔧 EverMed Database Deployment Fixes"
echo "===================================="

# Fix 1: Update Prisma schema for DocChunk cascade
echo "📝 Step 1: Updating Prisma schema..."
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed

# Backup schema
cp db/schema.prisma db/schema.prisma.backup

# Update DocChunk relation (line 112)
sed -i.tmp '112s/.*/  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)/' db/schema.prisma

# Update Person.ownerId with unique (line 15)
sed -i.tmp '15s/.*/  ownerId    String   @unique \/\/ supabase auth.uid()/' db/schema.prisma

rm db/schema.prisma.tmp

echo "✅ Schema updated"

# Fix 2: Create migration for DocChunk cascade
echo "📝 Step 2: Creating fix migration..."
npx prisma migrate dev --name fix_docchunk_cascade_and_person_unique --create-only

# Get the latest migration folder
MIGRATION_DIR=$(ls -td db/migrations/2*/ | head -1)

# Add FK fix to migration
cat >> "${MIGRATION_DIR}migration.sql" << 'EOF'

-- Fix DocChunk foreign key cascade (changed from RESTRICT to CASCADE)
ALTER TABLE "DocChunk" DROP CONSTRAINT "DocChunk_documentId_fkey";
ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
EOF

echo "✅ Migration created: ${MIGRATION_DIR}"

# Fix 3: Organize loose migrations
echo "📝 Step 3: Organizing loose migrations..."
mkdir -p db/migrations/archive

# Archive obsolete ChatMessage migration
if [ -f "db/migrations/20250225120000_add_chat_message.sql" ]; then
    mv db/migrations/20250225120000_add_chat_message.sql \
       db/migrations/archive/
    echo "✅ Archived obsolete ChatMessage migration"
fi

# Convert avatars bucket to proper migration
if [ -f "db/migrations/20251004000000_create_avatars_bucket.sql" ]; then
    mkdir -p db/migrations/20251004000000_create_avatars_bucket
    mv db/migrations/20251004000000_create_avatars_bucket.sql \
       db/migrations/20251004000000_create_avatars_bucket/migration.sql
    echo "✅ Converted avatars bucket to proper migration"
fi

# Fix 4: Apply migrations
echo "📝 Step 4: Applying migrations..."
npx prisma migrate dev

# Fix 5: Verify
echo "📝 Step 5: Verifying fixes..."
npx prisma validate

echo ""
echo "✅ All fixes applied successfully!"
echo ""
echo "Next steps:"
echo "1. Run tests: npm run test"
echo "2. Run smoke test: ./scripts/smoke-e2e.sh"
echo "3. Deploy to staging"
echo "4. Apply RLS policies: db/supabase_rls_policies.sql"
echo "5. Deploy to production"
```

---

## Manual Fix SQL (For Direct Database Execution)

If you need to apply fixes directly to database (e.g., production hotfix):

```sql
-- Fix 1: DocChunk cascade (CRITICAL)
ALTER TABLE "DocChunk" DROP CONSTRAINT "DocChunk_documentId_fkey";
ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix 2: Person.ownerId unique constraint (RECOMMENDED)
CREATE UNIQUE INDEX IF NOT EXISTS "Person_ownerId_key" ON "Person"("ownerId");
```

---

## Verification Queries

Run these after applying fixes:

```sql
-- Verify DocChunk cascade
SELECT
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'DocChunk'
AND kcu.column_name = 'documentId';
-- Expected: delete_rule = 'CASCADE'

-- Verify Person.ownerId unique
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'Person'
AND indexname LIKE '%ownerId%';
-- Expected: Unique index on ownerId

-- Test cascade deletion (CAUTION: Use test data only!)
-- CREATE TEMP TABLE test_doc AS SELECT * FROM "Document" LIMIT 1;
-- DELETE FROM "Document" WHERE id = (SELECT id FROM test_doc);
-- SELECT COUNT(*) FROM "DocChunk" WHERE "documentId" = (SELECT id FROM test_doc);
-- Expected: 0 (chunks should be deleted)
```

---

## Rollback Plan (If Fixes Cause Issues)

```sql
-- Rollback DocChunk to RESTRICT (original broken state)
ALTER TABLE "DocChunk" DROP CONSTRAINT "DocChunk_documentId_fkey";
ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove Person.ownerId unique constraint
DROP INDEX IF EXISTS "Person_ownerId_key";

-- Restore schema
cp db/schema.prisma.backup db/schema.prisma
npx prisma generate
```

---

## Deployment Timeline

**Local Environment:**
1. Apply fixes: 10 minutes
2. Run tests: 5 minutes
3. Verify locally: 5 minutes

**Staging Environment:**
1. Deploy migrations: 5 minutes
2. Apply RLS policies: 5 minutes
3. Smoke test: 10 minutes

**Production Environment:**
1. Backup database: 5 minutes
2. Deploy migrations: 5 minutes
3. Apply RLS policies: 5 minutes
4. Verify & monitor: 15 minutes

**Total Estimated Time:** 60-90 minutes (including buffer)

---

## Post-Fix Checklist

- [ ] DocChunk FK cascade verified (delete_rule = CASCADE)
- [ ] Person.ownerId unique constraint verified
- [ ] Loose migrations organized (no files in root migrations folder)
- [ ] Prisma schema matches database (npx prisma validate)
- [ ] All tests pass (npm run test)
- [ ] Smoke test passes (./scripts/smoke-e2e.sh)
- [ ] Document deletion works (cascades to chunks)
- [ ] User cannot create duplicate Person records
- [ ] RLS policies applied and tested
- [ ] Avatar upload/display works
- [ ] No schema drift warnings

---

**Created:** 2025-10-04
**Last Updated:** 2025-10-04
**Status:** Ready to Execute
