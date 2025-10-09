-- ============================================================================
-- EverMed Summary Table Migration
-- ============================================================================
-- APPLIED TO DEV: 2025-10-09
-- STATUS: ✅ Tested and validated
-- DEPLOYMENT: Manual migration (storage bucket migration blocking Prisma)
-- ============================================================================

-- PART 1: CREATE SUMMARY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Summary" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "documentId" TEXT NOT NULL UNIQUE,
  "userId" TEXT,
  "summaryText" TEXT NOT NULL,
  "structuredJson" JSONB,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Summary_documentId_fkey"
    FOREIGN KEY ("documentId")
    REFERENCES "Document"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Summary_userId_idx" ON "Summary"("userId");

-- PART 2: RLS POLICIES
-- ============================================================================

ALTER TABLE "Summary" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "summary_owner_select" ON "Summary";
DROP POLICY IF EXISTS "summary_owner_mod" ON "Summary";

-- SELECT policy: Users can read summaries for their own documents
-- NOTE: auth.uid() returns UUID, must cast to TEXT to match ownerId type
CREATE POLICY "summary_owner_select" ON "Summary"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "Summary"."documentId"
      AND p."ownerId" = auth.uid()::text
  )
);

-- ALL policy: Users can insert/update/delete summaries for their own documents
CREATE POLICY "summary_owner_mod" ON "Summary"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "Summary"."documentId"
      AND p."ownerId" = auth.uid()::text
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "Summary"."documentId"
      AND p."ownerId" = auth.uid()::text
  )
);

-- PART 3: VERIFICATION (optional, for manual testing)
-- ============================================================================
-- Uncomment to verify deployment:

-- SELECT COUNT(*) as summary_table_exists FROM information_schema.tables WHERE table_name = 'Summary';
-- SELECT COUNT(*) as rls_enabled FROM pg_tables WHERE tablename = 'Summary' AND rowsecurity = true;
-- SELECT COUNT(*) as policies_created FROM pg_policies WHERE tablename = 'Summary';
