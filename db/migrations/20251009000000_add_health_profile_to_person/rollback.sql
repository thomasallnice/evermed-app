-- Rollback script for add_health_profile_to_person migration
-- USE WITH CAUTION: This will delete health profile data

-- Remove trigger
DROP TRIGGER IF EXISTS person_updated_at_trigger ON "Person";

-- Remove function
DROP FUNCTION IF EXISTS update_person_updated_at();

-- Remove index
DROP INDEX IF EXISTS "Person_updatedAt_idx";

-- Remove columns (WARNING: Data will be lost!)
ALTER TABLE "Person" DROP COLUMN IF EXISTS "heightCm";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "weightKg";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "allergies";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "diet";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "behaviors";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "updatedAt";

-- Note: Run this only in emergency rollback scenarios
-- To rollback via Prisma: npx prisma migrate resolve --rolled-back 20251009000000_add_health_profile_to_person
