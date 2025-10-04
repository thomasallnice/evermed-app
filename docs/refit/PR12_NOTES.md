## PR #12 — UI Polish & Staging Deploy Readiness

### Build & Deploy Updates
- Root `npm run build` now delegates to the `@evermed/web` workspace so Vercel monorepo builds succeed.
- Added root `postinstall` (`prisma generate --schema=db/schema.prisma`) so Prisma client stays generated in Vercel and CI environments.
- Documented Vercel settings (build command `npm run build`, output `apps/web/.next`, env vars) in README and Refit Plan.

### TODO
- Extend smoke script with `--auth` once staging credentials are finalized.
- Add Playwright auth/upload/share test before promoting to production.
