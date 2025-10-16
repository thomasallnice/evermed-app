-- Migration: Add Multi-Dish Meal Support
-- Created: 2025-10-15
-- Purpose: Enable multiple photos/dishes per meal with per-dish ingredient tracking

BEGIN;

-- Add food_photo_id column to food_ingredients table
-- This links ingredients to specific dishes/photos within a meal
ALTER TABLE "food_ingredients"
ADD COLUMN "food_photo_id" TEXT;

-- Add foreign key constraint with SET NULL on photo deletion
-- Ingredients survive if photo is deleted, but cascade if entry is deleted
ALTER TABLE "food_ingredients"
ADD CONSTRAINT "food_ingredients_food_photo_id_fkey"
FOREIGN KEY ("food_photo_id")
REFERENCES "food_photos"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add index for efficient querying of ingredients by photo
CREATE INDEX "food_ingredients_food_photo_id_idx"
ON "food_ingredients"("food_photo_id");

-- Add composite index for common "show all dishes with ingredients" queries
CREATE INDEX "food_ingredients_food_entry_id_food_photo_id_idx"
ON "food_ingredients"("food_entry_id", "food_photo_id");

-- Optional: Add columns for enhanced UX (commented out by default)
-- Uncomment these if you want dish ordering and labeling features

-- ALTER TABLE "food_photos"
-- ADD COLUMN "dish_order" INTEGER;

-- ALTER TABLE "food_photos"
-- ADD COLUMN "display_name" TEXT;

-- Verification queries (for manual testing)
-- SELECT COUNT(*) FROM food_ingredients WHERE food_photo_id IS NOT NULL;
-- SELECT COUNT(*) FROM food_photos;
-- SELECT * FROM food_ingredients LIMIT 5;

COMMIT;
