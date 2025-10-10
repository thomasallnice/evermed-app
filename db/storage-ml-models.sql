-- ============================================================================
-- Storage Bucket: ml-models
-- Purpose: Store trained ML model artifacts for per-user glucose predictions
-- Privacy: Private with RLS enforcement
-- Path Structure: {userId}/{modelType}/{modelVersion}.json
-- File Limits: JSON only, max 50MB
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Storage Bucket
-- ============================================================================
-- Note: This must be run as a Supabase admin (service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ml-models',
  'ml-models',
  false, -- Private bucket (requires authentication)
  52428800, -- 50MB in bytes (50 * 1024 * 1024)
  ARRAY['application/json', 'application/octet-stream'] -- JSON and binary model files
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/json', 'application/octet-stream'];

-- ============================================================================
-- STEP 2: Enable RLS on storage.objects table (if not already enabled)
-- ============================================================================
-- This is typically already enabled, but we ensure it here
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: RLS Policy - Upload to Own Folder
-- ============================================================================
-- Users can only upload model files to their own folder: {userId}/*
-- The path structure enforces isolation at the file system level
DROP POLICY IF EXISTS "Users can upload ML models to own folder" ON storage.objects;
CREATE POLICY "Users can upload ML models to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL -- Must be authenticated
  AND (storage.foldername(name))[1] = auth.uid()::text -- First folder must be userId
);

-- ============================================================================
-- STEP 4: RLS Policy - View Own Models
-- ============================================================================
-- Users can only view (SELECT) model files in their own folder
DROP POLICY IF EXISTS "Users can view own ML models" ON storage.objects;
CREATE POLICY "Users can view own ML models"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 5: RLS Policy - Update Own Models
-- ============================================================================
-- Users can update metadata of their own models (e.g., change content-type)
DROP POLICY IF EXISTS "Users can update own ML models" ON storage.objects;
CREATE POLICY "Users can update own ML models"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'ml-models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- STEP 6: RLS Policy - Delete Own Models
-- ============================================================================
-- Users can delete their own model files
DROP POLICY IF EXISTS "Users can delete own ML models" ON storage.objects;
CREATE POLICY "Users can delete own ML models"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ml-models'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'ml-models';

-- List all policies on storage.objects for ml-models bucket
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%ML models%'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Path Structure: Files must be uploaded with path: {userId}/{modelType}/{version}.json
--    Example: "550e8400-e29b-41d4-a716-446655440000/glucose-lstm/v1.0.0.json"
--
-- 2. Model Types: Currently supported:
--    - glucose-lstm: LSTM model for glucose prediction
--    - glucose-baseline: Simple baseline predictor (fallback)
--
-- 3. Signed URLs: Generate using Supabase client:
--    const { data, error } = await supabase.storage
--      .from('ml-models')
--      .createSignedUrl('userId/glucose-lstm/v1.0.0.json', 3600)
--
-- 4. File Size Limit: Enforced at bucket level (50MB). LSTM models are typically 5-20MB.
--
-- 5. MIME Type Validation: Enforced at bucket level. JSON and binary formats allowed.
--
-- 6. Model Versioning: PersonalModel table tracks metadata (version, performance, isActive)
--    Storage path should match PersonalModel.storagePath column.
--
-- 7. Cross-User Access: Completely blocked by RLS policies. User A cannot
--    access User B's models even with direct path knowledge.
--
-- 8. Service Role Bypass: Service role can access all models (bypasses RLS).
--    Use for training pipelines (Cloud Run workers) and admin operations.
--
-- 9. Model Lifecycle:
--    - Training worker creates model → uploads to storage → inserts PersonalModel row
--    - Prediction API loads model from storage using PersonalModel.storagePath
--    - Old versions remain in storage until explicitly deleted
--    - isActive flag determines which model version is used for inference
-- ============================================================================
