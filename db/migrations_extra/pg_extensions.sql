-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure DocChunk.embedding exists as pgvector(1536)
ALTER TABLE "DocChunk" ADD COLUMN IF NOT EXISTS embedding vector(1536);

