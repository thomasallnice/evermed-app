ALTER TABLE "DocChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);
