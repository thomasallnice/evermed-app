-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "IngredientSource" AS ENUM ('ai_detected', 'manual_entry', 'nutrition_api');

-- CreateEnum
CREATE TYPE "GlucoseSource" AS ENUM ('cgm', 'fingerstick', 'lab', 'interpolated');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('daily_summary', 'weekly_report', 'pattern_detected');

-- CreateEnum
CREATE TYPE "TierLevel" AS ENUM ('free', 'premium', 'family');

-- AlterTable Person - Add metabolic preferences
ALTER TABLE "Person" ADD COLUMN "cgm_connected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Person" ADD COLUMN "target_glucose_min" DOUBLE PRECISION;
ALTER TABLE "Person" ADD COLUMN "target_glucose_max" DOUBLE PRECISION;

-- CreateTable food_entries
CREATE TABLE "food_entries" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "notes" TEXT,
    "predicted_glucose_peak" DOUBLE PRECISION,
    "actual_glucose_peak" DOUBLE PRECISION,
    "total_calories" DOUBLE PRECISION NOT NULL,
    "total_carbs_g" DOUBLE PRECISION NOT NULL,
    "total_protein_g" DOUBLE PRECISION NOT NULL,
    "total_fat_g" DOUBLE PRECISION NOT NULL,
    "total_fiber_g" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable food_photos
CREATE TABLE "food_photos" (
    "id" TEXT NOT NULL,
    "food_entry_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "original_size_bytes" INTEGER NOT NULL,
    "analysis_status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "analysis_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable food_ingredients
CREATE TABLE "food_ingredients" (
    "id" TEXT NOT NULL,
    "food_entry_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "fiber_g" DOUBLE PRECISION NOT NULL,
    "source" "IngredientSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable glucose_readings
CREATE TABLE "glucose_readings" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "GlucoseSource" NOT NULL,
    "device_id" TEXT,
    "food_entry_id" TEXT,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glucose_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable glucose_predictions
CREATE TABLE "glucose_predictions" (
    "id" TEXT NOT NULL,
    "food_entry_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "predicted_peak_value" DOUBLE PRECISION NOT NULL,
    "predicted_peak_time_minutes" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "glucose_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable personal_models
CREATE TABLE "personal_models" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "training_meals_count" INTEGER NOT NULL,
    "last_trained_at" TIMESTAMP(3) NOT NULL,
    "accuracy_rmse" DOUBLE PRECISION,
    "model_data_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable meal_templates
CREATE TABLE "meal_templates" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "nutrition_totals" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable metabolic_insights
CREATE TABLE "metabolic_insights" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "insight_type" "InsightType" NOT NULL,
    "insight_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metabolic_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable subscription_tiers
CREATE TABLE "subscription_tiers" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "tier" "TierLevel" NOT NULL,
    "meals_limit_per_week" INTEGER NOT NULL,
    "meals_used_this_week" INTEGER NOT NULL DEFAULT 0,
    "week_start_date" DATE NOT NULL,
    "stripe_subscription_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_entries_person_id_timestamp_idx" ON "food_entries"("person_id", "timestamp");

-- CreateIndex
CREATE INDEX "glucose_readings_person_id_timestamp_idx" ON "glucose_readings"("person_id", "timestamp");

-- CreateIndex
CREATE INDEX "metabolic_insights_person_id_date_idx" ON "metabolic_insights"("person_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "personal_models_person_id_key" ON "personal_models"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_person_id_key" ON "subscription_tiers"("person_id");

-- AddForeignKey
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_photos" ADD CONSTRAINT "food_photos_food_entry_id_fkey" FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_ingredients" ADD CONSTRAINT "food_ingredients_food_entry_id_fkey" FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_food_entry_id_fkey" FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_predictions" ADD CONSTRAINT "glucose_predictions_food_entry_id_fkey" FOREIGN KEY ("food_entry_id") REFERENCES "food_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glucose_predictions" ADD CONSTRAINT "glucose_predictions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_models" ADD CONSTRAINT "personal_models_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_templates" ADD CONSTRAINT "meal_templates_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metabolic_insights" ADD CONSTRAINT "metabolic_insights_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_tiers" ADD CONSTRAINT "subscription_tiers_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
