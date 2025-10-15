-- GlucoLens Smart Pivot Migration
-- Created: 2025-10-15
-- Strategy: Delete health vault tables only, keep all metabolic insights tables

BEGIN;

-- Drop health vault tables in correct order (respect foreign keys)
-- Note: Using exact PascalCase names from staging database
DROP TABLE IF EXISTS "DocChunk" CASCADE;
DROP TABLE IF EXISTS "ChatMessage" CASCADE;
DROP TABLE IF EXISTS "ShareEvent" CASCADE;
DROP TABLE IF EXISTS "SharePackItem" CASCADE;
DROP TABLE IF EXISTS "SharePack" CASCADE;
DROP TABLE IF EXISTS "Observation" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "Summary" CASCADE;

-- Clean up token usage for deleted features
DELETE FROM "TokenUsage" WHERE feature IN ('ocr', 'index', 'explain', 'ask');

-- Update feature flags for GlucoLens
INSERT INTO feature_flags (name, enabled, "rolloutPercent", description)
VALUES ('glucolens_public_beta', true, 10, 'Enable GlucoLens for 10% of users (beta cohort)')
ON CONFLICT (name) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  "rolloutPercent" = EXCLUDED."rolloutPercent",
  description = EXCLUDED.description;

-- Add pivot metadata to existing users
UPDATE "Person"
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'pivoted_to_glucolens_at', NOW(),
  'original_product', 'evermed_health_vault'
)
WHERE metadata IS NULL OR NOT (metadata ? 'pivoted_to_glucolens_at');

COMMIT;
