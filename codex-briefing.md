# 🧠 Evermed.ai — Project Briefing for Codex

---

## 📘 Full App Description

**Evermed.ai** is your AI-powered health companion.  
It helps individuals and families make sense of medical records, track their health history, and communicate more effectively with doctors.

The app combines:
- A **document vault** for storing and organizing all medical files (PDFs, scans, photos, notes)
- A **mobile-first upload interface** with camera or file import
- **Medical AI explanations** powered by GPT-5 and optionally MedGemma (self-hosted)
- A **smart AI chat** that knows the user's history and documents, and can answer questions in natural language
- A **personal health graph** that evolves over time based on documents and user questions
- **Sharing functionality**, to send files or AI-generated reports securely to doctors or caregivers

The core idea:  
👉 Give people back control over their medical data  
👉 Help them **understand**, **organize**, and **share** it using modern AI

Target users include:
- Adults managing their own chronic conditions
- Family caregivers managing documentation for children, partners, or aging parents
- Individuals who are overwhelmed by medical bureaucracy or terminology

**Trust, simplicity, and clarity** are the key UX pillars.

---

## 🛠️ You Are Codex

You are GPT-5 Codex running in Cursor IDE.

You are now responsible for:
- Cleaning up this repo
- Rebuilding the app cleanly
- Using the infrastructure already in place
- Making this maintainable and developer-friendly

You’re allowed to delete, rewrite, and scaffold code as needed.

---

## ✅ Use What Works

Re-use the **existing cloud infrastructure**:

- ✅ GitHub repo (keep history, use clean commits)
- ✅ Supabase  
  - Auth (email/password or magic link)  
  - Storage (docs, images)  
  - Optional: use Postgres for metadata, user graph, and summaries
- ✅ Google Cloud backend (MedGemma endpoint, already deployed)
- ✅ Vercel (frontend deploy, domain set up)
- ✅ `.env` files (already populated in local/dev environments)
- ✅ OpenAI GPT-5 API key (in `.env`)

---

## 🔧 Work Style

Iterate incrementally and keep working features intact:

- ✅ Prefer small, scoped changes over large refactors
- ✅ Reuse existing infrastructure and code where possible
- ✅ Update docs and envs alongside code changes
- ❌ Avoid deleting or overwriting working files unless explicitly required

---

## 🧠 Rebuild This MVP

Rebuild the app with this minimum feature set:

### 1. 📁 Document Vault
- All medical documents in one secure, searchable space
- Each file has metadata: type, upload date, tags
- Timeline view optional

### 2. 📷 Scan & Upload
- Simulated camera for web upload
- Drag & drop / mobile import
- Label document (prescription, lab result, image, etc.)

### 3. 🧠 AI Explanation
- Button to “Explain this document”
- Send file to GPT-5 and return a summary in plain English
- Cache summary per document

### 4. 🤖 AI Chat
- Chat UI, GPT-5 powered
- Multimodal support (image + text input)
- Context = all previous documents, summaries, and chat
- OpenAI only by default; MedGemma disabled to avoid costs

### 5. 📤 Share / Export
- Export documents + summaries as PDF or link
- Send via email (SMTP) or copyable URL

### 6. 👤 Personal Graph
- User model that stores known conditions, medications, questions asked, summaries
- Used to enrich chat context and limit token usage

---

## ⚙️ Dev Strategy

Use:
- ✅ Clean code, no unnecessary dependencies
- ✅ TailwindCSS or minimal component lib
- ✅ Framework: React (if warranted) or HTMX/Vanilla if faster
- ✅ Supabase JS client for auth/storage
- ✅ OpenAI APIs (keep MedGemma disabled by default to avoid costs)

Deliver:
- `index.html` or `pages/`
- `components/`
- `lib/` or `utils/`
- `api/` (if needed)
- `README.md`
- `env.example`

---

## 📄 What To Do First

1. Read this briefing and ensure `app/.env.local` matches `app/.env.example`
2. Start local services: `supabase start` → `supabase db push` (or `db reset` in dev)
3. Run the app: `npm run dev` in `app/`
4. Verify flows: auth → upload → doc explain → chat → share link
5. Iterate with small, focused fixes; update docs if behavior changes

---

## 📚 Documentation Map (Read This First)

- Use `app/docs/` for up‑to‑date, task‑focused docs (e.g., `app/docs/DEPLOY.md`).
- Avoid `docs/archive/` and `app/docs/archive/` — these folders contain historical/outdated docs. Skipping them saves tokens and avoids confusion.
- This briefing is the canonical overview; detailed runbooks live under `app/docs/`.

---

## ✅ Success Criteria

- Clean, working MVP hosted on Vercel
- Auth, storage, and sharing via Supabase
- Clear project structure, easy onboarding
- Future-proofed for mobile + multi-user accounts

---

## 🧭 Final Reminder

- Don’t overwrite working `.env`
- Don’t break infrastructure unless you mean to replace it
- Ask user if unsure about any dependency, secret, or tool
- Your job is to make this project lean, understandable, and production-ready

---

## 🔎 Current State (2025-09)

- Repo structure (workspace):
  - `app/` → Next.js App Router app (source under `src/app`), Tailwind, TypeScript
  - `app/supabase/` → SQL migrations (`migrations/001_mvp.sql`) for documents, summaries, user_graph, shares
  - `web/` → landing (local copy; production lives in separate repo `evermed-landing`)
  - `docs/` → project docs and archive
  - `vercel.json` (root) → builds from `app/`, maps API routes, sets headers

- Environments:
  - Development (local): Supabase Local via CLI (`supabase start`), `.env.local` in `app/`
  - Staging (Preview): domain `staging.evermed.ai` on Vercel
  - Production: domain `app.evermed.ai` on Vercel

- Supabase projects:
  - Staging: `https://jwarorrwgpqrksrxmesx.supabase.co`
  - Production: `https://nqlxlkhbriqztkzwbdif.supabase.co`
  - Local: `http://127.0.0.1:54321` (via Supabase CLI)
  - Storage: bucket `documents` (private) with RLS restricting paths to `${auth.uid()}/...`

- Vercel:
  - Root Directory = repo root (so `vercel.json` is respected)
  - Preview protection: is ON for staging / preview environment; use bypass token for API testing: x-vercel-protection-bypass
  - Removed stale `app/vercel.json` (old `frontend` path)
  - Staging/Production: set envs per environment; apply Supabase migrations (001–010) to respective DBs; rotate extractor bearer tokens; verify flows before promotion

- AI providers:
- OpenAI: primary provider in all environments (if `OPENAI_API_KEY` set)
  - MedGemma (Hugging Face Endpoints): disabled by default to avoid costs
    - No automatic fallback; UI selection is hidden for non‑paying users
    - Do not warm endpoints by default; enable checks only when explicitly needed
  - See `openAI-models.md` for model selection, API usage patterns (Responses API vs Chat Completions), and parameter compatibility notes (e.g., max_tokens vs max_completion_tokens, temperature).

- App features implemented:
  - Vault, Upload (Supabase Storage), Document view with "Explain", Share link creation and viewing
  - Chat `/api/chat`: OpenAI only (no MedGemma fallback), lightweight user context from Supabase (recent docs/summaries/graph)
  - Chat history persists per user in Supabase (`chat_messages`)
  - Chat UI: ChatGPT‑like layout with sticky input, rich Markdown (typography plugin), inline citations [n] rendered as subtle superscripts and clickable (linking to `/doc/:id#c{index}`), inline source pills (no border) linking to `/doc/:id`, stop + Shift+Enter send, auto‑scroll during generation, copy buttons on code blocks
  - Chat attachments: paperclip/plus icon to upload document from chat (stored in Vault, signed preview shown inline); triggers RAG ingest with toast status (Uploaded → Indexing… → Indexed/failed)
  - Uploads: auto‑Explain + auto‑RAG ingest after a successful upload; redirects to the document page
  - Mobile first: responsive chat footer with growing input, compact options panel on small screens; controls in footer on desktop
  - Explain `/api/explain`: OpenAI only; caches summary in `summaries` and persists structured JSON
  - Cached text extraction stored in `doc_texts` to avoid re-parsing PDFs/text
  - RAG ingest + status endpoints; retrieval with citations; chunk dimension guarded to 1536
  - Dev status page `/dev` + API `/api/dev/status` to view extractor health, RAG counts, and model/env flags
  - Vault supports document deletion (removes Storage object and cascades DB rows)

---

## 🔐 Environment Variables

Refer to `app/.env.example` for the authoritative list, defaults, and comments. Keep server secrets out of `NEXT_PUBLIC_*` variables. For Vercel Preview protection testing, see "Preview Protection Bypass (Vercel)" below. For OpenAI model specifics and supported parameters, see `openAI-models.md`.

---

## 🗄️ Supabase Storage RLS (bucket `documents`)

Run in each project (Staging/Prod) to enforce per-user paths:

```sql
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_auth_select_own" on storage.objects;
drop policy if exists "documents_auth_insert_own" on storage.objects;
drop policy if exists "documents_auth_update_own" on storage.objects;
drop policy if exists "documents_auth_delete_own" on storage.objects;

create policy "documents_auth_select_own" on storage.objects
for select to authenticated
using (bucket_id='documents' and name like auth.uid()::text || '/%');

create policy "documents_auth_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id='documents' and name like auth.uid()::text || '/%');

create policy "documents_auth_update_own" on storage.objects
for update to authenticated
using (bucket_id='documents' and name like auth.uid()::text || '/%')
with check (bucket_id='documents' and name like auth.uid()::text || '/%');

create policy "documents_auth_delete_own" on storage.objects
for delete to authenticated
using (bucket_id='documents' and name like auth.uid()::text || '/%');
```

---

## 🔧 Operational Tips

- MedGemma endpoints are disabled by default to avoid costs; do not warm them unless explicitly testing paid features.
- In Preview, if testing via curl/clients with protection enabled, first set bypass cookie via URL once, then call APIs.
- Local dev: `supabase start` → `supabase db reset` applies the migrations under `app/supabase/migrations/` (001, 002, …).

### Preview Protection Bypass (Vercel)

- Get a bypass token: Vercel → Project → Settings → Deployment Protection → Bypass Tokens.
- Browser (one-time cookie):
  - `https://<staging-domain>/<path>?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=<TOKEN>`
- CLI header:
  - `-H 'x-vercel-protection-bypass: <TOKEN>'`
- Optional (Preview only): add `VERCEL_BYPASS_TOKEN` to Vercel for CI/manual tests. Never expose via `NEXT_PUBLIC_*` or commit it.
- Rotate tokens periodically and avoid logging them.

---

## 🧑‍💻 Engineering Handoff (Quick Map)

- Codebase Map:
  - Frontend: `app/src/app` (Next.js App Router, TypeScript, Tailwind)
  - API routes:
    - Chat (non‑stream compatibility): `app/src/app/api/chat/route.ts`
    - Chat (Responses API + streaming): `app/src/app/api/chat/stream/route.ts`
    - Explain (document summaries): `app/src/app/api/explain/route.ts`
    - RAG ingest: `app/src/app/api/rag/ingest/route.ts`
    - RAG status: `app/src/app/api/rag/status/route.ts`
    - Share links: `app/src/app/api/share/route.ts`
    - Health: `app/src/app/api/health/route.ts`
  - Supabase migrations: `app/supabase/migrations` (001 base schema, 002 RAG, 003 vector dim fix, 004 storage policies)

- AI/Chat Behavior:
  - Primary uses OpenAI Responses API with optional streaming; prepends RAG snippets + profile context.
  - Streaming is controlled by `OPENAI_STREAM`. If upstream streaming is unavailable, the route retries without streaming and returns full text.
  - Non‑stream route adapts `max_tokens → max_completion_tokens` and temperature 0.3 → 1 → omit when necessary.
  - Streaming-threading: server extracts the Responses id early from SSE and exposes `X-Responses-Id`; the client saves it and sends `previous_response_id` next turn.
  - Per‑user streaming default is stored in `user_graph.streaming_default` and loaded on `/chat`.
  - For model selection, streaming, and parameter semantics, see `openAI-models.md`.
  - External extractor: If local PDF parsers extract no text, the app can POST PDF bytes to a Cloud Run service (`PDF_EXTRACT_URL`) protected by a Bearer token (`PDF_EXTRACT_BEARER`).

- RAG Details:
  - Schema (`002_rag.sql`) defines `rag_documents`, `rag_chunks` with `vector(1536)` embeddings; functions: `upsert_rag_document`, `insert_rag_chunk`, `match_rag_chunks` (cosine).
  - `003_fix_rag_vector_dim.sql` enforces `vector(1536)` to avoid “Invalid array length”.
  - Ingest supports text/rtf/pdf; chunking avoids overlap loops; tokens approximated by `length/4`.
  - Retrieval embeds the query, calls `match_rag_chunks`, and formats numbered citations; answers append a final “Sources:” list with `[n] filename (#chunk)`.
  - PDFs: server downloads from Storage and extracts text (pdf-parse). If that fails and `PDF_EXTRACT_URL` is set, a Cloud Run extractor is used. Scanned PDFs use OCR fallback (ocrmypdf + tesseract) in the extractor. Note: pdfjs-dist fallback is disabled in serverless to avoid native canvas dependency.
  - Source linking: server returns `SOURCES_JSON` with `[i,file,chunk,docId]`. UI renders only pills (no textual Sources). Clicking a pill or citation [n] navigates to `/doc/:docId#c{i}`, where the document page highlights that chunk snippet.

- Storage + RLS:
  - Bucket `documents` (private). Object keys must be `${auth.uid()}/...`.
  - `004_storage_documents.sql` creates bucket + per‑user select/insert/update/delete policies.
  - APIs read bytes from Storage with the service role key server‑side (never exposed). Explain verifies the document row via RLS before reading.

- Environment & Secrets:
  - Configure per `app/.env.example`. Key vars: Supabase (URL/ANON/service role), OpenAI (API key; optional `OPENAI_ORG_ID`/`OPENAI_PROJECT_ID`), `OPENAI_STREAM`.
  - Never expose server secrets via `NEXT_PUBLIC_*`.

- Dev Workflow:
  - `supabase start` → `supabase db push` (or `db reset` locally)
  - `npm run dev` in `app/`
  - Health: `GET /api/health`
  - RAG: upload → Doc → “Rebuild RAG” → check chunks
  - Chat: `/chat` → Provider “OpenAI only” (MedGemma disabled)

---

## 🗂️ Project Planning

- The living iteration plan, current work, and near‑term roadmap are maintained in `project_plan.md`. Use that file for sprint planning and task status.

---

## 🌍 Environments (Extractor)

- Region: europe‑west3 (Frankfurt) for GDPR alignment.
- Recommended: one Cloud Run extractor per environment (dev/staging/prod), each with its own `EXTRACT_BEARER` and URL.
- App envs (`app/.env.*` or Vercel):
  - `PDF_EXTRACT_URL` – e.g., `https://pdf-extractor-<env>-….europe-west3.run.app/extract`
  - `PDF_EXTRACT_BEARER` – strong per‑env secret
  - `PDF_EXTRACT_TIMEOUT_MS` – e.g., `20000`
  - `PDF_USE_PDFJS_FALLBACK` – optional local fallback (off by default)

---

## 🧪 Troubleshooting

- Chat streaming shows no tokens: confirm `OPENAI_STREAM=true` and check `/api/health`. If headers include `X-OpenAI-Stream: false`, the API auto‑fell back; try again or test with non‑stream.
- “Failed to fetch” in browser on Explain/RAG: indicates a network error (dev server restarting or route crash). Try again; then check terminal logs and call the route via curl to get a JSON error.
  - `curl -sS -H 'Content-Type: application/json' -d '{"documentId":"<ID>"}' http://localhost:3000/api/explain | jq .`
  - `curl -sS -H 'Content-Type: application/json' -d '{"documentId":"<ID>"}' http://localhost:3000/api/rag/ingest | jq .`
- PDFs with selectable text but no summary/indexing: the API uses pdf-parse and, if needed, the external extractor. If still no text, the PDF may have unusual encoding; share the API’s JSON for targeted fixes. Scanned PDFs are handled by OCR in the extractor.

- Known Gotchas (handled):
  - Streaming may be org/model‑gated; API falls back to non‑stream.
  - React Strict Mode can double‑invoke in dev; chat UI uses a buffered, idempotent append.
  - “Invalid array length” on RAG means embedding dimension mismatch; apply migrations 002+003.

---

## 🚀 Deploy Checklist (Staging → Production)

Use this to avoid common pitfalls when promoting builds.

1) Branches & Domains
- Preview (staging.evermed.ai) → staging branch (or Latest Preview).
- Production (app.evermed.ai) → main branch.

2) Environment Variables (Preview & Production)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- OpenAI: `OPENAI_API_KEY` (+ optional `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`).
- Extractor: `PDF_EXTRACT_URL` (ends with `/extract`), `PDF_EXTRACT_BEARER` (no quotes), `PDF_EXTRACT_TIMEOUT_MS`.
- Limits/flags: `PDF_MAX_BYTES` (e.g., `50000000`), `OPENAI_STREAM=true|false`.
- Preview protection: `VERCEL_BYPASS_TOKEN` (Preview only; never public).

3) Database & Storage
- Apply migrations 001–010 to the target environment (staging, then production).
- Confirm bucket `documents` exists with RLS policies.

4) Build & Env Refresh
- Any env change requires a new deployment. Ensure Preview gets a new build (don’t reuse previous build).
- Verify with `/api/dev/status?ts=<now>` (use bypass cookie/header in Preview):
  - `deployment.vercelEnv` is correct, `extractor.max_bytes_raw` matches expected, ping OK.

5) QA Flow
- Login → Upload → Explain → Rebuild RAG → Chat → Attach doc → click citation → `/doc/:id#c{index}` shows snippet.
- Mobile UI: footer input grows, options (⋯) on small screens.

6) Post‑Promotion
- Remove `PDF_DEBUG` from Preview.
- Rotate extractor tokens as needed; re‑enable Preview protection.


## 🗺️ Execution Plan (MVP → Prod)

1) Repository hygiene
- Remove legacy configs, ensure `vercel.json` (root) is sole deploy config
- Keep `app/src/app` structure, `docs/` archive tidy

2) Environment matrix
- Local: Supabase Local + `.env.local`
- Preview (staging.evermed.ai): set Supabase (staging), OpenAI key, MedGemma vars; enable protection
- Production (app.evermed.ai): set Supabase (prod), OpenAI key, MedGemma vars

3) Database + Storage
- Apply `001_mvp.sql` in staging → verify → then production
- Create `documents` bucket + RLS in both envs

4) App features hardening
- Chat uses OpenAI only (no MedGemma fallback)
- Add `/api/health` to check Supabase; MedGemma checks remain opt‑in
- When introducing paid plans, re‑enable MedGemma selection in Chat for paying users only

5) QA on Preview
- Auth → upload → vault → doc explain → chat → share link
- Verify summaries caching and share-token expiry

6) Promote to Production
- Promote green Preview or merge `staging` → `main`
- Re-verify key flows on `app.evermed.ai`

7) Post-launch
- Re-enable Preview protection; rotate bypass tokens
- Enable Supabase backups/PITR in Prod; add monitoring/alerts

---

## ✅ Next Steps (Contributor Checklist)

- Dev setup: copy `app/.env.example` → `app/.env.local`; fill Supabase + OpenAI keys; set `OPENAI_STREAM=true|false`.
- Start stack: `supabase start` → `supabase db push` (or `db reset` for a clean local DB).
- Run app: `npm run dev` from `app/`.
- Verify flows: login → upload → doc view → Explain → Rebuild RAG → Chat.
- Sanity: `GET /api/health`; confirm RAG shows “Indexed chunks: > 0” after ingest.
- For model and streaming questions, read `openAI-models.md`.

---

## 🔭 Roadmap (What We’ll Do Next)

- Chat quality and cost
  - Add `previous_response_id` threading to reuse reasoning across turns (lower tokens/latency).
  - Optional user toggle for streaming, persisted per user.
  - Add minimal rate limiting + usage counters with a tiny UI indicator.

- Explain robustness
  - Structured outputs (JSON Schema) for Explain (title, key points, risks, next steps) with caching keyed by doc hash.

- RAG improvements
  - Show top‑k snippets with citations inline in Chat answers.
  - Batch chunk inserts + partial failure tolerance; clearer indexing state.
  - Optional embeddings fallback provider (config only).

- Reliability & DX
  - Add basic integration tests for chat/explain/rag and a schema guard for `vector(1536)`.
  - Expand `/api/health` to probe embeddings + DB connectivity.
  - Add lightweight telemetry (counts, p95 latency, error rate) surfaced on `/dev`.

- Security & sharing
  - Revoke share links; optional password on shares; server‑enforced TTL.

- Product polish
  - Vault filters/tags; richer previews for PDFs/images.
  - Profile editor for conditions/medications to enrich context.
