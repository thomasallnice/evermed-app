## PR #9 — OCR Worker Integration

### Scope
- Upload API now streams PDFs/images to the Cloud Run OCR extractor configured via `PDF_EXTRACT_URL` (+ bearer/timeout/size envs).
- Extracted text is chunked into `DocChunk` rows immediately after upload for downstream explain/trend workflows.
- Public smoke test (`scripts/smoke-e2e.sh`) continues to validate upload → signed URL → share pack.
- Fixed alias in /api/documents/[id]/route.ts to '@/lib/documents'. Regression test added so '@/src/lib/…' cannot return.

### Environment variables
- `PDF_EXTRACT_URL` — required to enable Cloud Run OCR.
- `PDF_EXTRACT_BEARER` — optional bearer token.
- `PDF_EXTRACT_TIMEOUT_MS` — request timeout (default 20000ms).
- `PDF_MAX_BYTES` — maximum payload size (default 25MB).

### Behavior
- If OCR config is missing or the extractor errors/times out, uploads still succeed and log a warning.
- OCR responses accept both JSON `{ text }` and plain-text payloads.
- Observations/trends unchanged; TODO: feed chunks into embeddings pipeline in later PR.

### TODO
- Evaluate batching/streaming for large documents and integrate with embeddings/indexer.
- Monitor OCR latency + failures in metrics dashboards.
