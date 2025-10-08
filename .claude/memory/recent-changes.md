# Recent Changes

**Most recent changes listed first**

---

## 2025-10-08: Repository Cleanup & File Archival ✅
**Type:** Maintenance
**Branch:** refit/user-auth-onboarding
**Commits:** TBD

### What Changed
**Created Archive Structure:**
- `archive/deployment-docs/` - Obsolete deployment documentation
- `archive/db-validation-reports/` - One-time validation reports
- `archive/old-configs/` - Pre-monorepo configurations
- `archive/duplicate-docs/` - Duplicate documentation
- `archive/README.md` - Complete archive index with replacements

**Files Archived (11 total):**
1. **Deployment docs** (3 files):
   - `DEPLOYMENT_QUICK_START.md` → Superseded by `.claude/sops/deployment.md`
   - `VERCEL_FIX.md` → Issues resolved
   - `VERCEL_CONFIG_REQUIRED.md` → Issues resolved

2. **DB validation reports** (4 files):
   - `DEPLOYMENT_VALIDATION_REPORT.md` → One-time validation
   - `SECURITY_VALIDATION_REPORT.md` → One-time validation
   - `VALIDATION_SUMMARY.md` → Issues resolved
   - `DEPLOYMENT_FIX_PLAN.md` → Plan completed

3. **Old configs** (1 file):
   - `infra/vercel.json.old` → Pre-monorepo config

4. **Duplicate docs** (3 files):
   - `db/DEPLOYMENT_CHECKLIST.md` → Duplicate of root checklist
   - `db/QUICK_START.md` → Superseded by SOPs
   - `db/RLS_IMPLEMENTATION_SUMMARY.md` → Now in database-changes.md SOP

### Why
- Reduce clutter in repository
- Eliminate duplicate documentation
- Preserve historical context while improving discoverability
- Make root directory cleaner and more navigable
- Consolidate documentation in `.claude/sops/`

### Impact
- ✅ Repository root is cleaner (3 fewer MD files)
- ✅ `db/` directory tidier (7 fewer files)
- ✅ `infra/` directory cleaned up
- ✅ All archived files preserved with git history
- ✅ Clear references to replacement documentation
- ✅ Easier to find current, relevant documentation

---

## 2025-10-08: Claude Code 2.0 Memory System & Chrome DevTools MCP Integration ✅
**Type:** Infrastructure
**Branch:** refit/user-auth-onboarding
**Commits:** 6422674, de81e79, a3d0d92

### What Changed
**Memory System (.claude/ folder):**
- Created memory files: project-state.md, recent-changes.md, active-issues.md
- Created SOPs: database-changes.md, api-endpoints.md, testing.md, deployment.md
- Added config.json.example for Chrome DevTools MCP
- Added .claude/README.md with complete documentation

**Chrome DevTools MCP Integration:**
- Documented all 26 tools in CLAUDE.md (input, navigation, performance, network, debugging, emulation)
- Added example workflows for performance testing, bug investigation, E2E testing
- Integrated with subagents (nextjs-ui-builder, vitest-test-writer, pr-validation-orchestrator)

**CLAUDE.md Updates:**
- Memory & SOPs section with mandatory automatic updates
- Chrome DevTools section with complete tool reference
- Subagent integration guidance

### Why
- Enable persistent context across Claude Code sessions
- Standardize common development workflows
- Document project state, recent changes, and active issues automatically
- Integrate browser automation for testing and performance validation
- Reduce repeated mistakes with SOPs

### Impact
- ✅ Claude Code can reference project state automatically
- ✅ Team has standardized SOPs for database, API, testing, deployment
- ✅ Performance testing ready with Chrome DevTools MCP
- ✅ E2E test automation framework in place
- ✅ Active issues tracked and categorized by severity
- ✅ Easier onboarding for new AI sessions

---

## 2025-10-08: Claude Code 2.0 Memory System Implementation
**Type:** Infrastructure
**Branch:** refit/user-auth-onboarding
**Commits:** TBD

### What Changed
- Created `.claude/` folder structure with memory and SOPs
- Added project state tracking (`project-state.md`)
- Added recent changes log (this file)
- Added active issues tracking
- Created SOPs for common workflows
- Integrated Chrome DevTools MCP documentation

### Why
- Enable persistent context across Claude Code sessions
- Document standard operating procedures
- Improve development workflow efficiency
- Integrate browser automation for testing

### Impact
- Claude Code can now reference project state automatically
- Easier onboarding for new AI sessions
- Standardized workflows documented

---

## 2025-10-08: Supabase CLI Integration Documentation
**Type:** Documentation
**Branch:** refit/user-auth-onboarding
**Commit:** 76da125

### What Changed
- Enhanced `database-architect` subagent with Supabase CLI capabilities
- Added comprehensive Supabase CLI command reference to CLAUDE.md
- Updated deployment workflows to use Supabase CLI

### Commands Added
- `supabase link`, `supabase db diff`, `supabase db push`
- Database branch creation, edge functions deployment
- Secrets management via CLI

### Why
- Safer deployments with migration previews
- Better testing with database branches
- Unified tooling for infrastructure management

### Impact
- Deployment process more robust
- Can preview schema changes before applying
- RLS/trigger management via CLI instead of manual SQL

---

## 2025-10-08: Vercel Deployment Configuration Fixes
**Type:** Bug Fix
**Branch:** refit/user-auth-onboarding
**Commits:** 23d6996, f888b8f, cf31abe

### What Changed
1. **Fixed monorepo paths** in `vercel.json`
   - Old: `buildCommand: cd app && ...` (wrong path)
   - New: `buildCommand: npm run build` with `outputDirectory: apps/web/.next`

2. **Removed conflicting functions pattern**
   - Manual pattern was conflicting with Next.js auto-detection
   - Let Next.js handle API route configuration

3. **Fixed ESLint flat config**
   - Added `.next/**` to ignores
   - Fixed 15,954 linting errors from build artifacts

### Why
- Old `infra/vercel.json` had pre-monorepo paths
- Deployment was failing with "routes-manifest.json not found"
- Next.js App Router auto-detects API routes

### Impact
- ✅ Vercel builds now succeed
- ✅ No more manual functions configuration needed
- ✅ Clean linting output

---

## 2025-10-04: Mobile-First Responsive Design
**Type:** Feature
**Branch:** refit/user-auth-onboarding
**Commits:** Multiple (during design implementation)

### What Changed
- All 7 pages redesigned: vault, upload, chat, doc/[id], track, packs, profile
- Google Material Design implementation
  - Elevation with shadows (shadow-md, shadow-lg)
  - Rounded corners (rounded-2xl for cards, rounded-lg for buttons)
  - Colorful topic badges (blue/purple/orange/green)
- Mobile hamburger navigation component
- 44px minimum touch targets for all interactive elements
- Responsive grid layouts: 1 col mobile → 2 tablet → 3 desktop

### Why
- App needed to be mobile-first for user accessibility
- Material Design provides consistent, professional UX
- Touch targets meet iOS/Android accessibility standards

### Impact
- ✅ All pages work on mobile devices (iPhone SE → desktop)
- ✅ Consistent design language across app
- ✅ Improved user experience

---

## 2025-10-04: Critical Database Fixes
**Type:** Bug Fix
**Branch:** refit/user-auth-onboarding
**Migration:** 20251004173139_fix_critical_cascade_and_unique_issues

### What Changed
1. **Fixed DocChunk cascade deletion**
   - Added `onDelete: Cascade` to DocChunk → Document relation
   - Users can now delete documents without foreign key errors

2. **Added Person.ownerId unique constraint**
   - Prevents duplicate Person records per user
   - Data integrity enforcement

### Why
- Users couldn't delete documents (cascade was missing)
- Person.ownerId uniqueness wasn't enforced at DB level

### Impact
- ✅ Document deletion works correctly
- ✅ Data integrity improved
- ✅ Production-ready database schema

---

## 2025-10-04: API Route Dynamic Rendering
**Type:** Bug Fix
**Branch:** refit/user-auth-onboarding
**Commits:** Multiple

### What Changed
- Added `export const dynamic = 'force-dynamic'` to 17 API routes
- All routes using `requireUserId` marked as dynamic

### Why
- Next.js 14 App Router tries to prerender API routes at build time
- Routes accessing `request.headers` must be marked as dynamic
- Build was failing with "couldn't be rendered statically" errors

### Routes Fixed
- `/api/observations`, `/api/chat`, `/api/documents/*`, etc.
- All routes with authentication

### Impact
- ✅ Vercel builds succeed
- ✅ API routes work correctly at runtime
- ✅ No static prerendering conflicts

---

## Template for Future Entries

## YYYY-MM-DD: [Change Title]
**Type:** [Feature | Bug Fix | Refactor | Documentation | Infrastructure]
**Branch:** [branch-name]
**Commit(s):** [commit-hash or "Multiple"]

### What Changed
- Bullet point list of changes

### Why
- Reason for the change

### Impact
- What this enables or fixes
