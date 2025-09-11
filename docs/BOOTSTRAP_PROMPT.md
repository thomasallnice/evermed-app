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

- **Vercel Project Env:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
    
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

1. **Read** the three Ground Truth docs and restate the **10-point Working Contract**.
    
2. **Print Repo & Branch Health** (see above).
    
3. **If PR #2.1 is not open:**
    
    - `git checkout refit/mvp-skeleton && git pull`
        
    - `git checkout -b refit/supabase-cloud-refit`
        
    - Apply Supabase Cloud refit (remove local DB artifacts; simplify `.env.example`; update CI to use `SUPABASE_DB_URL`; adjust tests; update docs).
        
    - Open PR: **“PR #2.1 — Supabase Cloud refit”** with base = `refit/mvp-skeleton`.
        
4. **Pause** (do **not** start PR #3) until review is complete.
    

## Testing & CI Expectations

- `prisma generate` + `migrate deploy` run against `SUPABASE_DB_URL` in CI.
    
- Unit tests (DB & storage helpers) run; DB-shape tests **skip** if no DB URL present.
    
- No Postgres service container in CI.
    

## If Anything is Ambiguous

Make the safest assumption consistent with the three Ground Truth docs, leave a `TODO(reason)` inline, proceed, and flag in the PR description.
