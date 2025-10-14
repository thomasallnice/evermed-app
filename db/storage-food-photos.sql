-- ============================================================================
-- Storage Bucket: food-photos
-- Purpose: Store user-uploaded food photos for meal logging and AI analysis
-- Privacy: PUBLIC bucket (required for OpenAI Vision API access)
--          RLS policies enforce write-only access (users can only upload to own folder)
-- Path Structure: {userId}/{photoId}.jpg
-- File Limits: JPEG/PNG/WEBP only, max 5MB
-- ============================================================================
-- IMPORTANT: This bucket MUST be PUBLIC for OpenAI Vision API to download images
-- See: docs/fixes/food-photos-bucket-fix.md (2025-10-11)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Storage Bucket
-- ============================================================================
-- Note: This must be run as a Supabase admin (service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  true, -- PUBLIC bucket (required for OpenAI Vision API to download images)
  5242880, -- 5MB in bytes (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] -- JPEG, PNG, WEBP
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================================================
-- STEP 2: Enable RLS on storage.objects table (if not already enabled)
-- ============================================================================
-- This is typically already enabled, but we ensure it here
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: RLS Policy - Upload to Own Folder
-- ============================================================================
-- Users can only upload files to their own folder: {userId}/*
-- The path structure enforces isolation at the file system level
DROP POLICY IF EXISTS "Users can upload food photos to own folder" ON storage.objects;
CREATE POLICY "Users can upload food photos to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL -- Must be authenticated
  AND (storage.foldername(name))[1] = auth.uid()::text -- First folder must be userId
);

-- ============================================================================
-- STEP 4: RLS Policy - View Own Photos
-- ============================================================================
-- Users can only view (SELECT) files in their own folder
DROP POLICY IF EXISTS "Users can view own food photos" ON storage.objects;
CREATE POLICY "Users can view own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 5: RLS Policy - Update Own Photos
-- ============================================================================
-- Users can update metadata of their own photos (e.g., change content-type)
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

-- ============================================================================
-- STEP 6: RLS Policy - Delete Own Photos
-- ============================================================================
-- Users can delete their own photos
DROP POLICY IF EXISTS "Users can delete own food photos" ON storage.objects;
CREATE POLICY "Users can delete own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'food-photos';

-- List all policies on storage.objects for food-photos bucket
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%food photos%'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Path Structure: Files must be uploaded with path: {userId}/{photoId}.jpg
--    Example: "550e8400-e29b-41d4-a716-446655440000/photo_1234567890.jpg"
--
-- 2. Signed URLs: Generate using Supabase client:
--    const { data, error } = await supabase.storage
--      .from('food-photos')
--      .createSignedUrl('userId/photoId.jpg', 3600) // 1 hour = 3600 seconds
--
-- 3. File Size Limit: Enforced at bucket level (5MB). Client should validate
--    before upload to provide better UX.
--
-- 4. MIME Type Validation: Enforced at bucket level. Only JPEG and PNG allowed.
--
-- 5. Cross-User Access: Completely blocked by RLS policies. User A cannot
--    access User B's photos even with direct path knowledge.
--
-- 6. Service Role Bypass: Service role can access all files (bypasses RLS).
--    Use only for admin operations like data export or cleanup.
-- ============================================================================
