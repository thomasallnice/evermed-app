-- ============================================================================
-- EverMed Supabase RLS Policies & Storage Security
-- ============================================================================
-- This script configures Row Level Security (RLS) policies for multi-tenant
-- data isolation and storage bucket security for the EverMed application.
--
-- DEPLOYMENT: Run this in Supabase SQL Editor for both staging and production
-- ENVIRONMENT: Requires Supabase with auth.users() function available
-- ============================================================================

-- ============================================================================
-- PART 1: STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Create the documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- PRIVATE bucket (requires authentication)
  52428800, -- 50 MB file size limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'image/bmp'
  ]::text[];

-- ============================================================================
-- PART 2: STORAGE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for clean re-deployment)
DROP POLICY IF EXISTS "Users can upload to their person folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own person files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own person files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own person files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read all files" ON storage.objects;

-- STORAGE POLICY 1: UPLOAD (INSERT)
-- Users can only upload files to folders of persons they own
-- Path pattern: {personId}/{timestamp}_{filename}
CREATE POLICY "Users can upload to their person folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND
  -- Extract personId from path (first folder before /)
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = (storage.foldername(name))[1]
    AND p."ownerId" = auth.uid()::text
  )
);

-- STORAGE POLICY 2: READ (SELECT)
-- Users can read files from persons they own
CREATE POLICY "Users can read their own person files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = (storage.foldername(name))[1]
    AND p."ownerId" = auth.uid()::text
  )
);

-- STORAGE POLICY 3: UPDATE
-- Users can update metadata of files in their person folders
CREATE POLICY "Users can update their own person files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = (storage.foldername(name))[1]
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = (storage.foldername(name))[1]
    AND p."ownerId" = auth.uid()::text
  )
);

-- STORAGE POLICY 4: DELETE
-- Users can delete files from their person folders
CREATE POLICY "Users can delete their own person files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = (storage.foldername(name))[1]
    AND p."ownerId" = auth.uid()::text
  )
);

-- STORAGE POLICY 5: SERVICE ROLE READ (for server-side signed URLs)
-- Service role can read all files (used by API routes to generate signed URLs)
-- This policy uses the service_role which bypasses RLS by default,
-- but we include it for completeness and future-proofing
CREATE POLICY "Service role can read all files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'documents');

-- ============================================================================
-- PART 3: TABLE RLS POLICIES (Defense-in-Depth)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharePack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharePackItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnalyticsEvent" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Person Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own persons" ON "Person";
DROP POLICY IF EXISTS "Users can insert their own persons" ON "Person";
DROP POLICY IF EXISTS "Users can update their own persons" ON "Person";
DROP POLICY IF EXISTS "Users can delete their own persons" ON "Person";
DROP POLICY IF EXISTS "Service role has full access to persons" ON "Person";

-- SELECT: Users can only view persons they own
CREATE POLICY "Users can view their own persons"
ON "Person" FOR SELECT
TO authenticated
USING (auth.uid()::text = "ownerId");

-- INSERT: Users can only create persons owned by themselves
CREATE POLICY "Users can insert their own persons"
ON "Person" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "ownerId");

-- UPDATE: Users can only update their own persons
CREATE POLICY "Users can update their own persons"
ON "Person" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "ownerId")
WITH CHECK (auth.uid()::text = "ownerId");

-- DELETE: Users can only delete their own persons
CREATE POLICY "Users can delete their own persons"
ON "Person" FOR DELETE
TO authenticated
USING (auth.uid()::text = "ownerId");

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role has full access to persons"
ON "Person" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Document Table Policies (Transitive Ownership via Person)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view documents of their persons" ON "Document";
DROP POLICY IF EXISTS "Users can insert documents for their persons" ON "Document";
DROP POLICY IF EXISTS "Users can update documents of their persons" ON "Document";
DROP POLICY IF EXISTS "Users can delete documents of their persons" ON "Document";
DROP POLICY IF EXISTS "Service role has full access to documents" ON "Document";

-- SELECT: Users can view documents belonging to persons they own
CREATE POLICY "Users can view documents of their persons"
ON "Document" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Document"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- INSERT: Users can create documents for persons they own
CREATE POLICY "Users can insert documents for their persons"
ON "Document" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Document"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- UPDATE: Users can update documents of persons they own
CREATE POLICY "Users can update documents of their persons"
ON "Document" FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Document"."personId"
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Document"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- DELETE: Users can delete documents of persons they own
CREATE POLICY "Users can delete documents of their persons"
ON "Document" FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Document"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- Service role bypass
CREATE POLICY "Service role has full access to documents"
ON "Document" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Observation Table Policies (Transitive Ownership via Person)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view observations of their persons" ON "Observation";
DROP POLICY IF EXISTS "Users can insert observations for their persons" ON "Observation";
DROP POLICY IF EXISTS "Users can update observations of their persons" ON "Observation";
DROP POLICY IF EXISTS "Users can delete observations of their persons" ON "Observation";
DROP POLICY IF EXISTS "Service role has full access to observations" ON "Observation";

-- SELECT: Users can view observations belonging to persons they own
CREATE POLICY "Users can view observations of their persons"
ON "Observation" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Observation"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- INSERT: Users can create observations for persons they own
CREATE POLICY "Users can insert observations for their persons"
ON "Observation" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Observation"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- UPDATE: Users can update observations of persons they own
CREATE POLICY "Users can update observations of their persons"
ON "Observation" FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Observation"."personId"
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Observation"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- DELETE: Users can delete observations of persons they own
CREATE POLICY "Users can delete observations of their persons"
ON "Observation" FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "Observation"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- Service role bypass
CREATE POLICY "Service role has full access to observations"
ON "Observation" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SharePack Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own share packs" ON "SharePack";
DROP POLICY IF EXISTS "Users can insert share packs for their persons" ON "SharePack";
DROP POLICY IF EXISTS "Users can update their own share packs" ON "SharePack";
DROP POLICY IF EXISTS "Users can delete their own share packs" ON "SharePack";
DROP POLICY IF EXISTS "Service role has full access to share packs" ON "SharePack";

-- SELECT: Users can view share packs for persons they own
CREATE POLICY "Users can view their own share packs"
ON "SharePack" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "SharePack"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- INSERT: Users can create share packs for persons they own
CREATE POLICY "Users can insert share packs for their persons"
ON "SharePack" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "SharePack"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- UPDATE: Users can update share packs for persons they own
CREATE POLICY "Users can update their own share packs"
ON "SharePack" FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "SharePack"."personId"
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "SharePack"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- DELETE: Users can delete their own share packs
CREATE POLICY "Users can delete their own share packs"
ON "SharePack" FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Person" p
    WHERE p.id = "SharePack"."personId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- Service role bypass
CREATE POLICY "Service role has full access to share packs"
ON "SharePack" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SharePackItem Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view items in their share packs" ON "SharePackItem";
DROP POLICY IF EXISTS "Users can insert items in their share packs" ON "SharePackItem";
DROP POLICY IF EXISTS "Users can update items in their share packs" ON "SharePackItem";
DROP POLICY IF EXISTS "Users can delete items in their share packs" ON "SharePackItem";
DROP POLICY IF EXISTS "Service role has full access to share pack items" ON "SharePackItem";

-- SELECT: Users can view items in share packs they own
CREATE POLICY "Users can view items in their share packs"
ON "SharePackItem" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "SharePack" sp
    JOIN "Person" p ON p.id = sp."personId"
    WHERE sp.id = "SharePackItem"."packId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- INSERT: Users can add items to share packs they own
CREATE POLICY "Users can insert items in their share packs"
ON "SharePackItem" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "SharePack" sp
    JOIN "Person" p ON p.id = sp."personId"
    WHERE sp.id = "SharePackItem"."packId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- UPDATE: Users can update items in share packs they own
CREATE POLICY "Users can update items in their share packs"
ON "SharePackItem" FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "SharePack" sp
    JOIN "Person" p ON p.id = sp."personId"
    WHERE sp.id = "SharePackItem"."packId"
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "SharePack" sp
    JOIN "Person" p ON p.id = sp."personId"
    WHERE sp.id = "SharePackItem"."packId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- DELETE: Users can delete items from share packs they own
CREATE POLICY "Users can delete items in their share packs"
ON "SharePackItem" FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "SharePack" sp
    JOIN "Person" p ON p.id = sp."personId"
    WHERE sp.id = "SharePackItem"."packId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- Service role bypass
CREATE POLICY "Service role has full access to share pack items"
ON "SharePackItem" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- ShareEvent Table Policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view events for their share packs" ON "ShareEvent";
DROP POLICY IF EXISTS "Service role has full access to share events" ON "ShareEvent";

-- SELECT: Users can view events for share packs they own (read-only)
CREATE POLICY "Users can view events for their share packs"
ON "ShareEvent" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "SharePack" sp
    JOIN "Person" p ON p.id = sp."personId"
    WHERE sp.id = "ShareEvent"."packId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- NOTE: No INSERT/UPDATE/DELETE for users - events are system-generated
-- Service role handles event creation via API

-- Service role bypass
CREATE POLICY "Service role has full access to share events"
ON "ShareEvent" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- DocChunk Table Policies (Transitive via Document → Person)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view chunks of their documents" ON "DocChunk";
DROP POLICY IF EXISTS "Users can insert chunks for their documents" ON "DocChunk";
DROP POLICY IF EXISTS "Users can update chunks of their documents" ON "DocChunk";
DROP POLICY IF EXISTS "Users can delete chunks of their documents" ON "DocChunk";
DROP POLICY IF EXISTS "Service role has full access to doc chunks" ON "DocChunk";

-- SELECT: Users can view chunks of documents they own
CREATE POLICY "Users can view chunks of their documents"
ON "DocChunk" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "DocChunk"."documentId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- INSERT: Users can create chunks for documents they own
CREATE POLICY "Users can insert chunks for their documents"
ON "DocChunk" FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "DocChunk"."documentId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- UPDATE: Users can update chunks of documents they own
CREATE POLICY "Users can update chunks of their documents"
ON "DocChunk" FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "DocChunk"."documentId"
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "DocChunk"."documentId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- DELETE: Users can delete chunks of documents they own
CREATE POLICY "Users can delete chunks of their documents"
ON "DocChunk" FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "DocChunk"."documentId"
    AND p."ownerId" = auth.uid()::text
  )
);

-- Service role bypass
CREATE POLICY "Service role has full access to doc chunks"
ON "DocChunk" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- ChatMessage Table Policies (Direct User Ownership)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own chat messages" ON "ChatMessage";
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON "ChatMessage";
DROP POLICY IF EXISTS "Users can update their own chat messages" ON "ChatMessage";
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON "ChatMessage";
DROP POLICY IF EXISTS "Service role has full access to chat messages" ON "ChatMessage";

-- SELECT: Users can view their own chat messages
CREATE POLICY "Users can view their own chat messages"
ON "ChatMessage" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

-- INSERT: Users can create their own chat messages
CREATE POLICY "Users can insert their own chat messages"
ON "ChatMessage" FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

-- UPDATE: Users can update their own chat messages
CREATE POLICY "Users can update their own chat messages"
ON "ChatMessage" FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- DELETE: Users can delete their own chat messages
CREATE POLICY "Users can delete their own chat messages"
ON "ChatMessage" FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- Service role bypass
CREATE POLICY "Service role has full access to chat messages"
ON "ChatMessage" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TokenUsage Table Policies (Read-only for users, service role manages)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own token usage" ON "TokenUsage";
DROP POLICY IF EXISTS "Service role has full access to token usage" ON "TokenUsage";

-- SELECT: Users can view their own token usage
CREATE POLICY "Users can view their own token usage"
ON "TokenUsage" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

-- NOTE: No INSERT/UPDATE/DELETE for regular users - managed by service role

-- Service role bypass
CREATE POLICY "Service role has full access to token usage"
ON "TokenUsage" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- AnalyticsEvent Table Policies (Read-only for users, service role manages)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own analytics events" ON "AnalyticsEvent";
DROP POLICY IF EXISTS "Service role has full access to analytics events" ON "AnalyticsEvent";

-- SELECT: Users can view their own analytics events
CREATE POLICY "Users can view their own analytics events"
ON "AnalyticsEvent" FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

-- NOTE: No INSERT/UPDATE/DELETE for regular users - managed by service role

-- Service role bypass
CREATE POLICY "Service role has full access to analytics events"
ON "AnalyticsEvent" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 4: PERFORMANCE INDEXES FOR RLS POLICIES
-- ============================================================================

-- Indexes to support RLS policy performance
-- These ensure policy checks don't cause table scans

-- Person.ownerId index (critical for most policies)
CREATE INDEX IF NOT EXISTS idx_person_owner_id ON "Person"("ownerId");

-- Document.personId index (for transitive ownership checks)
CREATE INDEX IF NOT EXISTS idx_document_person_id ON "Document"("personId");

-- Observation.personId index (for transitive ownership checks)
CREATE INDEX IF NOT EXISTS idx_observation_person_id ON "Observation"("personId");

-- SharePack.personId index
CREATE INDEX IF NOT EXISTS idx_sharepack_person_id ON "SharePack"("personId");

-- SharePackItem.packId index
CREATE INDEX IF NOT EXISTS idx_sharepackitem_pack_id ON "SharePackItem"("packId");

-- ShareEvent.packId index
CREATE INDEX IF NOT EXISTS idx_shareevent_pack_id ON "ShareEvent"("packId");

-- DocChunk.documentId index
CREATE INDEX IF NOT EXISTS idx_docchunk_document_id ON "DocChunk"("documentId");

-- ChatMessage.userId index
CREATE INDEX IF NOT EXISTS idx_chatmessage_user_id ON "ChatMessage"("userId");

-- TokenUsage.userId index
CREATE INDEX IF NOT EXISTS idx_tokenusage_user_id ON "TokenUsage"("userId");

-- AnalyticsEvent.userId index
CREATE INDEX IF NOT EXISTS idx_analyticsevent_user_id ON "AnalyticsEvent"("userId");

-- ============================================================================
-- PART 5: VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify RLS policies are active:

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'Person', 'Document', 'Observation', 'SharePack', 'SharePackItem',
  'ShareEvent', 'DocChunk', 'ChatMessage', 'TokenUsage', 'AnalyticsEvent'
)
ORDER BY tablename;

-- View all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check storage bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run the test scenarios in the separate test file
-- 2. Verify your API routes use service role key correctly
-- 3. Test signed URL generation with appropriate expiration times
-- 4. Monitor for any performance issues with RLS policies
-- ============================================================================
