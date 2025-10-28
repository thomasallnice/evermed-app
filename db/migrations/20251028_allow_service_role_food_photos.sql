-- ============================================================================
-- Allow Service Role to Access Food Photos for AI Analysis
-- Purpose: Gemini API backend needs to fetch images without user auth context
-- ============================================================================

-- Policy: Allow service role to read all food photos (for AI analysis)
DROP POLICY IF EXISTS "Service role can read food photos for AI analysis" ON storage.objects;
CREATE POLICY "Service role can read food photos for AI analysis"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'food-photos');

-- Verify the policy was created
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname = 'Service role can read food photos for AI analysis';
