-- Add health profile fields to Person table
-- FHIR-aligned fields for patient health data

-- Add height (FHIR Observation - vital signs)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "heightCm" DOUBLE PRECISION;

-- Add weight (FHIR Observation - vital signs)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION;

-- Add allergies array (FHIR AllergyIntolerance)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "allergies" TEXT[] DEFAULT '{}';

-- Add diet preferences array (FHIR NutritionOrder)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "diet" TEXT[] DEFAULT '{}';

-- Add health behaviors array (FHIR Observation - smoking, exercise, etc.)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "behaviors" TEXT[] DEFAULT '{}';

-- Add updatedAt timestamp for tracking profile changes
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index on updatedAt for efficient queries
CREATE INDEX IF NOT EXISTS "Person_updatedAt_idx" ON "Person"("updatedAt");

-- Add trigger to auto-update updatedAt on row changes
CREATE OR REPLACE FUNCTION update_person_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_updated_at_trigger ON "Person";
CREATE TRIGGER person_updated_at_trigger
BEFORE UPDATE ON "Person"
FOR EACH ROW
EXECUTE FUNCTION update_person_updated_at();

-- Add comments for FHIR alignment documentation
COMMENT ON COLUMN "Person"."heightCm" IS 'FHIR Observation (vital signs) - height in centimeters';
COMMENT ON COLUMN "Person"."weightKg" IS 'FHIR Observation (vital signs) - weight in kilograms';
COMMENT ON COLUMN "Person"."allergies" IS 'FHIR AllergyIntolerance - allergen list for medical safety';
COMMENT ON COLUMN "Person"."diet" IS 'FHIR NutritionOrder - dietary preferences and restrictions';
COMMENT ON COLUMN "Person"."behaviors" IS 'FHIR Observation - health behaviors (smoking, exercise, etc.)';
