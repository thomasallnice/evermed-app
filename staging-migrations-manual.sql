-- =====================================================================
-- METABOLIC INSIGHTS: MANUAL STAGING MIGRATION
-- =====================================================================
-- Run this entire file in Supabase Dashboard SQL Editor
-- Project: jwarorrwgpqrksrxmesx (Staging)
-- URL: https://supabase.com/dashboard/project/jwarorrwgpqrksrxmesx/editor
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Go to SQL Editor in Supabase Dashboard
-- 3. Paste and click "Run"
-- 4. Verify no errors (should see "Success. No rows returned")
-- =====================================================================

-- =====================================================================
-- MIGRATION 1: Add Metabolic Insights Tables
-- File: db/migrations/20251010090000_add_metabolic_insights/migration.sql
-- =====================================================================

-- CreateEnum (with idempotent checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MealType') THEN
        CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnalysisStatus') THEN
        CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'completed', 'failed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IngredientSource') THEN
        CREATE TYPE "IngredientSource" AS ENUM ('ai_detected', 'manual_entry', 'nutrition_api');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GlucoseSource') THEN
        CREATE TYPE "GlucoseSource" AS ENUM ('cgm', 'fingerstick', 'lab', 'interpolated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InsightType') THEN
        CREATE TYPE "InsightType" AS ENUM ('daily_summary', 'weekly_report', 'pattern_detected');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TierLevel') THEN
        CREATE TYPE "TierLevel" AS ENUM ('free', 'premium', 'family');
    END IF;
END $$;

-- AlterTable Person - Add metabolic preferences
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "cgm_connected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "target_glucose_min" DOUBLE PRECISION;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "target_glucose_max" DOUBLE PRECISION;

-- CreateTable food_entries
CREATE TABLE IF NOT EXISTS "food_entries" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "notes" TEXT,
    "predicted_glucose_peak" DOUBLE PRECISION,
    "actual_glucose_peak" DOUBLE PRECISION,
    "total_calories" DOUBLE PRECISION NOT NULL,
    "total_carbs_g" DOUBLE PRECISION NOT NULL,
    "total_protein_g" DOUBLE PRECISION NOT NULL,
    "total_fat_g" DOUBLE PRECISION NOT NULL,
    "total_fiber_g" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable food_photos
CREATE TABLE IF NOT EXISTS "food_photos" (
    "id" TEXT NOT NULL,
    "food_entry_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "original_size_bytes" INTEGER NOT NULL,
    "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "analysis_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable food_ingredients
CREATE TABLE IF NOT EXISTS "food_ingredients" (
    "id" TEXT NOT NULL,
    "food_entry_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION NOT NULL,
    "source" "IngredientSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable glucose_readings
CREATE TABLE IF NOT EXISTS "glucose_readings" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "GlucoseSource" NOT NULL,
    "device_id" TEXT,
    "food_entry_id" TEXT,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glucose_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable glucose_predictions
CREATE TABLE IF NOT EXISTS "glucose_predictions" (
    "id" TEXT NOT NULL,
    "food_entry_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "predicted_peak_value" DOUBLE PRECISION NOT NULL,
    "predicted_peak_time_minutes" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glucose_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable personal_models
CREATE TABLE IF NOT EXISTS "personal_models" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "training_meals_count" INTEGER NOT NULL,
    "last_trained_at" TIMESTAMP(3) NOT NULL,
    "accuracy_rmse" DOUBLE PRECISION,
    "model_data_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable meal_templates
CREATE TABLE IF NOT EXISTS "meal_templates" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "nutrition_totals" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable metabolic_insights
CREATE TABLE IF NOT EXISTS "metabolic_insights" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "insight_type" "InsightType" NOT NULL,
    "insight_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metabolic_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable subscription_tiers
CREATE TABLE IF NOT EXISTS "subscription_tiers" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "tier" "TierLevel" NOT NULL,
    "meals_limit_per_week" INTEGER NOT NULL,
    "meals_used_this_week" INTEGER NOT NULL DEFAULT 0,
    "week_start_date" DATE NOT NULL,
    "stripe_subscription_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "food_entries_person_id_timestamp_idx" ON "food_entries"("person_id", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "glucose_readings_person_id_timestamp_idx" ON "glucose_readings"("person_id", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "metabolic_insights_person_id_date_idx" ON "metabolic_insights"("person_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "personal_models_person_id_key" ON "personal_models"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_tiers_person_id_key" ON "subscription_tiers"("person_id");

-- AddForeignKey (with IF NOT EXISTS check via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'food_entries_person_id_fkey'
    ) THEN
        ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'food_photos_food_entry_id_fkey'
    ) THEN
        ALTER TABLE "food_photos" ADD CONSTRAINT "food_photos_food_entry_id_fkey"
        FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'food_ingredients_food_entry_id_fkey'
    ) THEN
        ALTER TABLE "food_ingredients" ADD CONSTRAINT "food_ingredients_food_entry_id_fkey"
        FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'glucose_readings_person_id_fkey'
    ) THEN
        ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'glucose_readings_food_entry_id_fkey'
    ) THEN
        ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_food_entry_id_fkey"
        FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'glucose_predictions_food_entry_id_fkey'
    ) THEN
        ALTER TABLE "glucose_predictions" ADD CONSTRAINT "glucose_predictions_food_entry_id_fkey"
        FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'glucose_predictions_person_id_fkey'
    ) THEN
        ALTER TABLE "glucose_predictions" ADD CONSTRAINT "glucose_predictions_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'personal_models_person_id_fkey'
    ) THEN
        ALTER TABLE "personal_models" ADD CONSTRAINT "personal_models_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'meal_templates_person_id_fkey'
    ) THEN
        ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'metabolic_insights_person_id_fkey'
    ) THEN
        ALTER TABLE "metabolic_insights" ADD CONSTRAINT "metabolic_insights_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscription_tiers_person_id_fkey'
    ) THEN
        ALTER TABLE "subscription_tiers" ADD CONSTRAINT "subscription_tiers_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- =====================================================================
-- MIGRATION 2: Add Feature Flags and Analytics
-- File: db/migrations/20250610000000_add_feature_flags_and_analytics/migration.sql
-- =====================================================================

-- 1. Add metadata field to Person table
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 2. Rename AnalyticsEvent table if it exists, otherwise create it
DO $$
BEGIN
    -- Check if old AnalyticsEvent table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AnalyticsEvent') THEN
        -- Rename to analytics_events
        ALTER TABLE "AnalyticsEvent" RENAME TO "analytics_events";

        -- Add new columns
        ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "eventType" TEXT;
        ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "eventName" TEXT;
        ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
        ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

        -- Migrate data
        UPDATE "analytics_events"
        SET "eventType" = 'legacy',
            "eventName" = COALESCE("name", 'unknown'),
            "metadata" = "meta"
        WHERE "eventType" IS NULL;

        -- Make columns NOT NULL
        ALTER TABLE "analytics_events" ALTER COLUMN "eventType" SET NOT NULL;
        ALTER TABLE "analytics_events" ALTER COLUMN "eventName" SET NOT NULL;

        -- Drop old columns
        ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "userId";
        ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "name";
        ALTER TABLE "analytics_events" DROP COLUMN IF EXISTS "meta";
    ELSE
        -- Create new analytics_events table
        CREATE TABLE IF NOT EXISTS "analytics_events" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            "eventType" TEXT NOT NULL,
            "eventName" TEXT NOT NULL,
            "metadata" JSONB,
            "sessionId" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "analytics_events_eventType_eventName_createdAt_idx"
  ON "analytics_events"("eventType", "eventName", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_sessionId_createdAt_idx"
  ON "analytics_events"("sessionId", "createdAt");

-- 3. Create FeatureFlag table
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT UNIQUE NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS "feature_flags_name_enabled_idx"
  ON "feature_flags"("name", "enabled");

-- Insert default feature flag
INSERT INTO "feature_flags" ("id", "name", "enabled", "rolloutPercent", "description")
VALUES
  (gen_random_uuid()::text, 'metabolic_insights_enabled', true, 100, 'Enable Metabolic Insights feature for beta users')
ON CONFLICT ("name") DO NOTHING;

-- Add trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON "feature_flags";
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON "feature_flags"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE "analytics_events" IS 'Non-PHI analytics only. No user identifiers, no medical data.';
COMMENT ON TABLE "feature_flags" IS 'Feature flags for gradual rollout. Admin-only table, no RLS needed.';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Note: RLS policies will be added in the next step via Supabase Dashboard UI
-- or via a separate RLS migration file
-- =====================================================================
