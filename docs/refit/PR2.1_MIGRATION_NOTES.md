## PR #2.1 — Supabase Cloud refit (follow-up to PR #2)

### Summary
- Removed local Postgres service usage in CI; CI now targets Supabase Cloud via `SUPABASE_DB_URL` secret.
- Simplified env templates to Cloud-only values.
  - Root `.env.example`: only Supabase Cloud vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`).
  - `apps/web/.env.example`: no localhost defaults; instruct to use Supabase Cloud URL/Anon key.
- Kept storage buckets private; access via server-side signed URLs only.

### CI Changes
- `.github/workflows/ci.yml` sets job `env` from GitHub Secrets:
  - `SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}`
  - `SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}`
- Steps gate DB work with `if: ${{ env.SUPABASE_DB_URL != '' }}`.

### Developer Notes
- Local dev runs Next.js only; DB/Auth/Storage are on Supabase Cloud. Fill `apps/web/.env.local` with your project’s Cloud URL and Anon key.
- No Docker/Postgres containers required locally.

### Follow-ups
- Verify Supabase extensions and RLS policies are applied per `docs/CODEX_REFIT_PLAN.md §3`.
- Ensure GitHub repo has required secrets set.

