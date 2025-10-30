-- Migration: Add missing description and last_used_at columns to meal_templates
-- Date: 2025-10-30
-- Purpose: Align production database with Prisma schema.prisma
--
-- The original migration (20251010090000_add_metabolic_insights) created the meal_templates
-- table but was missing two columns that are defined in schema.prisma:
-- - description (TEXT, nullable) - Optional meal description
-- - last_used_at (TIMESTAMP, nullable) - Track last usage separately from updated_at
--
-- This migration is idempotent using IF NOT EXISTS checks.

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meal_templates'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE "meal_templates"
        ADD COLUMN "description" TEXT;
    END IF;
END $$;

-- Add last_used_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meal_templates'
        AND column_name = 'last_used_at'
    ) THEN
        ALTER TABLE "meal_templates"
        ADD COLUMN "last_used_at" TIMESTAMP(3);
    END IF;
END $$;

-- Verify columns were added successfully
DO $$
BEGIN
    -- Check description column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meal_templates'
        AND column_name = 'description'
    ) THEN
        RAISE EXCEPTION 'Failed to add description column to meal_templates';
    END IF;

    -- Check last_used_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'meal_templates'
        AND column_name = 'last_used_at'
    ) THEN
        RAISE EXCEPTION 'Failed to add last_used_at column to meal_templates';
    END IF;
END $$;

-- Migration complete
-- Both columns are nullable with no defaults, matching schema.prisma exactly
