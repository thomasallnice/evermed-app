## PR #11 — User Onboarding & Auth

### Summary
- Integrated Supabase Auth (email/password) with login/signup pages under `/auth/*`.
- Added onboarding flow to collect name/locale/role and create a default `Person` row per user.
- API routes (uploads, documents, share packs) now require authenticated Supabase sessions, with dev-only header bypass for smoke tests.
- Share Pack creation persists nested items and responds with linked documents/observations.
- Added onboarding API to ensure default person + metadata.
- Resolved Next.js chunk 404 by cleaning `.next/`, updating `next.config.js`, and adding build to CI.
- Restored Cloud Run OCR helper (`/lib/ocr.ts`) and embedding helper (`/lib/embedding.ts`).
- Fixed Supabase RLS policies for documents/storage and ensured upload API uses authenticated `auth.uid()` while retaining dev bypass.
- Chat API now validates `OPENAI_API_KEY` and chat history persists via new `ChatMessage` table.

### Auth Details
- Uses `@supabase/auth-helpers-nextjs` route clients; RLS continues to rely on `auth.uid()`.
- Local smoke script can still set `x-user-id=test-user` (non-production) for rapid testing.

### TODO
- Invite flow: wire email delivery + acceptance path.
- Add Supabase email templates and audit logging.
- Expand E2E coverage for signup → onboarding → upload → share.

### Dev Notes
- `openai` must remain in the root `package.json` so all workspaces pull the shared client; run `npm install` from the repo root after changing dependencies.
- Always execute `npm run clean:next` from the repository root before linting/building if stale `.next` artifacts appear.
- Prisma schema now exposes `Document.chatMessages` to mirror `ChatMessage.document`, resolving missing relation warnings during client generation.
- Codex code review: follow `CODE_REVIEW.md`, schedule Tuesday/Thursday async runs, and ensure the CI “Codex review QA” step succeeds before tagging `@codex review` or applying the `codex-review` label on auth/onboarding PRs.
