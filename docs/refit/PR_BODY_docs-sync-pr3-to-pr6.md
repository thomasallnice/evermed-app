Title: docs: sync Ground Truth for PRs #3–#6; add Cloud Run extract + RLS dev note; clarify pgvector

Summary
- Aligns Ground Truth docs with current state where PRs #3–#6 are merged.
- Clarifies DocChunk embedding type to reflect pgvector via raw SQL migration.
- Documents Cloud Run PDF extractor integration (optional) for Explain/RAG/OCR.
- Notes RLS bypass in dev/test for `/api/uploads` until Auth is wired.
- No app code changes; docs and env templates only.

Changes
- docs/CODEX_REFIT_PLAN.md
  - DocChunk `embedding` set to `Unsupported('vector')? // vector(1536) added via raw SQL migration`.
  - Added “Dev note” under Storage/RLS about using service-role client in dev/test for uploads until Auth+RLS is implemented.
  - Added Cloud Run extractor envs: `PDF_EXTRACT_URL`, `PDF_EXTRACT_BEARER`, `PDF_EXTRACT_TIMEOUT_MS`, `PDF_MAX_BYTES`, `PDF_USE_PDFJS_FALLBACK`. Local OCR worker remains for provenance anchors.
  - API contract now lists full Share Pack suite (create, verify, view-only-selected-items, revoke, logs).

- docs/BOOTSTRAP_PROMPT.md
  - Updated Stacked-PR status: PR #1, #2, #2.1, and #3–#6 merged. Next: PR #7 — Trend Views (labs, timelines).
  - Added guardrail bullet about `/api/uploads` service-role client in dev/test (TODO: replace with Supabase Auth + RLS).

- apps/web/.env.example
  - Appended a commented “Cloud example” block for Supabase Cloud URL/Anon key without changing local defaults.

- .env.example (root)
  - Ensured presence of required envs: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SHARE_LINK_PEPPER`, `SUPABASE_DB_URL`, `DATABASE_URL=${SUPABASE_DB_URL}`, `OPENAI_API_KEY`, and PDF extractor envs.

Why
- Docs were still reflecting pre-PR #3–#6 state. This syncs Ground Truth so onboarding and bootstrap prompts match the implemented features and dev workflow.

Notes
- RLS dev bypass remains temporary; replace with Supabase Auth + RLS when auth flows are wired.
- Cloud Run extractor is optional; local OCR worker remains for anchor generation.

