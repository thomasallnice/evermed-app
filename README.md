# EverMed.ai — Developer README

Monorepo aligned with `docs/CODEX_REFIT_PLAN.md`.

## Layout

- `apps/web` — Next.js (App Router) web app + API routes
- `apps/workers` — OCR/extractor scaffolding (Cloud Run)
- `packages/config` — shared eslint/prettier/tsconfig
- `packages/types`, `packages/ui` — shared types/components
- `db` — Prisma schema & migrations
- `docs` — product spec, refit notes, ground truth
- `tests` — Vitest unit suites and fixtures (non-PHI)

## Features (PR #10 stack)

- Uploads stream files to Supabase Storage, run Cloud Run OCR, chunk text into `DocChunk`, and embed via OpenAI (pgvector backed).
- Chat `/api/chat` performs semantic retrieval with citations and guardrails.
- Trends page surfaces lab timelines, trend snippets, and related context.
- Share Packs bundle selected documents **and** observations with passcode, logs, revoke, and signed-viewer URLs.
- Smoke script (`./scripts/smoke-e2e.sh`) exercises upload → signed URL → share pack flow.

## Quick Start (local)

Prerequisites
- Node 20+
- Supabase project (Auth + Storage, pgvector enabled)
- OpenAI API key (for embeddings)

Setup
```
git clone …
cd evermed-app
npm ci
cp apps/web/.env.example apps/web/.env.local
# populate SUPABASE_URL/keys, SHARE_LINK_PEPPER, PDF_EXTRACT_*, OPENAI_API_KEY
```

Run web app
```
npm run dev
# open http://localhost:3000
```

Smoke test (optional)
```
./scripts/smoke-e2e.sh
```

## Deployment & Testing

- Deploy Supabase migrations (`prisma migrate deploy`) and Vercel project (set env vars: Supabase keys, OCR envs, `OPENAI_API_KEY`).
- After each deploy run `./scripts/smoke-e2e.sh` against the environment to validate upload → share.
- Recommended suites: Playwright/Cypress E2E (auth → upload → share), load tests (large PDFs/concurrency), security review (RLS, passcodes, signed URLs, revocation), monitoring/alerting setup.

### Troubleshooting

- If the dev server reports missing `_next/static/chunks/*.js` files (e.g., `main-app.js` 404), stop the server, run `npm run clean:next`, reinstall dependencies (`npm ci`), and restart `npm run dev`.
- If uploads fail with Supabase RLS errors, re-apply policies (`db/policies.sql`) and confirm documents/storage policies reference `auth.uid()`.
- If chat responds with OpenAI errors, ensure `OPENAI_API_KEY` is set in `.env.local` or deployment env vars.
- If OCR returns blank text, confirm `PDF_EXTRACT_URL` / `PDF_EXTRACT_BEARER` are configured and `/apps/web/src/lib/ocr.ts` exists.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and placeholder e2e.

## Docs

- Product & ground truth: `docs/project-description.md`, `docs/CODEX_REFIT_PLAN.md`, `docs/BOOTSTRAP_PROMPT.md`
- Refits: `docs/refit/PR*_NOTES.md`

## Contributing

See `CONTRIBUTING.md`. Use Conventional Commits. Never commit secrets; `.env.local` is gitignored.
