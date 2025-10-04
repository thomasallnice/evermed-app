# EverMed.ai — Codex Bootstrap Prompt

> Use this document to (re)brief Codex in a new chat so it fully understands the product, the current repo setup, and the stacked-PR workflow. It is the single source of truth for how Codex should proceed.

## Ground Truth (read these first)

1. `/docs/project-description.md` — product, scope, safety and metrics.
    
2. `/docs/CODEX_REFIT_PLAN.md` — architecture, APIs, repo layout, tests, and quality gates.
    
3. `/docs/refit/PR2_MIGRATION_NOTES.md` — Supabase **Cloud** usage (dev/staging/prod), CI setup, extensions/RLS application.
    

## Working Contract (10 points)

1. **MVP mode: Option A (non-SaMD)** — no diagnosis/dosing/triage; no automated image grading. Source every medical claim to user docs.
    
2. **Hero flow:** **Appointment Pack** (passcode, 7-day expiry, view logs, revoke, limited scope).
    
3. **Security defaults ON:** app lock required; TLS; at-rest encryption; private storage with **signed URLs** only.
    
4. **Provenance required** in Explain/Chat (doc + anchor). Latency p95 < 10s for 3-page OCR+Explain.
    
5. **Interoperability:** FHIR/gematik-aligned minimal model; no ePA write-back in MVP.
    
6. **Environment split:** Local dev = Next.js/API only. **Supabase Cloud** = DB/Auth/Storage for dev/staging/prod. Hosting via Vercel. CI uses `SUPABASE_DB_URL`; no local Postgres services.
    
7. **Repo layout:** `/apps/web`, `/apps/workers`, `/packages/*`, `/db`, `/tests`, `/infra`, `/docs`. Remove code outside this plan unless explicitly referenced.
    
8. **APIs (App Router):** uploads, documents, explain, chat (with citations/refusals), observations, share-packs (verify/revoke/logs), admin metrics; plus webhooks for processing/usage.
    
9. **Analytics (no PHI):** exact events & token logging per plan; Admin Dashboard tiles per metrics spec.
    
10. **Quality gates in CI:** tests pass; citations present; latency budget met; RLS blocks cross-user access; storage is private; no PHI in logs/analytics.
    

## Environment & Secrets

- **Vercel Project Env:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PDF_EXTRACT_URL`, `PDF_EXTRACT_BEARER`, `PDF_EXTRACT_TIMEOUT_MS`, `PDF_MAX_BYTES`, `OPENAI_API_KEY`, (optional) `OPENAI_BASE_URL`, `EMBEDDINGS_MODEL`.
    
- **GitHub Secrets (CI):** `SUPABASE_DB_URL` (Cloud dev DB connection), `SUPABASE_SERVICE_ROLE_KEY`.
    
- **.env.example** keeps only Supabase Cloud vars (no local Postgres).
    

## Repo & Branch Health (print first)

When this prompt runs, **first output** a short report:

- Current branch and presence of `main`, `refit/mvp-skeleton`, `refit/supabase-cloud-refit`.
    
- Check directories: `/apps/web`, `/apps/workers`, `/db`, `/tests`, `/infra`, `/docs`.
    
- Confirm `.github/workflows/ci.yml` uses `SUPABASE_DB_URL` and **does not** start a local Postgres service.
    

## Stacked-PR Plan (where to continue)

- **PR #1 (merged):** repo convergence & hygiene.
    
- **PR #2 (done on `refit/mvp-skeleton`):** schema, migrations, RLS, storage.
    
- **PR #2.1 (follow-up):** Supabase **Cloud** refit (remove local DB artifacts, update CI, docs). If not open, create branch `refit/supabase-cloud-refit` from `refit/mvp-skeleton`, apply changes, and open **“PR #2.1 — Supabase Cloud refit”** (base=`refit/mvp-skeleton`).
    
- **Next after #2.1 is approved:** proceed to PR #3 (Upload + OCR + provenance anchors), then PR #4… per Refit Plan.
    

## Tasks Codex Should Execute Next (in any fresh chat)

1. **Read** the Ground Truth docs (`CODEX_REFIT_PLAN.md`, `project-description.md`, `README.md`, `agents.md`, `BOOTSTRAP_PROMPT.md`) and restate the **Working Contract**.

2. **Print Repo & Branch Health** (branch, envs, guard files, CI status).

3. **Plan PR #12 — UI Polish & Staging Deploy Readiness**:
   - Propose dry-run changeset only.
   - Goals: staging/prod deploy instructions, smoke script `--auth` mode, CI clean/lint/test, UI polish for Upload, Vault, Trends, and Share Pack.
   - Update docs with deployment/testing workflows.
   - Stop after dry-run until “CHANGES APPROVED”.

4. **Guard files must never be deleted**:
   - `docs/CODEX_START_PROMPT.txt`
   - `scripts/smoke-e2e.sh`
   - `docs/BOOTSTRAP_PROMPT.md`
   - `docs/CODEX_REFIT_PLAN.md`
   - `docs/project-description.md`
   - `agents.md`
   - `README.md`

5. **Use `./scripts/smoke-e2e.sh`** (with optional `--auth`) as the end-to-end smoke test.
    

## Testing & CI Expectations

- `prisma generate` + `migrate deploy` run against `SUPABASE_DB_URL` in CI.
    
- Unit tests (DB & storage helpers) run; DB-shape tests **skip** if no DB URL present.
    
- No Postgres service container in CI.
    

## Codex Code Review Workflow

- Treat `CODE_REVIEW.md` as the authoritative checklist before requesting a review (tests, typecheck, lint, smoke, migrations, env vars, guard files, OCR/embedding behavior).
- Run the CI “Codex review QA” step; it must be green prior to tagging Codex.
- Trigger Codex by commenting `@codex review` (template in README) or applying the `codex-review` label once the PR is ready for review.
- Run Codex reviews asynchronously every Tuesday/Thursday and at least 24h before staging/production deploys.

## If Anything is Ambiguous

Make the safest assumption consistent with the three Ground Truth docs, leave a `TODO(reason)` inline, proceed, and flag in the PR description.
