-- Add metadata column to Person table
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Add comment
COMMENT ON COLUMN "Person"."metadata" IS 'Extensible metadata for features like metabolic onboarding completion';
