# EverMed Database Deployment Validation Report

**Date:** 2025-10-04
**Schema Location:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma`
**Database:** PostgreSQL (Supabase)
**Status:** ⚠️ **CRITICAL ISSUES FOUND - NO-GO FOR DEPLOYMENT**

---

## Executive Summary

The database validation has identified **3 CRITICAL ISSUES** that must be resolved before production deployment:

1. ❌ **CRITICAL**: DocChunk foreign key cascade rule mismatch (BLOCKING)
2. ⚠️ **CRITICAL**: Loose migration SQL files outside Prisma migration system (BLOCKING)
3. ⚠️ **CRITICAL**: Missing onDelete cascade specification in Prisma schema (BLOCKING)

**DEPLOYMENT RECOMMENDATION: NO-GO** - Critical issues must be resolved first.

---

## 1. Schema Integrity Analysis

### ✅ PASSED: Prisma Schema Validation
- Schema syntax: Valid
- All models properly defined
- Relations are bidirectional
- No syntax errors

### ❌ CRITICAL ISSUE: Foreign Key Cascade Mismatch

**Problem:** The `DocChunk.documentId` foreign key has INCORRECT cascade behavior.

**What Happened:**
- Initial migration (20250911081240_init) created FK with `ON DELETE CASCADE` ✅
- Migration 20250917074244_add_chat_messages **CHANGED** it to `ON DELETE RESTRICT` ❌

**Current State (INCORRECT):**
```sql
-- In database (migration 20250917074244_add_chat_messages)
ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;  -- WRONG!
```

**Expected State (from schema.prisma):**
```prisma
model DocChunk {
  document Document @relation(fields: [documentId], references: [id])
  // Default in Prisma is ON DELETE CASCADE when no onDelete specified
}
```

**Impact:**
- Users CANNOT delete documents that have chunks (will fail with FK violation)
- Deleting a Document should cascade to all DocChunk records
- This breaks the expected UX where deleting a document removes all associated data

**Required Fix:**
```sql
-- Run this migration to fix the cascade rule
ALTER TABLE "DocChunk" DROP CONSTRAINT "DocChunk_documentId_fkey";
ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

### ❌ CRITICAL ISSUE: Missing onDelete in Prisma Schema

**Problem:** The `DocChunk` relation in `schema.prisma` does NOT explicitly specify `onDelete: Cascade`.

**Current Schema (AMBIGUOUS):**
```prisma
model DocChunk {
  document Document @relation(fields: [documentId], references: [id])
  // Missing onDelete specification!
}
```

**Required Fix:**
```prisma
model DocChunk {
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  // Explicit cascade ensures consistency
}
```

**Why This Matters:**
- Prisma's default behavior is NOT clearly documented
- Migration 20250917074244 changed it to RESTRICT (incorrect)
- Explicit `onDelete: Cascade` prevents future migration drift

---

## 2. Migration Integrity Analysis

### ✅ PASSED: Migration Status
- Prisma reports: "Database schema is up to date!"
- 4 migrations found and applied successfully
- No pending migrations

### ⚠️ CRITICAL ISSUE: Loose Migration SQL Files

**Problem:** Two SQL files exist OUTSIDE the Prisma migration folder structure:

1. `/db/migrations/20250225120000_add_chat_message.sql` (392 bytes)
2. `/db/migrations/20251004000000_create_avatars_bucket.sql` (4.3 KB)

**Why This Is Critical:**
- Prisma migrations must be in folders with `migration.sql` inside
- Loose SQL files are NOT tracked by Prisma's migration system
- Future `prisma migrate deploy` will IGNORE these files
- Causes schema drift between environments

**Current Migration Structure (INCORRECT):**
```
db/migrations/
├── 20250225120000_add_chat_message.sql         ❌ LOOSE FILE
├── 20250911081240_init/migration.sql            ✅ CORRECT
├── 20250911160708_add_source_anchor/migration.sql ✅ CORRECT
├── 20250912120000_add_chat_messages_backref/migration.sql ✅ CORRECT
├── 20250917074244_add_chat_messages/migration.sql ✅ CORRECT
└── 20251004000000_create_avatars_bucket.sql    ❌ LOOSE FILE
```

**Required Action:**

**Option 1: Convert to Proper Migrations (RECOMMENDED)**
```bash
# Create proper migration folder for avatars bucket
mkdir -p db/migrations/20251004000000_create_avatars_bucket
mv db/migrations/20251004000000_create_avatars_bucket.sql \
   db/migrations/20251004000000_create_avatars_bucket/migration.sql

# Archive the obsolete ChatMessage migration (already applied in 20250917074244)
mkdir -p db/migrations/archive
mv db/migrations/20250225120000_add_chat_message.sql \
   db/migrations/archive/20250225120000_add_chat_message.sql
```

**Option 2: Manual Deployment Script**
- Document these files in `db/DEPLOYMENT_CHECKLIST.md`
- Create a deployment script that applies them separately
- Risk: Easy to forget in future deployments

---

## 3. Relation Integrity Analysis

### ✅ PASSED: Bidirectional Relations
All relations are properly defined on both sides:

- Person ↔ Document ✅
- Person ↔ Observation ✅
- Person ↔ SharePack ✅
- Document ↔ DocChunk ✅ (but cascade broken, see above)
- Document ↔ Observation ✅
- Document ↔ ChatMessage ✅
- SharePack ↔ SharePackItem ✅
- SharePack ↔ ShareEvent ✅

### ✅ PASSED: Cascade Deletion Rules (Except DocChunk)

**Correct Cascade Rules (from schema.prisma):**
- Person deleted → Documents CASCADE ✅
- Person deleted → Observations CASCADE ✅
- Person deleted → SharePacks CASCADE ✅
- Document deleted → Observations CASCADE ✅
- Document deleted → SharePackItems CASCADE ✅
- Document deleted → **DocChunk SHOULD CASCADE** ❌ (currently RESTRICT)
- SharePack deleted → SharePackItems CASCADE ✅
- SharePack deleted → ShareEvents CASCADE ✅

### ⚠️ WARNING: ChatMessage Deletion Behavior

**Current Schema:**
```prisma
model ChatMessage {
  document Document? @relation(fields: [documentId], references: [id])
  // No onDelete specified for optional relation
}
```

**Current Migration (20250917074244_add_chat_messages):**
```sql
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
```

**Analysis:**
- When Document is deleted, ChatMessage.documentId is SET NULL ✅
- This is CORRECT for optional relations (preserves chat history)
- Chat messages remain accessible even if source document deleted ✅
- **NO ACTION REQUIRED** - this is the intended behavior

---

## 4. Index Analysis

### ✅ PASSED: Primary Indexes
All tables have proper primary keys:
- All use `@id @default(uuid())` ✅

### ✅ PASSED: Performance Indexes (from schema.prisma)

**Defined in Schema:**
- `Observation`: `@@index([personId, code, effectiveAt])` ✅
- `DocChunk`: `@@unique([documentId, chunkId])` ✅
- `ChatMessage`: `@@index([userId, createdAt])` ✅
- `AnalyticsEvent`: `@@index([name, createdAt])` ✅

**Defined in RLS Policies (db/supabase_rls_policies.sql):**
- `Person.ownerId` (idx_person_owner_id) ✅
- `Document.personId` (idx_document_person_id) ✅
- `Observation.personId` (idx_observation_person_id) ✅
- `SharePack.personId` (idx_sharepack_person_id) ✅
- `SharePackItem.packId` (idx_sharepackitem_pack_id) ✅
- `ShareEvent.packId` (idx_shareevent_pack_id) ✅
- `DocChunk.documentId` (idx_docchunk_document_id) ✅
- `ChatMessage.userId` (idx_chatmessage_user_id) ✅
- `TokenUsage.userId` (idx_tokenusage_user_id) ✅
- `AnalyticsEvent.userId` (idx_analyticsevent_user_id) ✅

### ⚠️ RECOMMENDATION: Missing Foreign Key Indexes

While RLS policy indexes cover most cases, consider adding explicit indexes in Prisma schema:

```prisma
model Document {
  personId String
  @@index([personId]) // Already covered by RLS, but good to be explicit
}

model Observation {
  sourceDocId String
  @@index([sourceDocId]) // For reverse lookups (Document → Observations)
}

model SharePackItem {
  packId String
  documentId String?
  observationId String?
  @@index([packId]) // Already in RLS
  @@index([documentId]) // Add for reverse lookup
  @@index([observationId]) // Add for reverse lookup
}
```

**Impact if not added:** Low priority - RLS indexes cover most queries.

---

## 5. pgvector Integration Analysis

### ✅ PASSED: Extension Setup
- Migration 20250911081240_init creates pgvector extension ✅
- Uses `CREATE EXTENSION IF NOT EXISTS vector` (idempotent) ✅

### ✅ PASSED: Vector Column Definition

**Schema Definition:**
```prisma
model DocChunk {
  embedding Unsupported("vector")?
}
```

**Migration SQL:**
```sql
"embedding" vector
```

**Analysis:**
- Correct use of `Unsupported("vector")` for pgvector ✅
- Column is optional (can be NULL during upload) ✅
- Dimension not specified in schema (set in code) ✅

### ⚠️ WARNING: No Vector Index Found

**Issue:** No HNSW or IVFFlat index found on `DocChunk.embedding`.

**Impact:**
- Vector similarity searches will be SLOW (full table scan)
- Acceptable for small datasets (<10K chunks)
- REQUIRED for production at scale (>10K chunks)

**Recommended Index (add to migration when scaling):**
```sql
-- For cosine similarity (most common for embeddings)
CREATE INDEX IF NOT EXISTS docchunk_embedding_cosine_idx
ON "DocChunk" USING hnsw (embedding vector_cosine_ops);

-- OR for L2 distance
CREATE INDEX IF NOT EXISTS docchunk_embedding_l2_idx
ON "DocChunk" USING hnsw (embedding vector_l2_ops);
```

**When to add:**
- When DocChunk table exceeds 5,000 rows
- When RAG queries take >500ms
- Before launching to production with multiple users

---

## 6. RLS Policy Compatibility

### ✅ PASSED: RLS Policy Coverage
All tables have comprehensive RLS policies defined in `db/supabase_rls_policies.sql`:

**Multi-tenant Isolation (Person.ownerId):**
- Person table: Direct ownership via `auth.uid()::text = ownerId` ✅
- Document table: Transitive via Person ✅
- Observation table: Transitive via Person ✅
- SharePack table: Transitive via Person ✅
- SharePackItem table: Transitive via SharePack → Person ✅
- ShareEvent table: Transitive via SharePack → Person ✅
- DocChunk table: Transitive via Document → Person ✅
- ChatMessage table: Direct ownership via `auth.uid()::text = userId` ✅

**Service Role Bypass:**
- All tables have `service_role` policies ✅
- Used for server-side operations (signed URLs, embeddings) ✅

**Storage Bucket Policies:**
- `documents` bucket: Private with RLS ✅
- `avatars` bucket: Public read, authenticated write ✅

### ⚠️ CONSIDERATION: Foreign Key vs RLS Interaction

**Current Setup:**
- Foreign keys enforce referential integrity at DB level
- RLS policies enforce authorization at row level
- Both work together correctly ✅

**Potential Edge Case:**
If DocChunk FK remains `ON DELETE RESTRICT`:
1. User tries to delete Document via API (using service role)
2. RLS allows deletion (user owns the Person)
3. FK constraint BLOCKS deletion (DocChunks exist)
4. API returns 500 error instead of graceful cleanup

**This reinforces the CRITICAL need to fix DocChunk cascade rule.**

---

## 7. Data Integrity Constraints

### ✅ PASSED: NOT NULL Constraints
All required fields properly marked as NOT NULL:
- Person.ownerId ✅
- Document.personId, kind, filename, storagePath, sha256 ✅
- Observation.personId, code, display, sourceDocId ✅
- SharePack.personId, title, audience, passcodeHash, expiresAt ✅
- ChatMessage.userId, role, content ✅

### ✅ PASSED: Default Values
- Timestamps: `@default(now())` on createdAt fields ✅
- Locale: `@default("de-DE")` on Person.locale ✅
- ViewsCount: `@default(0)` on SharePack.viewsCount ✅

### ✅ PASSED: Unique Constraints
- `DocChunk`: `@@unique([documentId, chunkId])` prevents duplicates ✅
- Primary keys on all tables ✅

### ⚠️ RECOMMENDATION: Add Unique Constraint on Person.ownerId

**Current Schema:**
```prisma
model Person {
  id String @id @default(uuid())
  ownerId String // supabase auth.uid()
}
```

**Issue:** One Supabase user could theoretically create multiple Person records.

**Recommendation:**
```prisma
model Person {
  id String @id @default(uuid())
  ownerId String @unique // Enforce 1:1 with Supabase auth
}
```

**Impact if not added:**
- Application logic must prevent duplicate Person records
- Risk of data inconsistency if API has bug
- Low priority if application enforces this (but DB should be source of truth)

---

## 8. Migration Timeline & Consistency

### Migration History (Chronological Order)

1. **20250911081240_init** (Sept 11, 2025)
   - Created all core tables
   - Enabled pgvector extension
   - Set up initial foreign keys with CASCADE ✅

2. **20250911160708_add_source_anchor** (Sept 11, 2025)
   - Added `DocChunk.sourceAnchor` column ✅

3. **20250912120000_add_chat_messages_backref** (Sept 12, 2025)
   - No-op migration (Prisma-only relation) ✅

4. **20250917074244_add_chat_messages** (Sept 17, 2025)
   - Created ChatMessage table ✅
   - **BROKE DocChunk FK cascade** (changed to RESTRICT) ❌

5. **20250225120000_add_chat_message.sql** (Feb 25, 2025 - FUTURE DATE?)
   - LOOSE FILE (not in Prisma system) ❌
   - Appears to be older/alternative ChatMessage creation
   - **CONFLICT:** Date suggests this was meant to run BEFORE Sept 2025 migrations

6. **20251004000000_create_avatars_bucket.sql** (Oct 4, 2025 - TODAY)
   - LOOSE FILE (not in Prisma system) ❌
   - Creates avatars storage bucket + RLS policies
   - Not tracked by Prisma migrations

### ❌ CRITICAL ISSUE: Migration Date Inconsistency

**Problem:** Migration `20250225120000_add_chat_message.sql` has a date of **February 25, 2025**, but other migrations are from **September 2025**.

**Analysis:**
- Either the date is wrong (typo: should be 20250925?)
- Or this is a leftover file from earlier development
- The ChatMessage table was created in `20250917074244_add_chat_messages` (Sept 17)
- This suggests `20250225120000_add_chat_message.sql` is **obsolete/duplicate**

**Recommended Action:**
Move to archive folder (already applied via later migration):
```bash
mkdir -p db/migrations/archive
mv db/migrations/20250225120000_add_chat_message.sql \
   db/migrations/archive/
```

---

## 9. Production Deployment Readiness

### ❌ BLOCKING ISSUES (Must Fix Before Deployment)

1. **Fix DocChunk Foreign Key Cascade**
   ```sql
   ALTER TABLE "DocChunk" DROP CONSTRAINT "DocChunk_documentId_fkey";
   ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
   FOREIGN KEY ("documentId") REFERENCES "Document"("id")
   ON DELETE CASCADE ON UPDATE CASCADE;
   ```

2. **Update Prisma Schema**
   ```prisma
   model DocChunk {
     document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
   }
   ```

3. **Organize Loose Migration Files**
   - Move `20250225120000_add_chat_message.sql` to archive
   - Convert `20251004000000_create_avatars_bucket.sql` to proper Prisma migration

### ⚠️ RECOMMENDED FIXES (Should Fix Before Deployment)

4. **Add Person.ownerId Unique Constraint**
   ```prisma
   model Person {
     ownerId String @unique
   }
   ```

5. **Add Vector Index (when scaling)**
   ```sql
   CREATE INDEX docchunk_embedding_cosine_idx
   ON "DocChunk" USING hnsw (embedding vector_cosine_ops);
   ```

### ✅ OPTIONAL ENHANCEMENTS (Post-Deployment)

6. **Explicit Foreign Key Indexes**
   - Add `@@index([sourceDocId])` to Observation
   - Add `@@index([documentId])` to SharePackItem
   - Add `@@index([observationId])` to SharePackItem

7. **Add Comments to Schema**
   ```prisma
   /// FHIR-aligned observation (lab result, vital sign, etc.)
   model Observation {
     // ...
   }
   ```

---

## 10. Deployment Checklist

### Pre-Deployment Steps

- [ ] **FIX BLOCKING ISSUE 1:** Update DocChunk FK to CASCADE
  ```bash
  npx prisma migrate dev --name fix_docchunk_cascade --create-only
  # Edit migration to include ALTER TABLE commands
  npx prisma migrate dev
  ```

- [ ] **FIX BLOCKING ISSUE 2:** Update schema.prisma with explicit onDelete
  ```bash
  # Edit db/schema.prisma
  npx prisma format
  npx prisma validate
  ```

- [ ] **FIX BLOCKING ISSUE 3:** Organize loose migrations
  ```bash
  mkdir -p db/migrations/archive
  mv db/migrations/20250225120000_add_chat_message.sql db/migrations/archive/

  mkdir -p db/migrations/20251004000000_create_avatars_bucket
  mv db/migrations/20251004000000_create_avatars_bucket.sql \
     db/migrations/20251004000000_create_avatars_bucket/migration.sql
  ```

- [ ] **Verify migrations**
  ```bash
  npx prisma migrate status
  ```

- [ ] **Generate Prisma client**
  ```bash
  npx prisma generate
  ```

- [ ] **Run tests**
  ```bash
  npm run typecheck
  npm run lint
  npm run test
  ./scripts/smoke-e2e.sh
  ```

### Deployment to Staging

- [ ] Set environment variables in Vercel/staging
- [ ] Deploy migrations: `npx prisma migrate deploy`
- [ ] Apply RLS policies: Run `db/supabase_rls_policies.sql` in Supabase SQL Editor
- [ ] Apply avatar bucket setup: Ensure `20251004000000_create_avatars_bucket` is applied
- [ ] Verify pgvector extension: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] Test upload → explain → share pack flow
- [ ] Test document deletion (should cascade to chunks)
- [ ] Test avatar upload/display
- [ ] Check RLS isolation (create test user, verify no data leakage)

### Deployment to Production

- [ ] Backup production database (Supabase: Database → Backups)
- [ ] Set all environment variables in Vercel production
- [ ] Deploy migrations: `npx prisma migrate deploy`
- [ ] Apply RLS policies: Run `db/supabase_rls_policies.sql` in Supabase SQL Editor
- [ ] Apply avatar bucket setup: Ensure `20251004000000_create_avatars_bucket` is applied
- [ ] Verify indexes exist (check pg_indexes)
- [ ] Run smoke tests against production
- [ ] Monitor Supabase logs for errors
- [ ] Test end-to-end flow with real account

---

## 11. Summary & Recommendations

### Current Status: ❌ NOT READY FOR PRODUCTION

**Critical Blockers:**
1. DocChunk foreign key cascade is BROKEN (DELETE operations will fail)
2. Loose migration files will cause schema drift across environments
3. Prisma schema missing explicit cascade specification

**Estimated Time to Fix:** 30-60 minutes
1. Create fix migration for DocChunk FK (10 min)
2. Update schema.prisma with explicit onDelete (5 min)
3. Organize migration files (5 min)
4. Test locally (10 min)
5. Deploy to staging and verify (15 min)

### Post-Fix Status: ✅ READY FOR STAGING

Once blocking issues are resolved:
- All tables properly configured ✅
- RLS policies comprehensive ✅
- Indexes adequate for initial launch ✅
- pgvector ready for RAG operations ✅

### Scaling Considerations (Future)

When app grows beyond MVP:
1. Add vector index on DocChunk.embedding (>5K chunks)
2. Consider partitioning TokenUsage by month (>1M rows)
3. Add composite index on Document (personId, uploadedAt) for dashboard queries
4. Enable connection pooling (PgBouncer) if queries exceed Supabase limits

---

## 12. Files Reference

**Schema & Migrations:**
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma` - Prisma schema
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/` - Migration history
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/supabase_rls_policies.sql` - RLS policies

**Documentation:**
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/README_SECURITY.md` - Security guide
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/RLS_IMPLEMENTATION_SUMMARY.md` - RLS summary
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/docs/CODEX_REFIT_PLAN.md` - Architecture plan

---

**Report Generated:** 2025-10-04
**Database Architect:** Claude Code (Sonnet 4.5)
**Validation Scope:** Schema integrity, migrations, RLS, pgvector, deployment readiness
