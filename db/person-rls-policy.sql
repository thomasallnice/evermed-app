-- ============================================================================
-- RLS Policy for Person Table
-- Purpose: Allow users to read their own Person record
-- Required for: Frontend queries to fetch personId for storage operations
-- ============================================================================

-- Enable RLS on Person table
ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT their own Person record
CREATE POLICY "Users can view own person record"
ON "Person"
FOR SELECT
USING ("ownerId" = auth.uid()::text);

-- Verification query
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'Person'
ORDER BY policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This policy allows authenticated users to query their own Person record
--    by matching Person.ownerId with auth.uid()
--
-- 2. Required for upload flow:
--    - User logs in → auth.uid() established
--    - Upload page queries: SELECT id FROM Person WHERE ownerId = auth.uid()
--    - Uses personId in storage path: {personId}/{filename}
--
-- 3. Without this policy:
--    - Supabase REST API returns 403 Forbidden
--    - Upload fails with "Person record not found"
--
-- 4. Security:
--    - Users can ONLY read their own record (ownerId = auth.uid())
--    - No cross-user access possible
--    - No INSERT/UPDATE/DELETE policies (use API routes for modifications)
-- ============================================================================
