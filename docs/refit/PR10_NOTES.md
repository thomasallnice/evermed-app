## PR #10 — Embeddings & Semantic Retrieval

### Scope
- Added pgvector-backed `embedding` column to `DocChunk` and store OpenAI embeddings for OCR chunks at upload time.
- Introduced `lib/embedding.ts` + `lib/ocr.ts` integration so extracted text is chunked, embedded, and persisted.
- Chat `/api/chat` now performs semantic retrieval (`embedding <->`) with fallback to recent chunks.
- Added retrieval helpers to support future trends context lookups.
- Corrected alias in /api/documents/[id]/route.ts to '@/lib/documents' and added regression + lint guard to prevent '@/src/lib/…' from returning.
- Reapplied SharePackItem nested create fix so packs persist linked documents/observations.

### Environment
- Requires `OPENAI_API_KEY` (and optional `OPENAI_BASE_URL`, `EMBEDDINGS_MODEL`).
- OCR envs (`PDF_EXTRACT_URL`, `PDF_EXTRACT_BEARER`, `PDF_EXTRACT_TIMEOUT_MS`, `PDF_MAX_BYTES`) remain required for text extraction.

### Error handling
- Uploads succeed even if OCR or embeddings fail: warnings logged, chunks stored without embeddings.
- Retrieval falls back to recency if embeddings missing.

### TODO
- Batch embeddings with better token counting, pipeline to indexer.
- Trend APIs to utilize `retrieveChunksByCode` once UI wiring lands.

### Next Steps
- Deploy PR #10 stack to staging + production; run smoke script in each environment.
- Polish UI flows (upload, vault, chat, trends, share pack viewer).
- Plan real-life pilot / internal dogfooding to collect feedback.
