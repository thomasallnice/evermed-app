# AGENTS.md — EverMed.ai Agent Instructions

Version: 1.0 — Generated on 2025-09-11

These instructions guide AI agents (Codex, etc.) working on this repo.  
Whenever code, schema, CI, or process change, update this file.

---

## 🏗 Project Structure

- Monorepo with these top-level folders:
  - `apps/web` — frontend + API routes  
  - `apps/workers/ocr` — OCR worker & provider interfaces  
  - `db` — Prisma schema & migrations  
  - `infra` — infrastructure helpers/config  
  - `docs/refit` — per-PR notes & migration docs  
  - `tests` — unit/e2e/fixtures  

---

## 🔧 Environment & Secrets

- Supabase Cloud is used for DB/Auth/Storage in dev/stage/prod.  
- Required secrets in GitHub (Actions):
  - `SUPABASE_DB_URL`  
  - `SUPABASE_URL`  
  - `SUPABASE_ANON_KEY`  
  - `SUPABASE_SERVICE_ROLE_KEY`  
- CI must reference secrets via **env**, and guard DB steps like migrations/seed with `if: env.SUPABASE_DB_URL != ''`.

---

## 🛠 Build, CI, & Tests

- TypeScript target should be **ES2020** or higher.  
- Root tsconfig must include `lib: ["ES2020","DOM"]`.  
- Tests use Vitest. New tests must not have implicit any.  
- Unused variables must be prefixed with `_` or removed.  
- Schema migrations via Prisma must compile (`prisma generate`).  
- DB-shape tests (e.g. checking vector column, etc.) skip if `SUPABASE_DB_URL` is not set.

### Codex Code Review

- Follow `CODE_REVIEW.md` before requesting a review (lint, typecheck, tests, smoke, migrations, env/guard checks).
- CI contains a `Codex review QA` step on every PR; it must pass before tagging Codex.
- Trigger reviews with an `@codex review` PR comment (template in README) or the `codex-review` label once the PR is ready.
- Default cadence: Tuesday & Thursday async reviews plus mandatory runs ≥24h before staging/production deploys.

---

## 📝 Docs & Ground Truth

- Always update these docs when changes occur:
  - `project-description.md`  
  - `CODEX_REFIT_PLAN.md`  
  - `BOOTSTRAP_PROMPT.md`  
  - PR-specific notes in `docs/refit/PR*_NOTES.md`  
- Each PR must include a summary:
  - what changed,  
  - what schema/data change,  
  - what CI or secret implications,  
  - what docs were updated.
- Guard files (`docs/CODEX_START_PROMPT.txt`, `scripts/smoke-e2e.sh`, `docs/BOOTSTRAP_PROMPT.md`, `AGENTS.md`) must remain tracked and up to date.

---

## ✅ Scope & Guardrails

- Non-SaMD: No diagnosis, medical advice, dosing, or emergency triage.  
- No image grading or automated interpretations.  
- All outputs must include provenance (e.g. citations with `DocChunk.sourceAnchor`) when relevant.  
- Auth must be enforced for user/owner access.
- Never delete or rename guard files. Never delete any file without an explicit `ALLOW_DELETIONS` instruction in the user prompt; call out deletions in the dry-run.

---

## 🔒 Guard Files

- `docs/CODEX_START_PROMPT.txt`
- `scripts/smoke-e2e.sh`
- `docs/BOOTSTRAP_PROMPT.md`
- `AGENTS.md`

Any change to these files must be intentional and documented; do not remove them.

---

## 🗂 Version History

- `v1.0 — 2025-09-11`: Established AGENTS.md rules including CI guardrails, docs update policy, schema versioning, Typed TS, etc.
