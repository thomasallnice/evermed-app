# Codex Code Review Checklist

Use this checklist whenever requesting a Codex-powered review or preparing a PR for human review. The goal is to ensure regressions are caught early and ground-truth constraints stay aligned with AGENTS.md.

## Review Cadence & Scheduling
- **Twice-weekly async Codex review:** Tuesday & Thursday mornings CET covering all merged PRs since previous review.
- **Pre-staging review:** Run Codex review for any branch destined for staging/production at least 24h before deploy.
- **Feature milestones:** Trigger Codex review after completing each refit milestone (PR series) or when onboarding new contributors.
- **Emergency hotfix:** Optional, but run checklist if time permits; document skipped checks.

> _Based on OpenAI Pro usage limits (~800 GPT-4o mini messages/day or ~80 GPT-4o responses), each review session should stay under 40 messages to remain within the shared allowance._

## Requesting a Codex Review
1. Prepare branch/PR description with scope, testing evidence, and any TODOs.
2. Ensure CI (including the “Codex review QA” job) is green and the checklist below is complete.
3. Trigger review using one of the following:
   - **Pull request comment:**
     ```
     @codex review
     Context: <scope / risk>
     Areas of focus: <auth policies, OCR pipeline, UI changes>
     Testing: npm run lint && npm run typecheck && npm run test && ./scripts/smoke-e2e.sh
     Ground truth docs reviewed: CODEX_REFIT_PLAN.md, project-description.md, README.md, AGENTS.md
     ```
   - **PR label:** apply the `codex-review` label to queue the automation (if the GitHub integration is enabled).
   - **Ready-for-review trigger:** moving the PR from draft to “Ready for review” automatically notifies Codex when the comment or label exists.
4. Capture Codex findings in PR discussion; assign owners for remediation and track in the PR checklist.

## Checklist (Pass/Fail)
- [ ] Tests: `npm run test` (Vitest) passes locally or in CI; capture coverage deltas when relevant to ensure core flows remain exercised.
- [ ] Type safety: `npm run typecheck` succeeds with no `any` regressions; TS config stays at ES2020+ per ground truth.
- [ ] Lint: `npm run lint` (or `lint:ci`) passes; verify alias/import paths use configured tsconfig paths (no `../../` regressions unless intentional).
- [ ] Smoke script: `./scripts/smoke-e2e.sh` (with `SUPABASE_DB_URL`) executes; confirm OCR + embeddings + chat + share pack flows complete.
- [ ] Prisma: run `npx prisma generate` after schema changes; add migrations via `prisma migrate dev` (`migrate deploy` in CI) and review for destructive ops/rollbacks.
- [ ] Environment: `.env.example` updated when new env vars appear; CI uses `${{ env.SECRET }}` references; no secrets in repo.
- [ ] Guard files: ensure `docs/CODEX_START_PROMPT.txt`, `docs/BOOTSTRAP_PROMPT.md`, `AGENTS.md`, `README.md`, `scripts/smoke-e2e.sh`, `docs/CODEX_REFIT_PLAN.md`, `docs/project-description.md` are touched only with documented intent.
- [ ] Docs: product/process updates reflected in ground truth + relevant `docs/refit/PR*_NOTES.md` entry.
- [ ] Schema/Data: migrations reviewed, backfill/cleanup steps captured; confirm Supabase RLS still aligns with schema changes.
- [ ] Security/RLS: verify policies depend on `auth.uid()`, signed URLs stay private, passcode hashing uses pepper, no PHI in analytics.
- [ ] Error handling: API routes surface meaningful status codes; background workers log failures with TODO(reason) for gaps.
- [ ] Observability: logging/metrics changes respect no-PHI requirement; note monitoring updates in deployment checklist.
- [ ] TODO debt: new TODOs include context `TODO(reason)` and follow-up issue/PR IDs.
- [ ] UI/UX: ensure upload/vault/chat flows retain accessibility basics (labels, focus states) after UI changes.
- [ ] Performance: large file/OCR changes tested for latency; document observed p95 vs 10s budget when modified.

## Post-Review Actions
- Apply Codex findings promptly; mark resolved with explanation and link to follow-up commits.
- If Codex suggests additional tests, add them before merging or create a follow-up issue/PR with owner & due date.
- Update CODE_REVIEW.md when standards evolve (e.g., new guard files, workflows, Codex configuration changes).
- Share learnings in `docs/refit/PR*_NOTES.md` for future reference and cross-team visibility.

---

_Last updated: 2025-09-12 — maintainers: EverMed Core Team_
