-- ============================================================================
-- Storage RLS Policies: food-photos bucket
-- Purpose: Path-based isolation for food photos
-- ============================================================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Upload to Own Folder
DROP POLICY IF EXISTS "Users can upload food photos to own folder" ON storage.objects;
CREATE POLICY "Users can upload food photos to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: View Own Photos
DROP POLICY IF EXISTS "Users can view own food photos" ON storage.objects;
CREATE POLICY "Users can view own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Update Own Photos
DROP POLICY IF EXISTS "Users can update own food photos" ON storage.objects;
CREATE POLICY "Users can update own food photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Delete Own Photos
DROP POLICY IF EXISTS "Users can delete own food photos" ON storage.objects;
CREATE POLICY "Users can delete own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify policies were created
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%food photos%'
ORDER BY policyname;
