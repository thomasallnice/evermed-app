# Active Issues & Tech Debt

**Last Updated:** 2025-10-08

---

## 🚨 Blockers (Must Fix Immediately)

### DATABASE_URL Environment Variable in Vercel
**Severity:** Blocker
**Status:** Identified, awaiting manual fix
**Affects:** Production deployment

**Issue:**
- Vercel environment variable `DATABASE_URL` is set to `${SUPABASE_DB_URL}` (shell syntax)
- Shell variable substitution doesn't work in Vercel
- Causes: "the URL must start with the protocol postgresql://" error

**Reproduction:**
1. Deploy to Vercel
2. Visit `/auth/onboarding`
3. See Prisma error about DATABASE_URL

**Fix:**
- Go to Vercel Dashboard → Settings → Environment Variables
- Change `DATABASE_URL` to direct value: `postgres://postgres:PASSWORD@db.wukrnqifpgjwbqxpockm.supabase.co:5432/postgres`
- Redeploy

**Documentation:** `VERCEL_FIX.md`

---

### Supabase Storage Bucket Missing
**Severity:** Blocker
**Status:** Identified, awaiting manual fix
**Affects:** File uploads, document storage

**Issue:**
- `documents` storage bucket doesn't exist in Supabase project
- Causes: "Bucket not found" error on `/profile` and upload pages

**Reproduction:**
1. Visit `/profile`
2. See "Bucket not found" error

**Fix:**
1. Go to Supabase Dashboard → Storage
2. Create bucket: `documents` (private)
3. Apply RLS policies (SQL in `VERCEL_FIX.md`)

**Documentation:** `VERCEL_FIX.md`, `DEPLOYMENT_CHECKLIST.md`

---

## ⚠️ Critical (Fix This Week)

### All Vercel Environment Variables Need Configuration
**Severity:** Critical
**Status:** Identified
**Affects:** All API functionality, OpenAI integration, PDF extraction

**Issue:**
- Only some environment variables configured in Vercel
- Missing: OpenAI keys, PDF extraction, Supabase service role key, etc.

**Fix:**
- Copy all variables from `VERCEL_ENV_VARS.txt` to Vercel Dashboard
- Ensure "All Environments" selected for each variable
- Redeploy after adding all variables

**Documentation:** `VERCEL_ENV_VARS.txt`

---

## 📌 Medium Priority (Fix This Sprint)

### No Performance Benchmarks Established
**Severity:** Medium
**Status:** Identified
**Affects:** Performance optimization, PRD NFR validation

**Issue:**
- No baseline performance metrics captured
- Can't validate p95 < 10s requirement without benchmarks

**Fix:**
- Use Chrome DevTools MCP to capture performance traces
- Document baseline metrics
- Set up performance regression testing

**Next Steps:**
1. Start devstack
2. Use `performance_start_trace` + `performance_analyze_insight`
3. Document results in `.claude/memory/performance-baseline.md`

---

### E2E Test Coverage Minimal
**Severity:** Medium
**Status:** Known
**Affects:** Confidence in deployments

**Issue:**
- Only smoke test exists (`scripts/smoke-e2e.sh`)
- No comprehensive E2E test suite

**Fix:**
- Expand E2E tests using Chrome DevTools MCP
- Test critical user flows:
  - Sign up → Upload → Explain → Pack → Share
  - Mobile responsive flows
  - Error states

**Next Steps:**
- Create E2E test plan
- Implement using vitest + Chrome DevTools MCP

---

## 🔧 Low Priority (Tech Debt)

### Unused ESLint Disable Directives
**Severity:** Low
**Status:** Identified
**Files:** `apps/web/src/lib/rag.ts`, `apps/web/src/app/doc/[id]/page.tsx`

**Issue:**
- Some files have unused `eslint-disable` comments
- Causes warnings during lint

**Fix:**
- Remove unused directives or fix the actual issues they were hiding

---

### Unused Variables in Components
**Severity:** Low
**Status:** Identified
**Files:** Multiple component files

**Issue:**
- Some components have unused variables (snippetRef, index, etc.)
- Should be prefixed with `_` or removed

**Examples:**
- `apps/web/src/app/doc/[id]/page.tsx`: `snippetRef`
- `apps/web/src/app/vault/page.tsx`: `index`
- `apps/web/src/app/chat/page.tsx`: `MEDICAL_DISCLAIMER`, `setEditing`

**Fix:**
- Prefix with `_` if intentionally unused
- Remove if actually not needed

---

## ✅ Resolved Recently

### Vercel Monorepo Configuration (Resolved 2025-10-08)
**Was:** Routes-manifest.json not found error
**Fix:** Created correct `vercel.json` with `apps/web/.next` output directory
**Commit:** f888b8f

### ESLint Linting Build Artifacts (Resolved 2025-10-08)
**Was:** 15,954 linting errors from `.next/` files
**Fix:** Added `.next/**` to ESLint ignores in flat config
**Commit:** cf31abe

### API Routes Static Prerendering (Resolved 2025-10-04)
**Was:** Dynamic server usage errors on API routes
**Fix:** Added `export const dynamic = 'force-dynamic'` to 17 routes
**Commit:** 2e04eee

### DocChunk Cascade Deletion (Resolved 2025-10-04)
**Was:** Users couldn't delete documents
**Fix:** Added `onDelete: Cascade` to schema
**Migration:** 20251004173139_fix_critical_cascade_and_unique_issues

---

## Issue Template

### [Issue Title]
**Severity:** [Blocker | Critical | Medium | Low]
**Status:** [Identified | In Progress | Blocked]
**Affects:** [What systems/features are affected]

**Issue:**
- Description of the problem

**Reproduction:**
1. Steps to reproduce

**Fix:**
- Proposed solution

**Documentation:** [Links to relevant docs]
