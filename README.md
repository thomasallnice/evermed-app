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

## Deployment & Staging (PR12)
- Deploy backend on Vercel with Supabase staging project.
- Required env vars listed in `.env.local` and Vercel settings.
- Run `./scripts/smoke-e2e.sh --auth` after deploy to validate.

## UI Polish
- Upload page: previews & OCR text snippet.
- Vault: doc list with metadata.
- Trends: polished charts, mobile-friendly.
- Share Pack viewer: styled, responsive, includes disclaimers.

### Troubleshooting

- If the dev server reports missing `_next/static/chunks/*.js` files (e.g., `main-app.js` 404), stop the server, run `npm run clean:next`, reinstall dependencies (`npm ci`), and restart `npm run dev`.
- If uploads fail with Supabase RLS errors, re-apply policies (`db/policies.sql`) and confirm documents/storage policies reference `auth.uid()`.
- If chat responds with OpenAI errors, ensure `OPENAI_API_KEY` is set in `.env.local` or deployment env vars.
- If OCR returns blank text, confirm `PDF_EXTRACT_URL` / `PDF_EXTRACT_BEARER` are configured and `/apps/web/src/lib/ocr.ts` exists.
- If lint fails: run `npm run clean:next`.
- If `/api/chat` fails: ensure `OPENAI_API_KEY` is set.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and placeholder e2e.

## Docs

- Product & ground truth: `docs/project-description.md`, `docs/CODEX_REFIT_PLAN.md`, `docs/BOOTSTRAP_PROMPT.md`
- Refits: `docs/refit/PR*_NOTES.md`

## Contributing

See `CONTRIBUTING.md`. Use Conventional Commits. Never commit secrets; `.env.local` is gitignored.
