-- Sprint 6: Add Feature Flags and Enhanced Analytics

-- 1. Add metadata field to Person table for extensible storage (onboarding status, preferences)
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 2. Rename and enhance AnalyticsEvent table for better privacy compliance
-- Preserve existing data by renaming columns instead of dropping
ALTER TABLE "AnalyticsEvent" RENAME TO "analytics_events";
ALTER TABLE "analytics_events"
  ADD COLUMN IF NOT EXISTS "eventType" TEXT,
  ADD COLUMN IF NOT EXISTS "eventName" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

-- Migrate existing data from old schema to new schema
UPDATE "analytics_events"
SET "eventType" = 'legacy',
    "eventName" = "name",
    "metadata" = "meta"
WHERE "eventType" IS NULL;

-- Make new columns NOT NULL after data migration
ALTER TABLE "analytics_events"
  ALTER COLUMN "eventType" SET NOT NULL,
  ALTER COLUMN "eventName" SET NOT NULL;

-- Drop old columns (userId, name, meta) - NO PHI allowed
ALTER TABLE "analytics_events"
  DROP COLUMN IF EXISTS "userId",
  DROP COLUMN IF EXISTS "name",
  DROP COLUMN IF EXISTS "meta";

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "analytics_events_eventType_eventName_createdAt_idx"
  ON "analytics_events"("eventType", "eventName", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_sessionId_createdAt_idx"
  ON "analytics_events"("sessionId", "createdAt");

-- 3. Create FeatureFlag table for gradual rollout and A/B testing
CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT UNIQUE NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for efficient feature flag lookups
CREATE INDEX IF NOT EXISTS "feature_flags_name_enabled_idx"
  ON "feature_flags"("name", "enabled");

-- Insert default feature flag for Metabolic Insights
INSERT INTO "feature_flags" ("id", "name", "enabled", "rolloutPercent", "description")
VALUES
  (gen_random_uuid()::text, 'metabolic_insights_enabled', true, 100, 'Enable Metabolic Insights feature for beta users')
ON CONFLICT ("name") DO NOTHING;

-- Add trigger to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON "feature_flags"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Privacy validation comment
COMMENT ON TABLE "analytics_events" IS 'Non-PHI analytics only. No user identifiers, no medical data.';
COMMENT ON TABLE "feature_flags" IS 'Feature flags for gradual rollout. Admin-only table, no RLS needed.';
