-- GlucoLens Smart Pivot Migration
-- Created: 2025-10-15
-- Strategy: Delete health vault tables only, keep all metabolic insights tables

BEGIN;

-- Drop health vault tables in correct order (respect foreign keys)
DROP TABLE IF EXISTS doc_chunks CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS share_events CASCADE;
DROP TABLE IF EXISTS share_pack_items CASCADE;
DROP TABLE IF EXISTS share_packs CASCADE;
DROP TABLE IF EXISTS observations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Clean up token usage for deleted features
DELETE FROM token_usage WHERE feature IN ('ocr', 'index', 'explain', 'ask');

-- Update feature flags for GlucoLens
INSERT INTO feature_flags (name, enabled, rollout_percent, description)
VALUES ('glucolens_public_beta', true, 10, 'Enable GlucoLens for 10% of users (beta cohort)')
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  rollout_percent = EXCLUDED.rollout_percent,
  description = EXCLUDED.description;

-- Add pivot metadata to existing users
UPDATE "Person"
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'pivoted_to_glucolens_at', NOW(),
  'original_product', 'evermed_health_vault'
)
WHERE metadata IS NULL OR NOT (metadata ? 'pivoted_to_glucolens_at');

COMMIT;
