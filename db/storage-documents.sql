-- ============================================================================
-- Storage Bucket: documents
-- Purpose: Store user-uploaded medical documents (PDFs, images)
-- Privacy: Private with RLS enforcement
-- Path Structure: {personId}/{timestamp}-{filename}
-- Ownership: TRANSITIVE - personId → Person.ownerId → auth.uid()
-- File Limits: PDF/JPEG/PNG only, max 10MB
-- ============================================================================

-- ============================================================================
-- SECURITY MODEL: Transitive Ownership
-- ============================================================================
-- CRITICAL: This bucket uses a DIFFERENT ownership pattern than food-photos or ml-models!
--
-- Path structure: {personId}/{timestamp}-{filename}
-- Example: "550e8400-e29b-41d4-a716-446655440000/1234567890-test.pdf"
--
-- The first folder is `personId` (NOT auth.uid()!), so we must:
-- 1. Extract personId from storage path: (storage.foldername(name))[1]
-- 2. Look up Person record with that id
-- 3. Verify Person.ownerId = auth.uid()
--
-- This is a TRANSITIVE OWNERSHIP pattern requiring a JOIN to the Person table.
-- Performance: Requires index on Person(id, ownerId) for fast policy evaluation.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Storage Bucket
-- ============================================================================
-- Note: This must be run as a Supabase admin (service role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket (requires authentication + RLS)
  10485760, -- 10MB in bytes (10 * 1024 * 1024)
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- ============================================================================
-- STEP 2: Enable RLS on storage.objects table (if not already enabled)
-- ============================================================================
-- This is typically already enabled, but we ensure it here
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create Index for Policy Performance
-- ============================================================================
-- The Person table needs an index on (id, ownerId) to support fast policy lookups.
-- This index may already exist from other queries, but we ensure it here.
-- Note: Running this on the Person table requires access to the main database schema,
-- not just storage. This should be applied separately via Prisma migration or Supabase CLI.
--
-- Recommended index (add to db/migrations if not exists):
-- CREATE INDEX IF NOT EXISTS "Person_id_ownerId_idx" ON "Person"("id", "ownerId");
--
-- For now, we document this requirement. Apply separately if needed.

-- ============================================================================
-- STEP 4: RLS Policy - Upload to Own Person Folder
-- ============================================================================
-- Users can only upload files to folders for Person records they own.
-- Path validation: {personId}/* where Person.ownerId = auth.uid()
DROP POLICY IF EXISTS "Users can upload documents to own person folder" ON storage.objects;
CREATE POLICY "Users can upload documents to own person folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL -- Must be authenticated
  AND (
    -- Extract personId from first folder in path and verify ownership
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person".id::text = (storage.foldername(name))[1]
      AND "Person"."ownerId" = auth.uid()::text
    )
  )
);

-- ============================================================================
-- STEP 5: RLS Policy - View Own Documents
-- ============================================================================
-- Users can only view (SELECT) files in folders for Person records they own
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Extract personId from first folder in path and verify ownership
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person".id::text = (storage.foldername(name))[1]
      AND "Person"."ownerId" = auth.uid()::text
    )
  )
);

-- ============================================================================
-- STEP 6: RLS Policy - Update Own Documents
-- ============================================================================
-- Users can update metadata of documents they own (e.g., change content-type)
DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person".id::text = (storage.foldername(name))[1]
      AND "Person"."ownerId" = auth.uid()::text
    )
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person".id::text = (storage.foldername(name))[1]
      AND "Person"."ownerId" = auth.uid()::text
    )
  )
);

-- ============================================================================
-- STEP 7: RLS Policy - Delete Own Documents
-- ============================================================================
-- Users can delete documents in folders for Person records they own
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM "Person"
      WHERE "Person".id::text = (storage.foldername(name))[1]
      AND "Person"."ownerId" = auth.uid()::text
    )
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';

-- List all policies on storage.objects for documents bucket
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%documents%'
ORDER BY policyname;

-- ============================================================================
-- TEST SCENARIOS
-- ============================================================================
-- To test these policies, you need to:
--
-- 1. Create test users with known auth.uid() values:
--    - User A: auth.uid() = '11111111-1111-1111-1111-111111111111'
--    - User B: auth.uid() = '22222222-2222-2222-2222-222222222222'
--
-- 2. Create Person records:
--    - Person A: id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ownerId = User A's auth.uid()
--    - Person B: id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', ownerId = User B's auth.uid()
--
-- 3. Test upload as User A:
--    Path: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/1234567890-test.pdf'
--    Expected: SUCCESS (Person A belongs to User A)
--
-- 4. Test upload as User A to Person B's folder:
--    Path: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/1234567890-test.pdf'
--    Expected: FAIL (Person B does not belong to User A)
--
-- 5. Test view as User A:
--    Path: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/1234567890-test.pdf'
--    Expected: SUCCESS (can view own files)
--
-- 6. Test view as User A of Person B's file:
--    Path: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/1234567890-test.pdf'
--    Expected: FAIL (cannot view other users' files)
--
-- To run tests manually:
-- SET LOCAL role = authenticated;
-- SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';
-- -- Then run SELECT queries on storage.objects with WHERE bucket_id = 'documents'

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Path Structure: Files MUST be uploaded with path: {personId}/{timestamp}-{filename}
--    Example: "550e8400-e29b-41d4-a716-446655440000/1234567890-test.pdf"
--    The upload endpoint (/api/uploads) enforces this structure.
--
-- 2. Transitive Ownership: Unlike food-photos or ml-models buckets, this bucket
--    does NOT use auth.uid() directly in the path. Instead, it uses personId,
--    which requires a JOIN to the Person table to verify ownership.
--
-- 3. Signed URLs: Generate using Supabase client (server-side with service role):
--    const { data, error } = await supabase.storage
--      .from('documents')
--      .createSignedUrl('personId/timestamp-filename.pdf', 3600) // 1 hour
--
-- 4. File Size Limit: Enforced at bucket level (10MB). Client should validate
--    before upload to provide better UX. Medical documents are typically < 5MB.
--
-- 5. MIME Type Validation: Enforced at bucket level. Only PDF and JPEG/PNG allowed.
--
-- 6. Cross-User Access: Completely blocked by RLS policies. User A cannot
--    access User B's documents even with direct path knowledge, because the
--    Person table lookup will fail.
--
-- 7. Service Role Bypass: Service role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS.
--    This is used by /api/uploads for initial file upload and by /api/explain
--    for generating signed URLs after authorization checks.
--
-- 8. Orphaned Files: If a Person record is deleted (Cascade), the Document rows
--    are deleted, but the storage files remain until explicitly deleted. This is
--    by design - manual cleanup or scheduled jobs should handle orphaned files.
--
-- 9. Performance: The EXISTS subquery on Person table is fast if an index exists
--    on (id, ownerId). Without this index, policy evaluation will be slow.
--    Recommended index (add via Prisma migration):
--    CREATE INDEX IF NOT EXISTS "Person_id_ownerId_idx" ON "Person"("id", "ownerId");
--
-- 10. Error Messages: When RLS blocks access, Supabase returns generic 400 errors
--     to avoid leaking information about which resources exist. This is correct
--     security behavior.
--
-- 11. Upload Flow Security:
--     - /api/uploads receives file + personId
--     - Validates person.ownerId === userId before upload
--     - Uses service role to upload (bypasses RLS)
--     - After upload, signed URLs are generated with service role
--     - RLS policies enforce access control when users try to access signed URLs
--
-- 12. Alternative Approach (NOT USED): Could use auth.uid() directly in path like:
--     Path: {auth.uid()}/{timestamp}-{filename}
--     This would simplify RLS policies but requires changing upload endpoint and
--     migrating existing files. Current approach maintains Person abstraction.
-- ============================================================================
