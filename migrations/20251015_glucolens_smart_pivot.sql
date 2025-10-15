-- =============================================================================
-- GlucoLens Smart Pivot Migration
-- =============================================================================
-- Strategy: Delete health vault features only, keep metabolic insights intact
-- Created: 2025-10-15
-- Author: Claude Code (Smart Simplification Plan)
--
-- IMPORTANT: This migration PRESERVES all metabolic insights tables
-- Only deletes: Document vault, SharePacks, Chat, OCR-related tables
-- =============================================================================

BEGIN;

-- =============================================================================
-- BACKUP VERIFICATION
-- =============================================================================
-- STOP: Before running this migration, verify you have a database backup!
-- Run: pg_dump $DATABASE_URL > backup_before_glucolens_pivot_$(date +%Y%m%d_%H%M%S).sql

-- =============================================================================
-- STEP 1: Drop Health Vault Features (Document Management)
-- =============================================================================
-- These tables are related to the OLD "health document vault" product
-- GlucoLens does NOT need document storage, OCR, or medical record parsing

-- Drop dependent tables first (foreign key constraints)
DROP TABLE IF EXISTS doc_chunks CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS share_events CASCADE;
DROP TABLE IF EXISTS share_pack_items CASCADE;
DROP TABLE IF EXISTS share_packs CASCADE;
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Drop related analytics (document-specific token usage)
-- NOTE: Keeping TokenUsage table itself, just cleaning old document-related entries
DELETE FROM token_usage WHERE feature IN ('ocr', 'index', 'explain', 'ask');

COMMENT ON TABLE token_usage IS 'Non-PHI token usage tracking (metabolic features only after pivot)';

-- =============================================================================
-- STEP 2: Clean Person Table (Remove Document-Related Fields)
-- =============================================================================
-- The Person table has some fields that were used for general health vault
-- GlucoLens focuses on glucose tracking, so we keep metabolic preferences only

-- Remove obsolete metadata patterns
-- Keep: metabolic_onboarding_completed, glucose_targets, cgm_preferences
-- Remove: document_upload_count, ocr_credits, etc. (if any exist in metadata JSON)

-- No structural changes needed - metadata field is flexible JSON
-- Application layer will simply ignore non-metabolic keys

COMMENT ON TABLE "Person" IS 'User profiles for GlucoLens (glucose tracking app)';
COMMENT ON COLUMN "Person"."cgm_connected" IS 'Whether user has connected a CGM device (Dexcom, Libre)';
COMMENT ON COLUMN "Person"."target_glucose_min" IS 'Target glucose range minimum (mg/dL)';
COMMENT ON COLUMN "Person"."target_glucose_max" IS 'Target glucose range maximum (mg/dL)';

-- =============================================================================
-- STEP 3: Verify Metabolic Tables Intact
-- =============================================================================
-- These tables are CRITICAL for GlucoLens and must NOT be dropped:

-- Food Tracking (4 tables)
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'food_entries') = 1,
         'CRITICAL: food_entries table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'food_photos') = 1,
         'CRITICAL: food_photos table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'food_ingredients') = 1,
         'CRITICAL: food_ingredients table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'meal_templates') = 1,
         'CRITICAL: meal_templates table missing!';

  -- Glucose & Predictions (3 tables)
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'glucose_readings') = 1,
         'CRITICAL: glucose_readings table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'glucose_predictions') = 1,
         'CRITICAL: glucose_predictions table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'personal_models') = 1,
         'CRITICAL: personal_models table missing!';

  -- Analytics & Admin (4 tables)
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'metabolic_insights') = 1,
         'CRITICAL: metabolic_insights table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'subscription_tiers') = 1,
         'CRITICAL: subscription_tiers table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'feature_flags') = 1,
         'CRITICAL: feature_flags table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'analytics_events') = 1,
         'CRITICAL: analytics_events table missing!';

  -- Core (2 tables)
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Person') = 1,
         'CRITICAL: Person table missing!';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'admin_users') = 1,
         'CRITICAL: admin_users table missing!';

  RAISE NOTICE '✅ All 13 GlucoLens core tables verified intact';
END $$;

-- =============================================================================
-- STEP 4: Update Feature Flags for GlucoLens Launch
-- =============================================================================
-- Set up feature flags for gradual rollout

INSERT INTO feature_flags (name, enabled, rollout_percent, description)
VALUES
  ('glucolens_public_beta', true, 10, 'Enable GlucoLens for 10% of users (beta cohort)')
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  rollout_percent = EXCLUDED.rollout_percent,
  description = EXCLUDED.description;

INSERT INTO feature_flags (name, enabled, rollout_percent, description)
VALUES
  ('apple_health_sync', false, 0, 'Apple Health two-way sync (HealthKit integration)')
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  rollout_percent = EXCLUDED.rollout_percent,
  description = EXCLUDED.description;

INSERT INTO feature_flags (name, enabled, rollout_percent, description)
VALUES
  ('lstm_predictions', false, 0, 'Use LSTM model for glucose predictions (vs baseline)')
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  rollout_percent = EXCLUDED.rollout_percent,
  description = EXCLUDED.description;

-- =============================================================================
-- STEP 5: Add Pivot Metadata to Person Table
-- =============================================================================
-- Track which users are part of the GlucoLens pivot

-- Add pivot date to existing users
UPDATE "Person"
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'pivoted_to_glucolens_at', NOW(),
  'original_product', 'evermed_health_vault'
)
WHERE metadata IS NULL OR NOT (metadata ? 'pivoted_to_glucolens_at');

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these after migration to confirm success

-- Check that health vault tables are gone
DO $$
DECLARE
  remaining_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(table_name)
  INTO remaining_tables
  FROM information_schema.tables
  WHERE table_name IN ('documents', 'doc_chunks', 'observations', 'share_packs', 'share_pack_items', 'share_events', 'chat_messages');

  IF remaining_tables IS NOT NULL THEN
    RAISE EXCEPTION '❌ Health vault tables still exist: %', remaining_tables;
  ELSE
    RAISE NOTICE '✅ All health vault tables successfully dropped';
  END IF;
END $$;

-- Check that metabolic tables have data (not accidentally dropped)
DO $$
DECLARE
  food_entries_count INT;
  glucose_readings_count INT;
BEGIN
  SELECT COUNT(*) INTO food_entries_count FROM food_entries;
  SELECT COUNT(*) INTO glucose_readings_count FROM glucose_readings;

  RAISE NOTICE '✅ Metabolic data preserved:';
  RAISE NOTICE '   - Food entries: %', food_entries_count;
  RAISE NOTICE '   - Glucose readings: %', glucose_readings_count;
END $$;

-- =============================================================================
-- ROLLBACK PLAN
-- =============================================================================
-- If this migration causes issues, restore from backup:
--   1. Stop all application servers
--   2. Restore backup: psql $DATABASE_URL < backup_before_glucolens_pivot_*.sql
--   3. Restart application servers
--   4. Investigate migration issues
--
-- Note: Cannot "undo" dropped tables without backup. BACKUP IS CRITICAL.

COMMIT;

-- =============================================================================
-- POST-MIGRATION CHECKLIST
-- =============================================================================
-- After running this migration, complete these tasks:
--
-- [ ] Verify all 13 GlucoLens tables exist
-- [ ] Check that food_entries and glucose_readings data preserved
-- [ ] Confirm health vault tables dropped (documents, share_packs, etc.)
-- [ ] Test food photo upload flow
-- [ ] Test glucose entry
-- [ ] Test dashboard load
-- [ ] Test admin authentication
-- [ ] Deploy updated application code (health vault routes removed)
-- [ ] Update environment variables (remove OCR/document-related keys)
-- [ ] Monitor error logs for 24 hours
--
-- =============================================================================
