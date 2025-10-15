# Metabolic Insights Migration Summary

**Date**: October 10, 2025
**Migration Names**:
- `20251010090000_add_metabolic_insights` (Schema)
- `20251010090001_add_metabolic_rls_policies` (Security)

**Status**: ✅ SUCCESSFULLY APPLIED AND VERIFIED

---

## Overview

This migration implements the **Sprint 1 - Foundation** for the Metabolic Insights premium feature, adding comprehensive database support for food logging, glucose tracking, ML predictions, and personalized metabolic insights.

---

## Schema Changes

### 1. New Enums (6 total)

| Enum | Values | Purpose |
|------|--------|---------|
| `MealType` | `breakfast`, `lunch`, `dinner`, `snack` | Categorizes meals for pattern analysis |
| `AnalysisStatus` | `pending`, `completed`, `failed` | Tracks food photo AI analysis state |
| `IngredientSource` | `ai_detected`, `manual_entry`, `nutrition_api` | Tracks ingredient data provenance |
| `GlucoseSource` | `cgm`, `fingerstick`, `lab`, `interpolated` | Distinguishes glucose reading sources |
| `InsightType` | `daily_summary`, `weekly_report`, `pattern_detected` | Categorizes generated insights |
| `TierLevel` | `free`, `premium`, `family` | Subscription tier levels |

### 2. Person Table Extensions

Added 3 new columns to support CGM integration and target ranges:

```sql
ALTER TABLE "Person" ADD COLUMN "cgm_connected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Person" ADD COLUMN "target_glucose_min" DOUBLE PRECISION;
ALTER TABLE "Person" ADD COLUMN "target_glucose_max" DOUBLE PRECISION;
```

### 3. New Tables (9 total)

#### Core Logging Tables

1. **`food_entries`** - Central meal logging table
   - Stores meal metadata, timing, nutrition totals
   - Tracks predicted vs actual glucose peaks
   - Links to photos, ingredients, glucose readings, predictions
   - **Indexes**: `(person_id, timestamp)`

2. **`food_photos`** - Food images for AI analysis
   - Stores Supabase Storage paths (photos + thumbnails)
   - Tracks AI analysis status (pending/completed/failed)
   - **Foreign Key**: `food_entry_id → food_entries(id) CASCADE`

3. **`food_ingredients`** - Detailed nutrition breakdown
   - Name, quantity, unit, macros (carbs, protein, fat, fiber)
   - Tracks confidence score and source (AI/manual/API)
   - **Foreign Key**: `food_entry_id → food_entries(id) CASCADE`

#### Glucose Tracking

4. **`glucose_readings`** - Time-series glucose data
   - Supports CGM, fingerstick, lab, interpolated sources
   - Optional link to `food_entry_id` for meal correlation
   - Device tracking via `device_id`
   - **Indexes**: `(person_id, timestamp)`
   - **Foreign Keys**:
     - `person_id → Person(id) CASCADE`
     - `food_entry_id → food_entries(id) SET NULL`

#### ML & Predictions

5. **`glucose_predictions`** - AI-generated glucose forecasts
   - Predicted peak value and timing (minutes after meal)
   - Confidence score and model version tracking
   - **Foreign Keys**:
     - `food_entry_id → food_entries(id) CASCADE`
     - `person_id → Person(id) CASCADE`

6. **`personal_models`** - Per-user ML model metadata (one-to-one)
   - Tracks training data count, accuracy (RMSE)
   - Model version and last training timestamp
   - Storage path for model artifacts (Supabase Storage)
   - **Unique Constraint**: `person_id` (one model per person)
   - **Foreign Key**: `person_id → Person(id) CASCADE`

#### User Experience

7. **`meal_templates`** - Reusable meal recipes
   - JSON-stored ingredients and nutrition totals
   - Usage count for popularity ranking
   - **Foreign Key**: `person_id → Person(id) CASCADE`

8. **`metabolic_insights`** - Generated health insights
   - Daily summaries, weekly reports, pattern detection
   - JSON-stored insight data (flexible schema)
   - **Indexes**: `(person_id, date)`
   - **Foreign Key**: `person_id → Person(id) CASCADE`

9. **`subscription_tiers`** - Usage limits & billing (one-to-one)
   - Tier level (free/premium/family)
   - Weekly meal logging limits and usage tracking
   - Stripe integration via `stripe_subscription_id`
   - **Unique Constraint**: `person_id` (one subscription per person)
   - **Foreign Key**: `person_id → Person(id) CASCADE`

---

## Security (RLS Policies)

**Total Policies**: 36 (9 tables × 4 operations)

### Policy Pattern

All tables follow the same security model:
- **SELECT**: Users can view only their own data
- **INSERT**: Users can insert only to their own records
- **UPDATE**: Users can update only their own records
- **DELETE**: Users can delete only their own records

### Enforcement Mechanism

All policies enforce ownership via `Person.ownerId = auth.uid()`:

```sql
-- Example: food_entries SELECT policy
CREATE POLICY "Users can view own food entries"
ON food_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = food_entries.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);
```

### Nested Ownership

For child tables (e.g., `food_photos`, `food_ingredients`), policies traverse the relationship:

```sql
-- Example: food_photos SELECT policy
CREATE POLICY "Users can view own food photos"
ON food_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_photos.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);
```

---

## Indexes & Performance

### Composite Indexes

1. **`food_entries_person_id_timestamp_idx`**
   Optimizes timeline queries (e.g., "show last 7 days of meals")

2. **`glucose_readings_person_id_timestamp_idx`**
   Optimizes glucose charts and time-range queries

3. **`metabolic_insights_person_id_date_idx`**
   Optimizes daily/weekly insight retrieval

### Unique Indexes (Constraints)

1. **`personal_models_person_id_key`**
   Enforces one-to-one relationship (one model per person)

2. **`subscription_tiers_person_id_key`**
   Enforces one-to-one relationship (one subscription per person)

---

## Foreign Key Relationships

**Total Foreign Keys**: 11

### Cascade Behavior

| Parent | Child | On Delete | Rationale |
|--------|-------|-----------|-----------|
| `Person` | `food_entries` | CASCADE | Delete all meals when user deletes account |
| `food_entries` | `food_photos` | CASCADE | Delete photos when meal is deleted |
| `food_entries` | `food_ingredients` | CASCADE | Delete ingredients when meal is deleted |
| `food_entries` | `glucose_predictions` | CASCADE | Delete predictions when meal is deleted |
| `food_entries` | `glucose_readings` | SET NULL | Keep glucose data, unlink from meal |
| `Person` | `glucose_readings` | CASCADE | Delete all glucose data on account deletion |
| `Person` | `glucose_predictions` | CASCADE | Delete predictions on account deletion |
| `Person` | `personal_models` | CASCADE | Delete ML model on account deletion |
| `Person` | `meal_templates` | CASCADE | Delete templates on account deletion |
| `Person` | `metabolic_insights` | CASCADE | Delete insights on account deletion |
| `Person` | `subscription_tiers` | CASCADE | Delete subscription on account deletion |

---

## Verification Results

### Automated Test Suite

**All tests passed** ✅

Tested:
1. ✅ Person table extensions (CGM fields)
2. ✅ FoodEntry creation
3. ✅ FoodPhoto creation with foreign key
4. ✅ FoodIngredient creation with foreign key
5. ✅ GlucoseReading creation (with optional food_entry_id)
6. ✅ GlucosePrediction creation (dual foreign keys)
7. ✅ PersonalModel creation (one-to-one constraint)
8. ✅ MealTemplate creation (JSON fields)
9. ✅ MetabolicInsight creation (JSON fields, date type)
10. ✅ SubscriptionTier creation (one-to-one constraint)
11. ✅ Cascade delete (FoodEntry → FoodPhoto, FoodIngredient)

### Database Status

```bash
npx prisma migrate status --schema=db/schema.prisma
```

**Output**:
```
4 migrations found in prisma/migrations
Database schema is up to date!
```

### Prisma Client Generation

```bash
npx prisma generate --schema=db/schema.prisma
```

**Status**: ✅ Successfully generated Prisma Client v5.22.0

---

## Next Steps

### Immediate (Sprint 1 - Foundation)

- [ ] **Storage Buckets** - Create `food-photos` bucket in Supabase with RLS
- [ ] **API Endpoints** - Implement `/api/meals` CRUD operations
- [ ] **UI Components** - Build meal logging forms (NextJS + Tailwind)

### Sprint 2 - AI Intelligence

- [ ] **Google Cloud Vision Integration** - Food photo analysis
- [ ] **Nutritionix API Integration** - Nutrition data enrichment
- [ ] **ML Pipeline** - Glucose prediction model training
- [ ] **Insights Generation** - Daily summaries, pattern detection

### Sprint 3 - CGM Integration

- [ ] **Dexcom API** - OAuth + data sync
- [ ] **FreeStyle Libre API** - OAuth + data sync
- [ ] **Real-time Sync** - Background job for CGM data import

### Sprint 4 - Premium Features

- [ ] **Stripe Integration** - Subscription billing
- [ ] **Usage Limits** - Enforce `meals_limit_per_week`
- [ ] **PDF Reports** - Export metabolic insights
- [ ] **Sharing** - Extend SharePack to include metabolic data

---

## Rollback Instructions

If issues arise, rollback is possible via Prisma:

```bash
# Rollback both migrations
npx prisma migrate resolve --rolled-back 20251010090001_add_metabolic_rls_policies --schema=db/schema.prisma
npx prisma migrate resolve --rolled-back 20251010090000_add_metabolic_insights --schema=db/schema.prisma

# Or use Supabase CLI for more control
supabase db reset
```

**WARNING**: Rollback will delete all data in the 9 new tables. Ensure backups exist before rolling back in production.

---

## Production Deployment Checklist

Before deploying to staging/production:

- [ ] **Supabase Project**: Ensure `vector` extension is enabled
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

- [ ] **Environment Variables**: Set in Vercel/hosting platform
  - `DATABASE_URL` (Supabase connection string)
  - `OPENAI_API_KEY` (for embeddings)
  - `GOOGLE_CLOUD_VISION_API_KEY` (Sprint 2)
  - `NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY` (Sprint 2)

- [ ] **Supabase Storage**: Create `food-photos` bucket with RLS
  ```sql
  -- Run via Supabase dashboard or CLI
  INSERT INTO storage.buckets (id, name, public) VALUES ('food-photos', 'food-photos', false);
  ```

- [ ] **Apply Migrations**:
  ```bash
  npm run prisma:migrate:deploy
  ```

- [ ] **Validate RLS**: Test with non-admin user accounts

- [ ] **Monitor Performance**: Add indexes if query performance degrades

---

## Migration File Locations

- **Schema Migration**: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/20251010090000_add_metabolic_insights/migration.sql`
- **RLS Policies**: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/migrations/20251010090001_add_metabolic_rls_policies/migration.sql`
- **Prisma Schema**: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma`

---

## Medical Compliance Notes

**Non-SaMD Classification**: This feature is designed for **personal wellness tracking only**, NOT for diagnosis, treatment, or medical decision-making.

**Required Disclaimers** (to be implemented in UI):
- "This tool provides estimates based on your personal data and should not replace professional medical advice."
- "Always consult your healthcare provider before making changes to your diet or diabetes management plan."
- "Glucose predictions are for informational purposes only and may not reflect actual blood glucose levels."

**Refusal Templates** (from `apps/web/src/lib/copy.ts`):
- Never provide dosing recommendations
- Never provide diagnosis
- Never provide emergency triage

**Data Privacy**:
- All data is user-scoped via RLS
- No cross-user data access (even for admins)
- AnalyticsEvent must be non-PHI (no identifiable data)

---

## Contact

For questions or issues related to this migration:
- **Developer**: Claude Code (Database Architect Agent)
- **Project**: EverMed Metabolic Insights (Sprint 1)
- **Date**: October 10, 2025
