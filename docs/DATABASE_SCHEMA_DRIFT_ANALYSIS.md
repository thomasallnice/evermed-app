# Database Schema Drift Analysis - EverMed Project

**Date:** 2025-10-10
**Analyst:** Database Architect Agent
**Status:** CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

A comprehensive investigation of the EverMed database schema has revealed **multiple critical schema drift issues** between Prisma schema definitions, actual database migrations, and TypeScript code. These inconsistencies pose risks to data integrity, deployment reliability, and type safety.

**Key Findings:**
- 🔴 **CRITICAL:** PersonalModel schema has 9+ missing fields in migrations
- 🔴 **CRITICAL:** AnalyticsEvent field naming mismatch (name/eventName, meta/metadata)
- 🟡 **HIGH:** ChatMessage table uses uuid vs TEXT for documentId
- 🟡 **HIGH:** Missing migration for Person.metadata field
- 🟢 **MEDIUM:** Inconsistent field naming conventions across migrations
- 🟢 **LOW:** Missing indexes on foreign keys in some migrations

---

## 1. Critical Schema Drift Issues

### 1.1 PersonalModel Table - MAJOR DRIFT

**Migration vs Prisma Schema Comparison:**

| Field | Migration (20251010090000) | Prisma Schema | Status |
|-------|----------------------------|---------------|--------|
| `id` | ✅ TEXT | ✅ String | OK |
| `person_id` | ✅ TEXT | ✅ String | OK |
| `model_type` | ❌ **MISSING** | ✅ String | **MISSING IN DB** |
| `version` | ❌ Called `model_version` | ✅ String | **FIELD NAME MISMATCH** |
| `is_active` | ❌ **MISSING** | ✅ Boolean | **MISSING IN DB** |
| `training_data_start` | ❌ **MISSING** | ✅ DateTime | **MISSING IN DB** |
| `training_data_end` | ❌ **MISSING** | ✅ DateTime | **MISSING IN DB** |
| `trained_at` | ❌ Called `last_trained_at` | ✅ DateTime | **FIELD NAME MISMATCH** |
| `last_used_at` | ❌ **MISSING** | ✅ DateTime? | **MISSING IN DB** |
| `model_data_path` | ✅ TEXT | ✅ String? | OK |
| `accuracy_mae` | ❌ **MISSING** | ✅ Float? | **MISSING IN DB** |
| `accuracy_rmse` | ✅ DOUBLE PRECISION | ✅ Float? | OK |
| `accuracy_r2` | ❌ **MISSING** | ✅ Float? | **MISSING IN DB** |
| `metadata` | ❌ **MISSING** | ✅ Json? | **MISSING IN DB** |
| `created_at` | ❌ **MISSING** | ✅ DateTime | **MISSING IN DB** |
| `updated_at` | ❌ **MISSING** | ✅ DateTime | **MISSING IN DB** |

**Migration SQL (actual):**
```sql
CREATE TABLE "personal_models" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,          -- Should be "version"
    "training_meals_count" INTEGER NOT NULL,
    "last_trained_at" TIMESTAMP(3) NOT NULL, -- Should be "trained_at"
    "accuracy_rmse" DOUBLE PRECISION,
    "model_data_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "personal_models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personal_models_person_id_key" ON "personal_models"("person_id");
```

**Expected Schema (from Prisma):**
```sql
CREATE TABLE "personal_models" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "model_type" TEXT NOT NULL,              -- MISSING
    "version" TEXT NOT NULL,                 -- WRONG NAME
    "is_active" BOOLEAN NOT NULL DEFAULT false, -- MISSING
    "training_meals_count" INTEGER NOT NULL,
    "training_data_start" TIMESTAMP(3) NOT NULL, -- MISSING
    "training_data_end" TIMESTAMP(3) NOT NULL,   -- MISSING
    "trained_at" TIMESTAMP(3) NOT NULL,          -- WRONG NAME
    "last_used_at" TIMESTAMP(3),                 -- MISSING
    "model_data_path" TEXT,
    "accuracy_mae" DOUBLE PRECISION,             -- MISSING
    "accuracy_rmse" DOUBLE PRECISION,
    "accuracy_r2" DOUBLE PRECISION,              -- MISSING
    "metadata" JSONB,                            -- MISSING
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "personal_models_pkey" PRIMARY KEY ("id")
);

-- Unique constraint should be composite: (person_id, model_type, version)
CREATE UNIQUE INDEX "personal_models_person_id_model_type_version_key"
  ON "personal_models"("person_id", "model_type", "version");

-- Index for fast active model lookup
CREATE INDEX "personal_models_person_id_model_type_is_active_idx"
  ON "personal_models"("person_id", "model_type", "is_active");
```

**Impact:**
- 🔴 **TypeScript code expects fields that don't exist** (model-storage.ts, versioning.ts)
- 🔴 **Prisma queries will fail** when trying to filter by `modelType` or `isActive`
- 🔴 **Missing unique constraint** allows duplicate model versions per user
- 🔴 **Production deployment will fail** if migrations are applied

**Root Cause:**
The migration file `/db/migrations/20251010090000_add_metabolic_insights/migration.sql` was created manually or from an outdated schema version, and does NOT match the current Prisma schema.

---

### 1.2 AnalyticsEvent Table - Field Naming Mismatch

**Migration History:**

1. **Initial migration (20250911081240_init):**
   ```sql
   CREATE TABLE "AnalyticsEvent" (
       "id" TEXT NOT NULL,
       "userId" TEXT,           -- ❌ Contains PHI, should not exist
       "name" TEXT NOT NULL,    -- ❌ Should be "eventName"
       "meta" JSONB,            -- ❌ Should be "metadata"
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
   );
   ```

2. **Update migration (20250610000000_add_feature_flags_and_analytics):**
   ```sql
   -- Renamed table and added new fields
   ALTER TABLE "AnalyticsEvent" RENAME TO "analytics_events";
   ALTER TABLE "analytics_events"
     ADD COLUMN IF NOT EXISTS "eventType" TEXT,
     ADD COLUMN IF NOT EXISTS "eventName" TEXT,
     ADD COLUMN IF NOT EXISTS "metadata" JSONB,
     ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

   -- Migrate data
   UPDATE "analytics_events"
   SET "eventType" = 'legacy',
       "eventName" = "name",
       "metadata" = "meta"
   WHERE "eventType" IS NULL;

   -- Drop old columns
   ALTER TABLE "analytics_events"
     DROP COLUMN IF EXISTS "userId",
     DROP COLUMN IF EXISTS "name",
     DROP COLUMN IF EXISTS "meta";
   ```

**Current Prisma Schema:**
```prisma
model AnalyticsEvent {
  id        String   @id @default(uuid())
  eventType String
  eventName String
  metadata  Json?
  sessionId String?
  createdAt DateTime @default(now())

  @@index([eventType, eventName, createdAt])
  @@index([sessionId, createdAt])
  @@map("analytics_events")
}
```

**TypeScript Code Usage (event-tracking.ts):**
```typescript
await prisma.analyticsEvent.create({
  data: {
    eventType,      // ✅ Correct
    eventName,      // ✅ Correct
    metadata: metadata ? (metadata as any) : undefined, // ✅ Correct
    sessionId: sessionId ? hashSessionId(sessionId) : undefined, // ✅ Correct
  },
});
```

**Status:** ✅ **RESOLVED** - Migration properly renamed fields, Prisma schema matches database

**Concern:**
- Migration order dependency: If `20250610000000` runs AFTER `20251010090000`, the field names will be inconsistent
- Migration `20250610000000` has timestamp suggesting it should run BEFORE `20251010090000`, but the init migration should logically come first

---

### 1.3 ChatMessage Table - ID Type Inconsistency

**Migration (20250225120000_add_chat_message.sql):**
```sql
CREATE TABLE IF NOT EXISTS "ChatMessage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- ❌ UUID type
  "userId" text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  "documentId" uuid NULL REFERENCES "Document"(id) ON DELETE SET NULL, -- ❌ UUID
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
```

**Prisma Schema:**
```prisma
model ChatMessage {
  id         String   @id @default(uuid())  // ✅ TEXT (uuid stored as string)
  userId     String
  role       String
  content    String
  documentId String?                        // ✅ TEXT
  createdAt  DateTime @default(now())

  document Document? @relation(fields: [documentId], references: [id])

  @@index([userId, createdAt])
}
```

**Issue:**
- Migration uses PostgreSQL native `uuid` type
- Prisma schema uses `String` type with `@default(uuid())`
- `Document.id` is `TEXT` in schema, but `ChatMessage.documentId` references it as `uuid`

**Impact:**
- 🟡 **Type mismatch** between foreign key and referenced table
- 🟡 **JOIN queries may fail** if PostgreSQL strictly enforces type matching
- 🟡 **Prisma Client generation may use wrong types**

**Recommended Fix:**
```sql
-- Migration should use TEXT for consistency
ALTER TABLE "ChatMessage" ALTER COLUMN id TYPE TEXT;
ALTER TABLE "ChatMessage" ALTER COLUMN "documentId" TYPE TEXT;
```

---

### 1.4 Person.metadata Field - Missing Migration

**Prisma Schema:**
```prisma
model Person {
  // ...
  metadata   Json? // Extensible: { metabolic_onboarding_completed: true, ... }
  // ...
}
```

**Migration History:**
- **20250911081240_init/migration.sql:** Does NOT include `metadata` column
- **20250610000000_add_feature_flags_and_analytics/migration.sql:**
  ```sql
  ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
  ```

**Issue:**
- Migration file `20250610000000` has **earlier timestamp** than `20250911081240_init`
- This creates an ordering problem: if init runs first, `metadata` column will exist; if not, it's missing
- **Prisma expects metadata to exist**, but there's no guarantee based on migration order

**Impact:**
- 🟡 **Migration order dependency** could cause failures
- 🟡 **Fresh database installs** may have inconsistent schema depending on which migrations run

**Root Cause:**
Migration timestamps are out of order. The "init" migration should be the first one, but its timestamp (20250911) is AFTER the feature flags migration (20250610).

---

## 2. Schema Drift Patterns Identified

### 2.1 Field Naming Inconsistencies

**Pattern 1: Snake_case in DB vs camelCase in Prisma**

This is **EXPECTED** and handled by `@map()`:
```prisma
personId String @map("person_id")  // ✅ Correct pattern
```

**Pattern 2: Different field names between migration and schema**

| Migration Field | Prisma Field | Table | Status |
|----------------|--------------|-------|--------|
| `model_version` | `version` @map("model_version") | personal_models | ❌ Missing @map |
| `last_trained_at` | `trainedAt` @map("trained_at") | personal_models | ❌ Wrong DB name |
| `name` | `eventName` | analytics_events | ✅ Migrated correctly |
| `meta` | `metadata` | analytics_events | ✅ Migrated correctly |

---

### 2.2 Missing Migrations for Schema Changes

**Evidence:**
- `PersonalModel` Prisma model has 9 fields not in migration
- No migration file exists to add these fields
- TypeScript code (model-storage.ts, versioning.ts) uses these fields

**Missing Migrations Needed:**
1. Add `model_type` column to `personal_models`
2. Rename `model_version` to `version`
3. Add `is_active` column
4. Add `training_data_start`, `training_data_end`
5. Rename `last_trained_at` to `trained_at`
6. Add `last_used_at`
7. Add `accuracy_mae`, `accuracy_r2`
8. Add `metadata` JSONB column
9. Drop old unique constraint, add composite unique constraint
10. Add index on `(person_id, model_type, is_active)`

---

### 2.3 Unapplied Migrations

**Symptom:** `supabase db diff` fails with connection error:
```
failed to connect to postgres: tls error (server refused TLS connection)
```

**Possible Causes:**
1. Local Supabase not running
2. DATABASE_URL not configured for remote Supabase
3. Migrations not applied to remote database

**Evidence of drift:**
- Prisma schema is significantly ahead of migration files
- TypeScript code expects schema features that migrations don't create

---

## 3. Database-Related Anti-Patterns

### 3.1 Hardcoded Types Instead of Prisma-Generated Types

**Example:** `/apps/web/src/lib/ml/versioning.ts`
```typescript
// ❌ ANTI-PATTERN: Hardcoded return type
export async function listModelVersions(
  personId: string,
  modelType: string
): Promise<
  Array<{
    version: string;
    isActive: boolean;
    trainedAt: Date;
    performance: {
      mae: number | null;
      rmse: number | null;
      r2: number | null;
    };
    mealsCount: number;
  }>
> { /* ... */ }

// ✅ BETTER: Use Prisma-generated types
import { PersonalModel } from '@prisma/client';

export async function listModelVersions(
  personId: string,
  modelType: string
): Promise<
  Pick<PersonalModel, 'version' | 'isActive' | 'trainedAt' | 'accuracyMae' | 'accuracyRmse' | 'accuracyR2' | 'trainingMealsCount'>[]
> { /* ... */ }
```

**Impact:**
- 🟡 Type definitions drift from actual database schema
- 🟡 No compile-time validation when schema changes
- 🟡 Difficult to maintain type safety

---

### 3.2 Inconsistent Naming Conventions

**Observation:**
- Some tables use `PascalCase` (e.g., `ChatMessage`, `AnalyticsEvent` in old migrations)
- Others use `snake_case` (e.g., `analytics_events`, `food_entries`)
- Prisma schema uses `PascalCase` for models, `@@map()` for table names

**Best Practice:**
- All Prisma models should be `PascalCase`
- All database tables should be `snake_case`
- Use `@@map("snake_case_name")` consistently

**Current State:**
```prisma
// ✅ Good examples
model FoodEntry {
  // ...
  @@map("food_entries")
}

model AnalyticsEvent {
  // ...
  @@map("analytics_events")
}

// ❌ Bad examples (missing @map)
model Person {
  // ... table name is "Person" in DB, should be "persons" or use @map
}

model Document {
  // ... table name is "Document" in DB
}
```

---

### 3.3 Missing Indexes on Frequently Queried Columns

**Analysis of Indexes:**

| Table | Index | Status | Recommendation |
|-------|-------|--------|----------------|
| `personal_models` | `person_id` (unique) | ⚠️ Wrong constraint | Change to composite `(person_id, model_type, version)` |
| `personal_models` | `(person_id, model_type, is_active)` | ❌ Missing | **ADD** for active model lookups |
| `food_entries` | `(person_id, timestamp)` | ✅ Exists | OK |
| `glucose_readings` | `(person_id, timestamp)` | ✅ Exists | OK |
| `analytics_events` | `(eventType, eventName, createdAt)` | ✅ Exists | OK |
| `ChatMessage` | `(userId, createdAt)` | ✅ Exists | OK |
| `Observation` | `(personId, code, effectiveAt)` | ✅ Exists | OK |

---

### 3.4 Missing RLS Policies for New Tables

**RLS Policy Coverage Analysis:**

| Table | RLS Enabled | Policies Exist | Status |
|-------|-------------|----------------|--------|
| `food_entries` | ✅ | ✅ (4 policies) | OK |
| `food_photos` | ✅ | ✅ (4 policies) | OK |
| `food_ingredients` | ✅ | ✅ (4 policies) | OK |
| `glucose_readings` | ✅ | ✅ (4 policies) | OK |
| `glucose_predictions` | ✅ | ✅ (4 policies) | OK |
| `personal_models` | ✅ | ✅ (4 policies) | OK |
| `meal_templates` | ✅ | ✅ (4 policies) | OK |
| `metabolic_insights` | ✅ | ✅ (4 policies) | OK |
| `subscription_tiers` | ✅ | ✅ (4 policies) | OK |
| `ChatMessage` | ❌ | ❌ | **MISSING** |
| `AnalyticsEvent` | ❌ | ❌ | **MISSING** (but non-PHI, may not need RLS) |
| `FeatureFlag` | ❌ | ❌ | **MISSING** (admin-only, may not need RLS) |

**Security Risk:**
- 🔴 **ChatMessage has no RLS policies** - users could potentially read other users' chat history
- 🟡 **AnalyticsEvent has no RLS** - but should be non-PHI by design
- 🟢 **FeatureFlag has no RLS** - acceptable if admin-only

**Recommended Action:**
Create RLS policies for `ChatMessage`:
```sql
-- Enable RLS
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;

-- Users can only view their own chat messages
CREATE POLICY "Users can view own chat messages"
ON "ChatMessage" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person"."ownerId" = auth.uid()::text
    AND "ChatMessage"."userId" = "Person"."id"
  )
);

-- Similar INSERT, UPDATE, DELETE policies
```

---

## 4. Migration Workflow Review

### 4.1 Current Migration Process

**From package.json:**
```json
{
  "scripts": {
    "prisma:generate": "prisma generate --schema=db/schema.prisma",
    "prisma:migrate:dev": "prisma migrate dev --name init --schema=db/schema.prisma",
    "prisma:migrate:deploy": "prisma migrate deploy --schema=db/schema.prisma",
    "prisma:format": "prisma format --schema=db/schema.prisma"
  }
}
```

**Issues Identified:**
1. ❌ **`prisma:migrate:dev` hardcodes migration name to "init"**
   - Should be: `prisma migrate dev --schema=db/schema.prisma` (prompts for name)
   - Current script will always create migrations named "init"

2. ❌ **No validation step before applying migrations**
   - No script to preview migration SQL before running
   - No script to check for schema drift

3. ❌ **No rollback capability**
   - No documented rollback strategy
   - Migrations are not designed to be reversible

4. ❌ **Manual migrations mixed with Prisma migrations**
   - Some migrations appear to be handwritten SQL (ChatMessage, AnalyticsEvent updates)
   - These bypass Prisma's migration tracking

---

### 4.2 Migration Order Issues

**Migration Timeline (by filename timestamp):**

| Timestamp | Migration Name | Should Run |
|-----------|----------------|------------|
| 20250225120000 | add_chat_message | 2nd |
| 20250610000000 | add_feature_flags_and_analytics | 3rd |
| 20250911081240 | **init** | **1st** ❌ |
| 20250911160708 | add_source_anchor | 4th |
| 20251010090000 | add_metabolic_insights | 5th |
| 20251010090001 | add_metabolic_rls_policies | 6th |

**Problem:**
- The "init" migration has timestamp `20250911` but should be the FIRST migration
- Earlier migrations (ChatMessage, FeatureFlags) will fail because base tables don't exist
- This suggests migrations were created out of order or timestamps were manually set incorrectly

**Root Cause:**
- Project may have been reset/refactored, creating a new "init" migration while keeping old migrations
- Or migrations were backported from a different branch

---

### 4.3 Missing Migration Validation

**No validation process for:**
- ✅ Schema drift detection (Prisma Migrate has this built-in, but not used)
- ✅ Migration SQL preview before execution
- ✅ Database state verification after migration
- ✅ Data loss warnings (e.g., dropping columns)

**Recommended Additions:**
```json
{
  "scripts": {
    "db:diff": "prisma migrate diff --from-schema-datamodel db/schema.prisma --to-schema-datasource db/schema.prisma",
    "db:validate": "prisma validate --schema=db/schema.prisma",
    "db:status": "prisma migrate status --schema=db/schema.prisma",
    "db:preview": "prisma migrate dev --create-only --schema=db/schema.prisma"
  }
}
```

---

## 5. Environment Sync Strategies

### 5.1 Current Environment Setup

**Detected Environments:**
1. **Local Development** - Supabase local (not running based on error)
2. **Staging** - `wukrnqifpgjwbqxpockm.supabase.co`
3. **Production** - (assumed separate Supabase project)

**Configuration:**
- `.env` contains Supabase staging credentials
- No clear separation between dev/staging/prod DATABASE_URL
- All environments use same Prisma schema

---

### 5.2 Schema Drift Between Environments

**Evidence of drift:**
- Prisma schema is ahead of migrations
- TypeScript code uses fields that don't exist in migrations
- Migrations may not be applied to all environments

**Likely State of Environments:**

| Environment | Schema Source | Likely State |
|-------------|---------------|--------------|
| Local Dev | Prisma schema (db push) | ✅ Up-to-date with Prisma |
| Staging | Migrations | ❌ Missing PersonalModel fields |
| Production | Migrations | ❌ Missing PersonalModel fields |

**Hypothesis:**
- Developers used `prisma db push` locally to sync schema quickly
- This bypasses migrations entirely
- Migrations were NOT created for the PersonalModel changes
- Staging/prod are behind because they only run migrations

---

### 5.3 Recommended Environment Sync Process

**For Development:**
1. Make schema changes in `db/schema.prisma`
2. Run `prisma migrate dev` to create migration
3. Review generated SQL carefully
4. Test migration on local database
5. Commit both schema and migration files

**For Staging:**
1. Pull latest migrations from git
2. Run `prisma migrate deploy`
3. Validate with `prisma migrate status`
4. Run smoke tests to verify data integrity

**For Production:**
1. Ensure all migrations tested in staging
2. Create database backup
3. Run `prisma migrate deploy`
4. Validate with health checks
5. Have rollback plan ready

**NEVER:**
- ❌ Use `prisma db push` in staging/production
- ❌ Create migrations manually without Prisma
- ❌ Skip migrations and edit database directly
- ❌ Mix Prisma migrations with manual SQL changes

---

## 6. Recommendations for Preventing Future Drift

### 6.1 Immediate Action Items (CRITICAL)

1. **Fix PersonalModel Migration**
   - Create new migration to add missing fields
   - Update unique constraint to composite key
   - Add missing indexes
   - Test on local database first

2. **Fix Migration Order**
   - Rename `20250911081240_init` to `20250101000000_init` to ensure it runs first
   - OR consolidate all migrations into a single new init migration
   - Apply fix to all environments

3. **Add RLS Policies for ChatMessage**
   - Create policies for SELECT, INSERT, UPDATE, DELETE
   - Test with authenticated users
   - Deploy to all environments

4. **Fix ChatMessage Type Mismatch**
   - Alter `id` and `documentId` columns to TEXT
   - Update foreign key constraint
   - Test JOINs with Document table

---

### 6.2 Process Improvements

**1. Migration Workflow Enforcement**
```bash
# Add pre-commit hook to validate schema
#!/bin/bash
npm run prisma:validate
npm run prisma:format

# Check for drift
npm run prisma:migrate:status
if [ $? -ne 0 ]; then
  echo "⚠️  Schema drift detected. Run 'npm run prisma:migrate:dev' to create migration."
  exit 1
fi
```

**2. CI/CD Checks**
- Add `prisma migrate status` to CI pipeline
- Fail build if schema drift detected
- Require migration review before PR merge

**3. Documentation Updates**
Update `CLAUDE.md` with:
```markdown
## Database Migration Rules

1. ALWAYS use Prisma Migrate for schema changes
2. NEVER manually edit migration files
3. NEVER use `db push` outside of local prototyping
4. ALWAYS review migration SQL before committing
5. ALWAYS test migrations on copy of production data
6. ALWAYS create rollback plan for destructive changes
```

**4. Type Safety Enforcement**
```typescript
// Create types package that exports only Prisma-generated types
// packages/types/src/database.ts
export * from '@prisma/client';

// Enforce usage in apps
import type { PersonalModel } from '@evermed/types';
```

---

### 6.3 Migration Validation Checklist

**Before Creating Migration:**
- [ ] Schema changes documented in PR description
- [ ] Breaking changes identified
- [ ] Data migration strategy defined (if needed)
- [ ] Rollback strategy documented

**After Creating Migration:**
- [ ] Review generated SQL line-by-line
- [ ] Verify no data loss (check DROP/ALTER statements)
- [ ] Test migration on local database
- [ ] Test rollback (if possible)
- [ ] Run full test suite

**Before Deploying:**
- [ ] Create database backup
- [ ] Run migration on staging first
- [ ] Validate data integrity post-migration
- [ ] Run smoke tests
- [ ] Monitor for errors in logs

---

### 6.4 Supabase-Specific Recommendations

**Use Supabase CLI for Deployment:**
```bash
# Instead of just Prisma migrate
supabase db diff --file new_migration

# Review the diff
supabase db push

# Or use Prisma migrate deploy
prisma migrate deploy
```

**Sync RLS Policies with Migrations:**
- Store RLS policies in version control (e.g., `db/policies/`)
- Apply policies after migrations
- Use Supabase CLI to sync policies across environments

**Monitor Schema Drift:**
```bash
# Check local vs remote
supabase db diff

# Pull remote schema (useful for debugging drift)
supabase db pull
```

---

## 7. Comprehensive Schema Drift Report

### 7.1 Tables Affected by Drift

| Table | Drift Type | Severity | Status |
|-------|-----------|----------|--------|
| `personal_models` | Missing fields, wrong field names | 🔴 CRITICAL | Needs migration |
| `analytics_events` | Field rename completed | 🟢 RESOLVED | Migration exists |
| `ChatMessage` | Type mismatch (uuid vs TEXT) | 🟡 HIGH | Needs fix |
| `Person` | Migration order issue (metadata) | 🟡 MEDIUM | Needs reordering |

---

### 7.2 Missing Migrations Summary

**Total Missing Migrations:** 1 major migration needed for PersonalModel

**Required Migration SQL:**
```sql
-- Migration: fix_personal_models_schema
-- Date: 2025-10-10

-- 1. Add missing columns
ALTER TABLE "personal_models"
  ADD COLUMN IF NOT EXISTS "model_type" TEXT,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "training_data_start" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "training_data_end" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_used_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "accuracy_mae" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "accuracy_r2" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 2. Rename columns
ALTER TABLE "personal_models"
  RENAME COLUMN "model_version" TO "version";
ALTER TABLE "personal_models"
  RENAME COLUMN "last_trained_at" TO "trained_at";

-- 3. Update NOT NULL constraints (after backfilling data)
-- ALTER TABLE "personal_models" ALTER COLUMN "model_type" SET NOT NULL;
-- ALTER TABLE "personal_models" ALTER COLUMN "is_active" SET NOT NULL;
-- ALTER TABLE "personal_models" ALTER COLUMN "training_data_start" SET NOT NULL;
-- ALTER TABLE "personal_models" ALTER COLUMN "training_data_end" SET NOT NULL;
-- ALTER TABLE "personal_models" ALTER COLUMN "trained_at" SET NOT NULL;

-- 4. Drop old unique constraint
DROP INDEX IF EXISTS "personal_models_person_id_key";

-- 5. Add composite unique constraint
CREATE UNIQUE INDEX "personal_models_person_id_model_type_version_key"
  ON "personal_models"("person_id", "model_type", "version");

-- 6. Add performance index
CREATE INDEX "personal_models_person_id_model_type_is_active_idx"
  ON "personal_models"("person_id", "model_type", "is_active");
```

**WARNING:** This migration requires data backfill:
1. Set `model_type` to 'glucose-prediction' for existing rows
2. Set `is_active` to true for the most recent model per user
3. Copy `training_data_start` and `training_data_end` from metadata if available

---

### 7.3 Type Safety Validation

**Files Using PersonalModel Type:**
- `/apps/web/src/lib/ml/model-storage.ts`
- `/apps/web/src/lib/ml/versioning.ts`
- `/apps/web/src/lib/ml/training.ts` (likely)
- `/apps/web/src/lib/ml/retraining.ts` (likely)

**Current Risk:**
- ✅ Prisma Client generation succeeds (uses Prisma schema, not DB)
- ❌ Runtime queries will fail when accessing missing fields
- ❌ Database operations will fail (INSERT/UPDATE with missing columns)

**Test Coverage:**
```bash
# Run these to detect schema drift issues
npm run typecheck   # Should pass (uses Prisma types)
npm run test        # May fail if tests hit database
npm run build       # Should pass (compiles, doesn't query DB)
```

---

## 8. Deployment Readiness Assessment

### 8.1 Current State: NOT READY FOR PRODUCTION

**Blocking Issues:**
- 🔴 PersonalModel schema drift will cause runtime failures
- 🔴 Missing RLS policies on ChatMessage (security risk)
- 🟡 Migration order issues may cause fresh installs to fail
- 🟡 ChatMessage type mismatch may cause JOIN failures

**Risk Level:** **HIGH**

---

### 8.2 Deployment Checklist

**Before ANY deployment:**
- [ ] Fix PersonalModel migration (create and test locally)
- [ ] Add ChatMessage RLS policies
- [ ] Fix ChatMessage type mismatch
- [ ] Verify migration order (init should be first)
- [ ] Run `prisma migrate status` on target environment
- [ ] Create database backup
- [ ] Prepare rollback plan
- [ ] Test migrations on staging first

**Post-deployment validation:**
- [ ] Run `prisma migrate status` to confirm all migrations applied
- [ ] Run smoke tests on all critical flows
- [ ] Check database logs for errors
- [ ] Verify RLS policies are active
- [ ] Test CRUD operations on all new tables

---

## 9. Conclusion

The EverMed database schema exhibits **critical drift** between Prisma schema definitions, migration files, and actual database state. The most severe issue is the `PersonalModel` table, which is missing 9+ fields that TypeScript code expects.

**Primary Root Causes:**
1. Migrations created out of order or with incorrect timestamps
2. Schema changes made in Prisma without corresponding migrations
3. Possible use of `prisma db push` in development, bypassing migration creation
4. Manual SQL migrations mixed with Prisma-generated migrations
5. Lack of schema drift validation in CI/CD pipeline

**Immediate Next Steps:**
1. **DO NOT DEPLOY** to production until drift is resolved
2. Create comprehensive migration to fix PersonalModel
3. Add RLS policies for ChatMessage
4. Reorder migrations or consolidate into new init
5. Test all migrations thoroughly on local/staging
6. Implement migration validation in CI/CD

**Long-term Prevention:**
- Enforce Prisma Migrate workflow (no manual migrations)
- Add pre-commit hooks for schema validation
- Document migration best practices in CLAUDE.md
- Use Supabase CLI for schema synchronization
- Implement automated drift detection

---

**Document End**

For questions or assistance with implementing these recommendations, consult the **database-architect** subagent.
