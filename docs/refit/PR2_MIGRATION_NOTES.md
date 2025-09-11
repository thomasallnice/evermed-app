## PR #2 — Supabase schema, migrations, RLS, storage

### Summary
- Added Prisma schema at `db/schema.prisma` with MVP entities (Person, Document, Observation, SharePack/Item/Event, DocChunk with pgvector, TokenUsage, AnalyticsEvent).
- Added `db/migrations_extra/pg_extensions.sql` to enable `uuid-ossp`, `pgcrypto`, and `vector`; and add `DocChunk.embedding vector(1536)`.
- Added `db/policies.sql` to enable RLS and create owner-scoped policies. Policies are gated to only apply when `auth.uid()` exists (Supabase).
- Added seed script `db/seed.ts` (synthetic, non‑PHI).
- Added storage helper `apps/web/src/lib/storage.ts` for server-side signed URLs.
- CI now runs Postgres service, applies Prisma migrations + extra SQL, seeds DB, and runs tests.

### Extensions enabled
- `uuid-ossp`
- `pgcrypto`
- `vector`

Applied by: `npm run db:extra` (runs `db/migrate_extra.ts`).

### Storage buckets
- Create private buckets in Supabase Storage:
  - `documents`
  - `thumbnails`
- Access pattern: server-side signed URLs only. See `apps/web/src/lib/storage.ts`.

### RLS Policies
- Tables with RLS enabled: Person, Document, Observation, SharePack, SharePackItem, ShareEvent.
- Owner-based policies consistent with `docs/CODEX_REFIT_PLAN.md §3`.
- Apply `db/policies.sql` on your Supabase project (SQL editor) after running migrations.

### Testing
- Preferred: Use Supabase Cloud dev DB. Set `SUPABASE_DB_URL` in GitHub secrets and locally if you want to run DB tests.
- CI uses `SUPABASE_DB_URL` to run `prisma migrate deploy` and seed.
- Locally: `export SUPABASE_DB_URL=postgresql://…` then `npm run prisma:migrate:deploy && npm run seed && npm test`.
- RLS unit tests simulate policy semantics; full Supabase auth RLS covered in later API e2e.

### Follow-ups
- Wire signed URL helper into the document GET API in PR #3.
- Apply `db/policies.sql` to the Supabase instance and verify via Supabase policy editor.
- Create Storage buckets in Supabase (UI/CLI) if not present; keep both private.
