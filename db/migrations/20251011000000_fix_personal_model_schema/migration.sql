-- Fix PersonalModel schema to match Prisma schema
-- This migration corrects the schema drift between migration and Prisma schema
-- IDEMPOTENT: Handles both old schema (model_version) and new schema (version)

-- Add missing columns (IF NOT EXISTS makes this idempotent)
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS model_type TEXT;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS training_data_start TIMESTAMP;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS training_data_end TIMESTAMP;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS trained_at TIMESTAMP;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS accuracy_mae DOUBLE PRECISION;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS accuracy_r2 DOUBLE PRECISION;
ALTER TABLE personal_models ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Migrate data from old columns to new columns (only if old columns exist)
DO $$
BEGIN
  -- Check if old schema exists (model_version column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'personal_models' AND column_name = 'model_version'
  ) THEN
    -- Migrate from old schema to new schema
    UPDATE personal_models
    SET
      version = model_version,
      model_type = 'glucose-prediction', -- Default type for existing models
      trained_at = last_trained_at
    WHERE model_type IS NULL;

    -- Drop old columns
    ALTER TABLE personal_models DROP COLUMN model_version;
    ALTER TABLE personal_models DROP COLUMN last_trained_at;
  END IF;
END $$;

-- Set default values for new columns if NULL
UPDATE personal_models
SET
  model_type = COALESCE(model_type, 'glucose-prediction'),
  is_active = COALESCE(is_active, false),
  trained_at = COALESCE(trained_at, created_at)
WHERE model_type IS NULL OR is_active IS NULL OR trained_at IS NULL;

-- Make required columns NOT NULL after data migration
ALTER TABLE personal_models ALTER COLUMN model_type SET NOT NULL;
ALTER TABLE personal_models ALTER COLUMN version SET NOT NULL;
ALTER TABLE personal_models ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE personal_models ALTER COLUMN trained_at SET NOT NULL;

-- Drop old unique constraint if exists
ALTER TABLE personal_models DROP CONSTRAINT IF EXISTS personal_models_person_id_key;

-- Add new unique constraint
DROP INDEX IF EXISTS personal_models_person_id_model_type_version_key;
CREATE UNIQUE INDEX personal_models_person_id_model_type_version_key
  ON personal_models(person_id, model_type, version);

-- Create index for active models lookup
DROP INDEX IF EXISTS personal_models_person_id_model_type_is_active_idx;
CREATE INDEX personal_models_person_id_model_type_is_active_idx
  ON personal_models(person_id, model_type, is_active);
