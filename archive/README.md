# Archive Directory

This directory contains files that are no longer actively used but are preserved for historical reference.

## Directory Structure

### `deployment-docs/`
**Archived:** 2025-10-08
**Reason:** Superseded by comprehensive deployment documentation

**Files:**
- `DEPLOYMENT_QUICK_START.md` - Superseded by `.claude/sops/deployment.md`
- `VERCEL_FIX.md` - One-time Vercel configuration fixes (now resolved)
- `VERCEL_CONFIG_REQUIRED.md` - Monorepo configuration issues (now resolved)

**Replacement:** See `.claude/sops/deployment.md` for current deployment procedures

---

### `db-validation-reports/`
**Archived:** 2025-10-08
**Reason:** One-time validation reports from initial deployment setup

**Files:**
- `DEPLOYMENT_VALIDATION_REPORT.md` - Initial deployment validation (2025-10-04)
- `SECURITY_VALIDATION_REPORT.md` - RLS security validation (2025-10-04)
- `VALIDATION_SUMMARY.md` - Summary of validation findings
- `DEPLOYMENT_FIX_PLAN.md` - Plan for fixing deployment issues (completed)

**Status:** All issues documented in these reports have been resolved. Current issues tracked in `.claude/memory/active-issues.md`

---

### `old-configs/`
**Archived:** 2025-10-08
**Reason:** Obsolete configuration files from pre-monorepo structure

**Files:**
- `vercel.json.old` - Pre-monorepo Vercel configuration (used `app/` instead of `apps/web/`)

**Replacement:** See `vercel.json` in repository root

---

### `duplicate-docs/`
**Archived:** 2025-10-08
**Reason:** Duplicate documentation now consolidated in other locations

**Files:**
- `DEPLOYMENT_CHECKLIST.md` (from db/) - Duplicate of root `DEPLOYMENT_CHECKLIST.md`
- `QUICK_START.md` - Superseded by `.claude/sops/` SOPs
- `RLS_IMPLEMENTATION_SUMMARY.md` - Now documented in `.claude/sops/database-changes.md`

**Replacements:**
- Deployment: `DEPLOYMENT_CHECKLIST.md` (root) + `.claude/sops/deployment.md`
- Quick Start: See `.claude/sops/` for all SOPs
- RLS: See `.claude/sops/database-changes.md`

---

## Active Documentation

For current documentation, see:

**Project Overview:**
- `README.md` - Project overview and setup
- `CLAUDE.md` - Development guide for Claude Code

**Memory & SOPs:**
- `.claude/memory/` - Current project state, recent changes, active issues
- `.claude/sops/` - Standard operating procedures (database, API, testing, deployment)

**Database:**
- `db/schema.prisma` - Current schema
- `db/README_SECURITY.md` - RLS security guidelines
- `db/SUPABASE_SECURITY_GUIDE.md` - Supabase security best practices
- `db/STORAGE_SECURITY_EXAMPLES.md` - Storage security examples
- `db/AVATARS_STORAGE_GUIDE.md` - Avatar storage implementation
- `db/SCHEMA_DIAGRAM.md` - Database schema diagram

**Deployment:**
- `DEPLOYMENT.md` - Main deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `.claude/sops/deployment.md` - Deployment SOP

**Development:**
- `CODE_REVIEW.md` - Code review checklist
- `CONTRIBUTING.md` - Contribution guidelines
- `AGENTS.md` - Agent-specific instructions

---

## Retrieval

If you need to reference archived files:

1. Check this README to find which archive directory contains the file
2. Files are preserved with git history intact
3. For current information, use the replacements listed above

---

**Last Updated:** 2025-10-08
**Archived By:** Claude Code cleanup
