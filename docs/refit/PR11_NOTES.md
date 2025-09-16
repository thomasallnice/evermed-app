## PR #11 — User Onboarding & Auth

### Summary
- Integrated Supabase Auth (email/password) with login/signup pages under `/auth/*`.
- Added onboarding flow to collect name/locale/role and create a default `Person` row per user.
- API routes (uploads, documents, share packs) now require authenticated Supabase sessions, with dev-only header bypass for smoke tests.
- Share Pack creation persists nested items and responds with linked documents/observations.
- Added onboarding API to ensure default person + metadata.
- Resolved Next.js `main-app.js` chunk 404 by cleaning `.next/`, updating next.config, and making build part of CI.

### Auth Details
- Uses `@supabase/auth-helpers-nextjs` route clients; RLS continues to rely on `auth.uid()`.
- Local smoke script can still set `x-user-id=test-user` (non-production) for rapid testing.

### TODO
- Invite flow: wire email delivery + acceptance path.
- Add Supabase email templates and audit logging.
- Expand E2E coverage for signup → onboarding → upload → share.
