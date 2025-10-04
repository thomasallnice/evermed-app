-- AlterTable: Add unique constraint to Person.ownerId
-- This ensures one Supabase user can only have one Person record
CREATE UNIQUE INDEX "Person_ownerId_key" ON "Person"("ownerId");

-- AlterTable: Fix DocChunk foreign key to add CASCADE delete
-- This allows documents to be deleted when they have chunks
ALTER TABLE "DocChunk" DROP CONSTRAINT "DocChunk_documentId_fkey";
ALTER TABLE "DocChunk" ADD CONSTRAINT "DocChunk_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
