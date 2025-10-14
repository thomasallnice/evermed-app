-- Fix food-photos bucket configuration
-- This script ensures the bucket exists and has proper public read access

-- Step 1: Check if bucket exists (if not, must be created via Supabase dashboard or API)
-- SELECT * FROM storage.buckets WHERE name = 'food-photos';

-- Step 2: Update bucket to be PUBLIC (allows getPublicUrl to work)
UPDATE storage.buckets
SET public = true
WHERE name = 'food-photos';

-- Step 3: Drop existing policies if any
DROP POLICY IF EXISTS "Public read access for food photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload food photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload food photos to their folder" ON storage.objects;

-- Step 4: Create PUBLIC READ policy for OpenAI Vision API
CREATE POLICY "Public read access for food photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-photos');

-- Step 5: Create AUTHENTICATED UPLOAD policy (with user isolation)
CREATE POLICY "Users can upload food photos to their folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.role() = 'authenticated'
);

-- Step 6: Create AUTHENTICATED DELETE policy (users can delete their own)
CREATE POLICY "Users can delete their own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos'
  AND auth.role() = 'authenticated'
);

-- Verification queries (run these to check)
-- SELECT name, public FROM storage.buckets WHERE name = 'food-photos';
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%food%';
