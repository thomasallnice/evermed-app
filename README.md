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

### Safe Start with Codex
- Always start new Codex sessions by pasting: `read docs/BOOTSTRAP_PROMPT.md` (do not ask Codex to “scan the repo” freestyle).
- Codex must work **only** on a feature branch and open PRs; never commit directly to `main`.
- First action is a **Dry-Run**: print planned file changes (adds/edits/deletes) without writing to disk; only proceed after “CHANGES APPROVED”.

### Recovery (if something looks wrong)
- Save current state: `git checkout -b backup/pre-recovery`
- Hard-reset to last good commit (e.g. a284332):  
  `git checkout main && git reset --hard a284332 && git push -f origin main`

## CI

GitHub Actions runs lint, typecheck, unit tests, and a placeholder e2e step. See `.github/workflows/ci.yml`.

## Docs

- Product spec: `docs/project-description.md`
- Refit plan: `docs/CODEX_REFIT_PLAN.md`
- File moves: `docs/refit/PR1_FILE_MOVES.md`

### Codex model
Codex now defaults to **GPT-5-Codex**, a GPT-5 variant optimized for agentic coding and long refactors. Prefer GPT-5-Codex for repo work; use GPT-5 for general Q&A.  [oai_citation:2‡OpenAI](https://openai.com/index/introducing-upgrades-to-codex/?utm_source=chatgpt.com)

## Contributing

See `CONTRIBUTING.md`. Use Conventional Commits. Never commit secrets; `.env.local` is gitignored.
