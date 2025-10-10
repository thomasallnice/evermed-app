-- ============================================
-- RLS Policies for Metabolic Insights Tables
-- ============================================
-- Security: Users can only access their own metabolic data
-- Enforcement: Row Level Security on all metabolic tables
-- ============================================

-- Enable RLS on all metabolic tables
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE metabolic_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FOOD_ENTRIES Policies
-- ============================================

-- Users can view their own food entries
CREATE POLICY "Users can view own food entries"
ON food_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = food_entries.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert their own food entries
CREATE POLICY "Users can insert own food entries"
ON food_entries FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = food_entries.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update their own food entries
CREATE POLICY "Users can update own food entries"
ON food_entries FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = food_entries.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete their own food entries
CREATE POLICY "Users can delete own food entries"
ON food_entries FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = food_entries.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- FOOD_PHOTOS Policies
-- ============================================

-- Users can view photos of their own food entries
CREATE POLICY "Users can view own food photos"
ON food_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_photos.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert photos to their own food entries
CREATE POLICY "Users can insert own food photos"
ON food_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_photos.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update photos of their own food entries
CREATE POLICY "Users can update own food photos"
ON food_photos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_photos.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete photos of their own food entries
CREATE POLICY "Users can delete own food photos"
ON food_photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_photos.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- FOOD_INGREDIENTS Policies
-- ============================================

-- Users can view ingredients of their own food entries
CREATE POLICY "Users can view own food ingredients"
ON food_ingredients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_ingredients.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert ingredients to their own food entries
CREATE POLICY "Users can insert own food ingredients"
ON food_ingredients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_ingredients.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update ingredients of their own food entries
CREATE POLICY "Users can update own food ingredients"
ON food_ingredients FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_ingredients.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete ingredients of their own food entries
CREATE POLICY "Users can delete own food ingredients"
ON food_ingredients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM food_entries
    JOIN "Person" ON "Person".id = food_entries.person_id
    WHERE food_entries.id = food_ingredients.food_entry_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- GLUCOSE_READINGS Policies
-- ============================================

-- Users can view their own glucose readings
CREATE POLICY "Users can view own glucose readings"
ON glucose_readings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_readings.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert their own glucose readings
CREATE POLICY "Users can insert own glucose readings"
ON glucose_readings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_readings.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update their own glucose readings
CREATE POLICY "Users can update own glucose readings"
ON glucose_readings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_readings.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete their own glucose readings
CREATE POLICY "Users can delete own glucose readings"
ON glucose_readings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_readings.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- GLUCOSE_PREDICTIONS Policies
-- ============================================

-- Users can view predictions for their own food entries
CREATE POLICY "Users can view own glucose predictions"
ON glucose_predictions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_predictions.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert predictions for their own food entries
CREATE POLICY "Users can insert own glucose predictions"
ON glucose_predictions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_predictions.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update predictions for their own food entries
CREATE POLICY "Users can update own glucose predictions"
ON glucose_predictions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_predictions.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete predictions for their own food entries
CREATE POLICY "Users can delete own glucose predictions"
ON glucose_predictions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = glucose_predictions.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- PERSONAL_MODELS Policies
-- ============================================

-- Users can view their own personal model
CREATE POLICY "Users can view own personal model"
ON personal_models FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = personal_models.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert their own personal model
CREATE POLICY "Users can insert own personal model"
ON personal_models FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = personal_models.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update their own personal model
CREATE POLICY "Users can update own personal model"
ON personal_models FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = personal_models.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete their own personal model
CREATE POLICY "Users can delete own personal model"
ON personal_models FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = personal_models.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- MEAL_TEMPLATES Policies
-- ============================================

-- Users can view their own meal templates
CREATE POLICY "Users can view own meal templates"
ON meal_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = meal_templates.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert their own meal templates
CREATE POLICY "Users can insert own meal templates"
ON meal_templates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = meal_templates.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update their own meal templates
CREATE POLICY "Users can update own meal templates"
ON meal_templates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = meal_templates.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete their own meal templates
CREATE POLICY "Users can delete own meal templates"
ON meal_templates FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = meal_templates.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- METABOLIC_INSIGHTS Policies
-- ============================================

-- Users can view their own metabolic insights
CREATE POLICY "Users can view own metabolic insights"
ON metabolic_insights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = metabolic_insights.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert their own metabolic insights
CREATE POLICY "Users can insert own metabolic insights"
ON metabolic_insights FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = metabolic_insights.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update their own metabolic insights
CREATE POLICY "Users can update own metabolic insights"
ON metabolic_insights FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = metabolic_insights.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete their own metabolic insights
CREATE POLICY "Users can delete own metabolic insights"
ON metabolic_insights FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = metabolic_insights.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- SUBSCRIPTION_TIERS Policies
-- ============================================

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON subscription_tiers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = subscription_tiers.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can insert their own subscription
CREATE POLICY "Users can insert own subscription"
ON subscription_tiers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = subscription_tiers.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON subscription_tiers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = subscription_tiers.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- Users can delete their own subscription
CREATE POLICY "Users can delete own subscription"
ON subscription_tiers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id = subscription_tiers.person_id
    AND "Person"."ownerId" = auth.uid()::text
  )
);

-- ============================================
-- Admin Policies (Optional - for analytics)
-- ============================================
-- NOTE: Create service role or admin role if needed for analytics
-- For now, all access is user-scoped only
