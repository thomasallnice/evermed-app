# Troubleshooting (LLM‑Friendly)

Concise fixes for common issues. Use curl with a bypass header in Preview.

## Preview Protection (401 / HTML)
- Symptom: jq parse error; HTML “Authentication Required”.
- Fix: set bypass cookie (browser) or header (curl):
  - Cookie: `https://<staging>/api/health?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=<TOKEN>`
  - Header: `-H "x-vercel-protection-bypass: <TOKEN>"`
- Helper routes: `/api/dev/bypass` (sets cookie), `/api/dev/cache-clear`.

## Env Changes Not Applied
- Symptom: `/api/dev/status` shows old values (e.g., extractor.max_bytes=25000000).
- Fix: create a **new** Preview build (don’t reuse previous build). If staging domain is pinned to a branch, push an empty commit to that branch. Cache‑bust status with `?ts=<now>`.

## Extractor 401/404/5xx
- 401 → bearer mismatch. Ensure Cloud Run `EXTRACT_BEARER` equals `PDF_EXTRACT_BEARER` (no quotes) in Vercel.
- 404 on ping is OK for GET; ensure POST URL ends with `/extract`.
- Verify with direct curl:
```
export TOKEN='<EXTRACT_BEARER>'
curl -i -H 'Content-Type: application/pdf' -H "Authorization: Bearer $TOKEN" --data-binary @/path/to/sample.pdf 'https://pdf-extractor-<env>…/extract'
```
- OCR for images requires tesseract; deploy the updated extractor image (see README).

## RAG: Indexed chunks = 0
- Check ingest with debug (Preview only):
```
curl -sS -H "x-vercel-protection-bypass: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"documentId":"<ID>"}' https://<staging>/api/rag/ingest | jq .
```
- If `skipped` with debug:
  - size > maxBytes → increase `PDF_MAX_BYTES` and redeploy Preview.
  - extractorTried=false → verify extractor settings.
  - extractorStatus=401 → bearer mismatch.
  - extractorLen>0 but still no text → open a ticket; consider forcing extractor text path.
- PDFs without .pdf or generic MIME are sniffed via magic bytes in ingest (fixes most “non-text/pdf”).

## Migrations & Vector Issues
- “Invalid array length”: ensure migrations 002 + 003 applied, and `OPENAI_MODEL_EMBED` dimension is 1536.
- Do not run 001 on live DBs (it drops tables). Use 002+ only.

## Caching / CDN
- Always add `?ts=<now>` to `/api/dev/status` during validation.
- Use `/api/dev/cache-clear` as a convenience redirect.

## Chat / Streaming
- No tokens streaming: ensure `OPENAI_STREAM=true`. If upstream doesn’t stream, API falls back to non‑stream mode.

