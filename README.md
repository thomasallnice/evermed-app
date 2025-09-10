# EverMed.ai — Developer Readme

Monorepo aligned to `docs/CODEX_REFIT_PLAN.md`.

## Layout

- apps/web — Next.js (App Router)
- apps/workers — background jobs (OCR/extraction)
- packages/ui — shared UI (placeholder)
- packages/types — shared types
- packages/config — eslint/prettier/tsconfig
- db — Prisma schema & migrations (next PR)
- infra — vercel.json, supabase config
- tests — unit/e2e/fixtures (non‑PHI)

## Quick Start (local)

Prereqs:
- Node 20+
- Supabase project (Auth + Storage)
- OpenAI API key

Setup:
1) `cp apps/web/.env.example apps/web/.env.local` and fill values
2) `npm ci`

Run web:
```
npm run dev
```
Open http://localhost:3000

## CI

GitHub Actions runs lint, typecheck, unit tests, and a placeholder e2e step. See `.github/workflows/ci.yml`.

## Docs

- Product spec: `docs/project-description.md`
- Refit plan: `docs/CODEX_REFIT_PLAN.md`
- File moves: `docs/refit/PR1_FILE_MOVES.md`

## Contributing

See `CONTRIBUTING.md`. Use Conventional Commits. Never commit secrets; `.env.local` is gitignored.
