# Contributing

Thank you for contributing to EverMed.

Security and privacy are first-class. Please follow these rules for all changes:

- No diagnosis, dosing advice, emergency triage, or automated image grading (MVP non‑SaMD).
- Do not log PHI. Analytics payloads must be event-only, no free-text.
- Share links require: passcode, 7-day expiry, view logs, one-tap revoke (default ON).
- Use Supabase (DB/Auth/Storage/RLS), Vercel (hosting/env), GitHub (CI/CD).
- Never commit secrets. Use Vercel Project Env and Supabase secrets. `.env.local` is for local dev only and is gitignored.
- All storage buckets are private; access via signed URLs only.

## Development

- Monorepo layout under `/apps`, `/packages`, `/db`, `/infra`, `/tests`.
- Install deps: `npm ci`
- Dev (web): `npm run dev`
- Tests: `make test`
- E2E placeholder: `make e2e` (will be implemented in PR #3+)

## Conventional Commits

Use: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`. Keep diffs small and focused.

