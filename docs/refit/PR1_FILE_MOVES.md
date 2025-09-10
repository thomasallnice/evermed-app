# PR #1 — Refit: Repo Convergence & Dead Code Removal

This PR restructures the repo to match the plan in `docs/CODEX_REFIT_PLAN.md §1`.

## Relocated

- app → apps/web (excluding `.git`, `.next`, `node_modules`, `.env.local`)
- app/supabase → infra/app-supabase (legacy SQL; will be replaced by Prisma in PR #2)
- vercel.json → infra/vercel.json
- dummy-documents → tests/fixtures/documents
- app/docs → docs/app-legacy (reference only)
- extractor → apps/workers/extractor (legacy PDF extractor; kept as reference)

## Deleted

- web (older Next.js app; superseded by apps/web)
- archive (historic documents; not part of target structure)

## Added

- Monorepo scaffolding: /apps, /packages, /db, /infra, /tests
- packages/config (eslint/prettier/tsconfig)
- packages/types, packages/ui (placeholders)
- CI workflow (.github/workflows/ci.yml)
- Makefile (test, e2e, seed)
- .devcontainer
- CONTRIBUTING.md and PR template

## Notes

- `.env.local` remains local-only and is gitignored; example values live in `apps/web/.env.example`.
- Old Supabase SQL and extractor code are preserved for reference but will be superseded by Prisma + new workers in PR #2–#3.

