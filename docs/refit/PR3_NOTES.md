## PR #3 — Upload & OCR + provenance anchors

### Overview
- Endpoints:
  - POST `/api/uploads` — accepts `multipart/form-data` with `file` and `personId`; stores in Supabase Storage (private `documents` bucket), creates `Document` row, enqueues OCR job; returns `{ documentId }`.
  - GET `/api/documents/:id` — returns metadata + signedUrl (server-side via service role). Requires owner; in MVP tests, user id is provided as `x-user-id` header.

- Workers (apps/workers/ocr):
  - Provider interface `OcrProvider { extract(storagePath): Promise<OcrResult> }`.
  - Default `StubOcrProvider` returns deterministic text anchors for fixtures (e.g., `sample_cbc.pdf`). TODO: integrate Tesseract (WASM/container) in a future PR.
  - On completion, persists `DocChunk` rows: `{ documentId, chunkId, text, sourceAnchor }`. `embedding` remains NULL.

### Anchor format
- `sourceAnchor`: `p{page}.l{line}` (1-based page/line indices). Example: `p1.l2`.
- This enables Explain/Chat to cite the exact text line in the source document.

### TODOs / Follow-ups
- Replace `x-user-id` header with Supabase SSR auth in API routes (server-side session) and ensure RLS is enforced end-to-end.
- Wire OCR job to Vercel background/queue or Supabase Functions for better isolation; keep inline processing for MVP.
- Integrate real OCR provider (Tesseract or external) with EU data residency considerations.

