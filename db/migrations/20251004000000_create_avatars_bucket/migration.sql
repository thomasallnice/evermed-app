-- ============================================================================
-- EverMed Avatar Storage Bucket Setup
-- ============================================================================
-- This migration creates the 'avatars' storage bucket with RLS policies
-- for secure profile picture uploads.
--
-- PATH STRUCTURE: {userId}/avatar.{extension}
-- - Each user can only have one avatar (replaceable)
-- - Public read access for displaying profile pictures
-- - User isolation enforced via RLS
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE AVATARS BUCKET
-- ============================================================================

-- Create the avatars bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- PUBLIC bucket for read access (profile pictures visible to all)
  5242880, -- 5 MB file size limit (client-side enforced)
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[];

-- ============================================================================
-- PART 2: STORAGE RLS POLICIES FOR AVATARS
-- ============================================================================

-- Drop existing policies if they exist (for clean re-deployment)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- POLICY 1: UPLOAD (INSERT)
-- Users can only upload to their own folder
-- Path pattern: {userId}/avatar.{extension}
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY 2: UPDATE (REPLACE)
-- Users can replace/update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY 3: DELETE
-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- POLICY 4: PUBLIC READ (SELECT)
-- Anyone can view/download avatars (for displaying profile pictures)
-- This is required because the bucket is public
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================================================
-- PART 3: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify the bucket and policies are set up correctly:

-- Check bucket configuration
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'avatars';

-- View avatar storage policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'storage'
-- AND tablename = 'objects'
-- AND policyname LIKE '%avatar%'
-- ORDER BY policyname;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Test avatar upload in the application
-- 2. Verify users can only access their own avatar folder
-- 3. Confirm public read access works for displaying avatars
-- 4. Implement client-side file size/type validation (5MB limit)
-- ============================================================================
