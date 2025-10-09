-- Manual migration: Add Summary table
-- Run this in Supabase SQL Editor if formal migration fails

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

CREATE INDEX "Summary_userId_idx" ON "Summary"("userId");

-- RLS Policies
ALTER TABLE "Summary" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "summary_owner_select" ON "Summary"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "documentId" AND p."ownerId" = auth.uid()
  )
);

CREATE POLICY "summary_owner_mod" ON "Summary"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "documentId" AND p."ownerId" = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Document" d
    JOIN "Person" p ON p.id = d."personId"
    WHERE d.id = "documentId" AND p."ownerId" = auth.uid()
  )
);
