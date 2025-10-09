# Active Issues & Tech Debt

**Last Updated:** 2025-10-09

---

## 🚨 Blockers (Must Fix Immediately)

**🎉 NO ACTIVE BLOCKERS** - All deployment blockers resolved!

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

### DATABASE_URL Environment Variable in Vercel (Resolved 2025-10-09)
**Was:** DATABASE_URL set to `${SUPABASE_DB_URL}` (shell syntax) which doesn't work in Vercel
**Fix:** Changed to direct database URL value in Vercel Dashboard
**Validation:** Deployment validation passed - no Prisma errors
**Date:** 2025-10-09

### Supabase Storage Bucket Missing (Resolved 2025-10-09)
**Was:** "Bucket not found" errors on /profile and /upload pages
**Fix:** Created `documents` bucket (private) with RLS policies in Supabase Dashboard
**Validation:** Deployment validation passed - profile and upload pages load without errors
**Date:** 2025-10-09

### Vercel Deployment Protection Bypass (Resolved 2025-10-09)
**Was:** Could not automate deployment testing due to protection
**Fix:**
- Obtained bypass secret from Vercel Dashboard
- Created validation script using `x-vercel-protection-bypass` header
- Added secret to .env as `VERCEL_BYPASS_TOKEN`
**Validation:** Automated validation script passes all tests (21/21)
**Script:** `scripts/validate-deployment-with-bypass.js`
**Date:** 2025-10-09

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
