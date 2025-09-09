# EverMed — Iteration Plan

Use this document to track progress. Mark tasks as done: `[x]` or `[ ]`.

## Current Work (active)

- [x] Chat: Responses API streaming + non‑stream fallback (robust SSE parsing)
- [x] Chat: UI streaming toggle; single‑flight guard; idempotent updates
- [x] Chat: previous_response_id threading for non‑stream requests
- [x] Chat: persist chat history per user (Supabase)
- [x] Chat UI: ChatGPT‑like layout, sticky input, markdown formatting
- [x] Chat UI: Inline source pills only (no textual Sources)
- [x] Chat UX: Stop streaming, Shift+Enter send, toast upload/index, auto‑scroll
- [x] Chat: attachment uploads (adds to Vault), icon button, inline preview in chat
- [x] Chat: provider/streaming controls moved to footer
- [x] Doc view: highlight specific chunk via /doc/:id#c{index}
- [x] Mobile-first UI pass (responsive chat footer, input grows, mobile options panel)
 - [x] Uploads: auto‑Explain + auto‑RAG ingest; redirect to doc page
- [x] Code: Copy buttons on code blocks
- [x] Explain: structured outputs (JSON Schema) for text inputs; UI rendering
- [x] PDF: server-side download from Storage; pdf-parse + pdfjs-dist fallback (Explain + RAG)
 - [x] PDF: simplify fallback (pdfjs-dist removed to avoid canvas; rely on pdf-parse + external extractor)
- [x] RAG: schema + dim fix (vector(1536)); safer chunking
- [x] Storage: bucket + RLS policies migration
- [x] Chat: show top‑k RAG snippet citations inline ("Sources:" block)
- [x] Dev: `/dev` page with health, sample actions, metrics
 - [x] External PDF extraction (Cloud Run) — scaffold + deploy (dev), wired via `PDF_EXTRACT_URL`
 - [ ] Add extractor envs to Vercel (Preview/Production)
 - [ ] Rotate PDF extractor bearer token (shared previously)

### Blocking Issue – PDF extraction variance (dev)

- Symptom:
  - Explain → 422: `no extractable text from PDF (likely scanned). OCR not enabled.`
  - RAG ingest → `{ "skipped": true, "reason": "no text from document" }`
  - Example doc_id: `bd915e45-88ad-435b-b692-808653d157ec`
- Status:
  - Local parsers (pdf-parse, optional pdfjs-dist) returned empty text for this PDF.
  - External extractor (Cloud Run) returned text when called directly via curl (OK).
  - App calls to extractor initially returned 401 Unauthorized (bearer mismatch), hence fallback never produced text.
  - Added `PDF_DEBUG=true` path to expose upstream status/body for faster diagnosis.
- Next diagnostics:
  1) Align `PDF_EXTRACT_BEARER` in app with Cloud Run `EXTRACT_BEARER` (use `gcloud run services describe … | jq`).
  2) Keep `PDF_DEBUG=true` temporarily; re-run `/api/explain` and `/api/rag/ingest` for the doc to confirm 200 from extractor.
  3) Ensure `PDF_MAX_BYTES` comfortably exceeds the file size (e.g., 50MB).
- Remediation options:
  - If extractor returns text: app should return 200 (Explain) and index chunks (RAG) once bearer matches.
  - If extractor also returns empty: extend extractor with OCR (tesseract) as last resort for this PDF.
  - Add caching (doc_texts) once text exists to avoid re-parsing.
  - [x] Added OCR fallback to extractor (ocrmypdf + tesseract)

## Near‑Term (1–2 weeks)

- Chat quality & cost
  - [x] Threading for streaming path (capture Responses id via SSE; UI stores)
  - [x] Per‑user preference for streaming (persisted); default from env
  - [ ] Minimal rate limiting + usage counters; show in UI
  - [ ] Multi‑thread chat (named threads), sidebar history

- Explain robustness
  - [x] Persist structured JSON alongside summary_text (optional column)
  - [ ] Copy/Download summary; last updated timestamp

- RAG improvements
  - [ ] Batch chunk inserts + progress
  - [ ] UI: indicate indexed chunks and last index time
  - [ ] OCR pipeline for scanned PDFs (Cloud Run microservice with Tesseract); API fallback when no text
  - [x] Cache extracted text to avoid re-parsing (Explain/RAG)

- Reliability & DX
  - [ ] `/api/health`: add embeddings + DB probe details
  - [ ] Integration tests for chat/explain/rag; schema guard for vector(1536)

- Security & sharing
  - [ ] Revoke share links; optional password; server‑enforced TTL

## UX/UI — Vault & Upload

- [ ] Vault: grid/list toggle
- [ ] Vault: search + type filter + sort
- [ ] Vault: file-type icons and quick preview
- [ ] Upload: drag & drop, progress, error states
- [ ] Post‑upload tagging and quick edit
- [x] Vault: delete document action (removes storage + cascades DB)
 - [x] Vault: polish Delete button (subtle, outline style)

## Release

- [ ] Staging QA (staging.evermed.ai)
- [ ] Promote to Production (app.evermed.ai)
- [ ] Re‑enable Preview protection and rotate tokens
 - [ ] Provision extractor services per env (staging/prod) in europe‑west3 and set Vercel envs
 
### Deploy Status (2025‑09‑08)

- [x] Supabase migrations applied
  - [x] Staging (Preview) — 001–010 applied
  - [x] Production — 001–010 applied (confirmed by user)
- [x] Vercel configuration validated
  - [x] Project root uses root `vercel.json` (builds `app/`)
  - [x] `staging.evermed.ai` → Preview environment (branch: `development` or alias `staging`)
  - [x] `app.evermed.ai` → Production environment
  - [x] Env vars set per environment (Supabase, OpenAI, PDF_EXTRACT_*)
- [x] Build fix: remove `pdfjs-dist` fallback to avoid native `canvas` in serverless
 - [x] Added Preview bypass helper `/api/dev/bypass` and cache‑clear `/api/dev/cache-clear`
 - [x] Staging now serves latest build; Explain works with extractor

### Staging QA Checklist

- [ ] Auth flow works; email shows in ☰ on mobile, header on desktop
- [ ] Upload → documents stored in `documents` bucket (RLS ok)
- [ ] Explain returns summary; `summaries.structured_json` populated
- [ ] Rebuild RAG indexes; `rag_chunks` count increases
- [ ] Chat streaming, citations [n] clickable; inline source pills link to `/doc/:id#c{index}` and snippet highlights
- [ ] Attach doc from chat; toast shows Uploaded/Indexing/Done; attachment persists in history
- [ ] Mobile footer layout OK; options panel (⋯) toggles provider/streaming

### Production Cutover Plan

1) Ensure Production env vars match staging (prod keys/URLs)
2) Smoke test Production deploy on preview alias (or promote green preview)
3) Rotate EXTRACT_BEARER in Cloud Run + Vercel
4) Re‑enable Preview protection tokens
5) Monitor `/api/health` and `/dev` for errors

### Publish Plan

1) Staging (Vercel Preview)
 - Root dir: repo root (uses root vercel.json, builds app/)
 - Env vars (Preview):
   - NEXT_PUBLIC_SUPABASE_URL = (staging)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (staging anon)
   - SUPABASE_SERVICE_ROLE_KEY = (staging service)
   - OPENAI_API_KEY, OPENAI_ORG_ID/PROJECT_ID (optional)
   - OPENAI_STREAM = true|false
   - PDF_EXTRACT_URL / PDF_EXTRACT_BEARER / PDF_EXTRACT_TIMEOUT_MS
   - PDF_USE_PDFJS_FALLBACK=false (or as needed)
 - Apply DB migrations to staging: `supabase db push` (or run SQL via SQL editor) for 001–010
 - Verify flows on staging: login → upload → explain → rebuild RAG → chat (attachments) → snippet link

2) Production
 - Promote green preview or merge staging → main
 - Set Production env vars analogous to staging
 - Apply migrations to production (001–010) after backup/PITR enabled
 - Rotate extractor bearer tokens
 - Post‑deploy smoke tests; re‑enable Preview protection

## Notes

- Envs documented in `app/.env.example` and `codex-briefing.md`
- Model/streaming details in `openAI-models.md`
- Supabase storage RLS SQL in `codex-briefing.md`
 - External extractor scaffold in `extractor/pdf-extractor/` (FastAPI + Poppler). Deployed: dev in europe‑west3 (Frankfurt).
