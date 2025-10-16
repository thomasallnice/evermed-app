-- Fix food-photos bucket to be PUBLIC
-- This allows OpenAI Vision API to download photos via public URLs

-- Make bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'food-photos';

-- Verify the change
SELECT name, public, created_at
FROM storage.buckets
WHERE name = 'food-photos';
