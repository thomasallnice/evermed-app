-- GlucoLens Database Migration
-- Date: 2025-10-15
-- Purpose: Pivot from EverMed health vault to GlucoLens glucose tracker

BEGIN;

-- ============================================
-- STEP 1: Drop deprecated tables
-- ============================================

-- Document management tables (no longer needed)
DROP TABLE IF EXISTS "DocumentShare" CASCADE;
DROP TABLE IF EXISTS "DocChunk" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;

-- Share pack tables (deprecated feature)
DROP TABLE IF EXISTS "SharePackAccess" CASCADE;
DROP TABLE IF EXISTS "SharePackDocument" CASCADE;
DROP TABLE IF EXISTS "SharePack" CASCADE;

-- Medical record tables (not core to glucose tracking)
DROP TABLE IF EXISTS "Observation" CASCADE;
DROP TABLE IF EXISTS "Medication" CASCADE;
DROP TABLE IF EXISTS "Allergy" CASCADE;
DROP TABLE IF EXISTS "Encounter" CASCADE;
DROP TABLE IF EXISTS "Immunization" CASCADE;
DROP TABLE IF EXISTS "Procedure" CASCADE;
DROP TABLE IF EXISTS "Condition" CASCADE;

-- ============================================
-- STEP 2: Modify Person table for glucose focus
-- ============================================

-- Add glucose-specific fields to Person
ALTER TABLE "Person" 
ADD COLUMN IF NOT EXISTS "diabetesType" TEXT,
ADD COLUMN IF NOT EXISTS "diagnosisDate" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "targetGlucoseLow" DECIMAL(5,1) DEFAULT 70,
ADD COLUMN IF NOT EXISTS "targetGlucoseHigh" DECIMAL(5,1) DEFAULT 140,
ADD COLUMN IF NOT EXISTS "glucoseUnits" TEXT DEFAULT 'mg/dL',
ADD COLUMN IF NOT EXISTS "insulinType" TEXT,
ADD COLUMN IF NOT EXISTS "cgmType" TEXT;

-- Add check constraints
ALTER TABLE "Person"
ADD CONSTRAINT check_diabetes_type 
  CHECK ("diabetesType" IN ('type1', 'type2', 'prediabetes', 'gestational', 'none', NULL)),
ADD CONSTRAINT check_glucose_units 
  CHECK ("glucoseUnits" IN ('mg/dL', 'mmol/L'));

-- ============================================
-- STEP 3: Optimize existing metabolic tables
-- ============================================

-- Ensure food_entries table exists with all needed columns
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  meal_type TEXT,
  
  -- Nutrition data
  name TEXT,
  calories DECIMAL(8,2),
  carbs_g DECIMAL(8,2),
  protein_g DECIMAL(8,2),
  fat_g DECIMAL(8,2),
  fiber_g DECIMAL(8,2),
  sugar_g DECIMAL(8,2),
  
  -- User modifications
  user_notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  
  -- Predictions
  predicted_glucose_peak DECIMAL(5,1),
  predicted_peak_time INTEGER,
  actual_glucose_peak DECIMAL(5,1),
  actual_peak_time INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_person 
    FOREIGN KEY (person_id) REFERENCES "Person"(id) ON DELETE CASCADE
);

-- Ensure glucose_readings table is optimized
CREATE TABLE IF NOT EXISTS glucose_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value DECIMAL(5,1) NOT NULL,
  source TEXT NOT NULL,
  device_id TEXT,
  
  -- Meal correlation
  food_entry_id UUID REFERENCES food_entries(id) ON DELETE SET NULL,
  meal_impact DECIMAL(5,1),
  baseline_value DECIMAL(5,1),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_person 
    FOREIGN KEY (person_id) REFERENCES "Person"(id) ON DELETE CASCADE,
  CONSTRAINT glucose_range 
    CHECK (value >= 20 AND value <= 600),
  CONSTRAINT reading_source 
    CHECK (source IN ('manual', 'cgm_dexcom', 'cgm_libre', 'cgm_medtronic', 'fingerstick', 'lab')),
  CONSTRAINT unique_reading 
    UNIQUE(person_id, timestamp, source)
);

-- Create predictions table for ML
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  food_entry_id UUID NOT NULL REFERENCES food_entries(id) ON DELETE CASCADE,
  
  -- Prediction data
  predicted_peak DECIMAL(5,1) NOT NULL,
  predicted_time_to_peak INTEGER NOT NULL, -- minutes
  confidence DECIMAL(3,2) NOT NULL,
  model_version TEXT,
  
  -- Actual outcome (updated later)
  actual_peak DECIMAL(5,1),
  actual_time_to_peak INTEGER,
  error_magnitude DECIMAL(5,1),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_person 
    FOREIGN KEY (person_id) REFERENCES "Person"(id) ON DELETE CASCADE
);

-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_person 
    FOREIGN KEY (person_id) REFERENCES "Person"(id) ON DELETE CASCADE,
  CONSTRAINT insight_type 
    CHECK (type IN ('pattern', 'warning', 'achievement', 'recommendation', 'correlation'))
);

-- ============================================
-- STEP 4: Create optimized indexes
-- ============================================

-- Food entry indexes
CREATE INDEX IF NOT EXISTS idx_food_entries_user_time 
  ON food_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_person_time 
  ON food_entries(person_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_meal_type 
  ON food_entries(meal_type) WHERE meal_type IS NOT NULL;

-- Glucose reading indexes
CREATE INDEX IF NOT EXISTS idx_glucose_person_time 
  ON glucose_readings(person_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_glucose_food_entry 
  ON glucose_readings(food_entry_id) WHERE food_entry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_glucose_source 
  ON glucose_readings(source);
CREATE INDEX IF NOT EXISTS idx_glucose_value_range 
  ON glucose_readings(value) WHERE value > 180 OR value < 70;

-- Prediction indexes
CREATE INDEX IF NOT EXISTS idx_predictions_person 
  ON predictions(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_food 
  ON predictions(food_entry_id);
CREATE INDEX IF NOT EXISTS idx_predictions_accuracy 
  ON predictions(error_magnitude) WHERE error_magnitude IS NOT NULL;

-- Insight indexes
CREATE INDEX IF NOT EXISTS idx_insights_person_unread 
  ON insights(person_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_insights_type 
  ON insights(type, priority DESC);

-- ============================================
-- STEP 5: Create views for common queries
-- ============================================

-- Daily summary view
CREATE OR REPLACE VIEW daily_glucose_summary AS
SELECT 
  person_id,
  DATE(timestamp) as date,
  COUNT(*) as reading_count,
  AVG(value) as avg_glucose,
  MIN(value) as min_glucose,
  MAX(value) as max_glucose,
  STDDEV(value) as glucose_stddev,
  COUNT(*) FILTER (WHERE value >= 70 AND value <= 140) as in_range_count,
  COUNT(*) FILTER (WHERE value < 70) as low_count,
  COUNT(*) FILTER (WHERE value > 180) as high_count
FROM glucose_readings
GROUP BY person_id, DATE(timestamp);

-- Meal impact view
CREATE OR REPLACE VIEW meal_glucose_impact AS
SELECT 
  f.id as food_entry_id,
  f.person_id,
  f.name as meal_name,
  f.carbs_g,
  f.timestamp as meal_time,
  g_before.value as glucose_before,
  g_peak.value as glucose_peak,
  (g_peak.value - g_before.value) as glucose_rise,
  EXTRACT(EPOCH FROM (g_peak.timestamp - f.timestamp))/60 as minutes_to_peak
FROM food_entries f
LEFT JOIN LATERAL (
  SELECT value, timestamp
  FROM glucose_readings
  WHERE person_id = f.person_id
    AND timestamp BETWEEN f.timestamp - INTERVAL '30 minutes' AND f.timestamp
  ORDER BY ABS(EXTRACT(EPOCH FROM (timestamp - f.timestamp)))
  LIMIT 1
) g_before ON true
LEFT JOIN LATERAL (
  SELECT value, timestamp
  FROM glucose_readings  
  WHERE person_id = f.person_id
    AND timestamp BETWEEN f.timestamp AND f.timestamp + INTERVAL '3 hours'
  ORDER BY value DESC
  LIMIT 1
) g_peak ON true;

-- ============================================
-- STEP 6: Update RLS policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Food entries policies
CREATE POLICY "Users can manage their own food entries"
  ON food_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Glucose readings policies
CREATE POLICY "Users can manage their own glucose readings"
  ON glucose_readings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Predictions policies
CREATE POLICY "Users can view their own predictions"
  ON predictions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insights policies
CREATE POLICY "Users can view their own insights"
  ON insights FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 7: Clean up storage buckets
-- ============================================

-- Keep food-photos bucket (needed for food tracking)
-- Remove document-related buckets
DELETE FROM storage.buckets WHERE name IN ('documents', 'medical-records', 'share-packs');

-- ============================================
-- STEP 8: Data migration for existing users
-- ============================================

-- If you have existing food/glucose data, it's preserved
-- Just need to set default values for new Person columns
UPDATE "Person" 
SET 
  "diabetesType" = 'none',
  "glucoseUnits" = 'mg/dL',
  "targetGlucoseLow" = 70,
  "targetGlucoseHigh" = 140
WHERE "diabetesType" IS NULL;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify migration success:
/*
-- Check remaining tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check food/glucose data preserved
SELECT COUNT(*) as food_entries FROM food_entries;
SELECT COUNT(*) as glucose_readings FROM glucose_readings;

-- Check indexes created
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('food_entries', 'glucose_readings', 'predictions', 'insights');

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
*/
