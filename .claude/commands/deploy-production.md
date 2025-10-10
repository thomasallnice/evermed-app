# Deploy to Production

Deploy the current code to Vercel production environment with maximum validation and safety checks.

**Usage:** `/project:deploy-production` or `/project:deploy-production [release-version]`

**⚠️ WARNING:** This deploys to PRODUCTION. Use with extreme caution.

**What this command does:**
1. Validates staging deployment is healthy
2. Runs comprehensive code quality checks
3. Invokes multiple subagents for validation
4. Requires explicit user confirmation
5. Merges staging to main branch
6. Applies database migrations to production Supabase project
7. Creates git tag for release tracking
8. Pushes to GitHub to trigger Vercel production deployment
9. Validates production deployment
10. Monitors for immediate issues

---

## Deployment Workflow

You are deploying EverMed to **PRODUCTION** - the live environment used by real users.

### Environment Details
- **Target Branch:** `main`
- **Source Branch:** `staging` (always deploy from staging)
- **Supabase Project:** `nqlxlkhbriqztkzwbdif` (production)
- **Vercel Environment:** Production
- **Config File:** `.env.production`

### Step 0: Pre-Flight Safety Checks

**🚨 MANDATORY SAFETY QUESTIONS:**

Before starting, ask the user:

1. **"Have you thoroughly tested the staging deployment?"**
   - If NO: "Please test staging first at [staging-url]. Deployment aborted."
   - If UNSURE: "Please test staging before production deployment. Deployment aborted."

2. **"Is this an emergency hotfix or planned release?"**
   - If EMERGENCY: Proceed with expedited workflow (skip some validations)
   - If PLANNED: Use full validation workflow

3. **"What is the release version?"**
   - Suggest: "v[YYYY].[MM].[patch]" (e.g., v2025.01.5)
   - Use `$ARGUMENTS` if provided, otherwise ask

4. **"Have you reviewed the changes going to production?"**
   - Show: `git log staging..main --oneline`
   - Ask: "Review these commits. Ready to deploy?"

**If ANY answer raises concerns, ABORT deployment and ask for clarification.**

### Step 1: Validate Staging Deployment

**Check staging is healthy:**

```bash
# Get latest staging deployment
vercel ls --scope thomasallnices-projects | grep staging

# Check staging deployment status
curl -I https://[staging-url]
```

**CRITICAL: Invoke deployment-validator subagent for staging:**

```
I'm going to validate the staging deployment before promoting to production.
```

Use Task tool with subagent_type="general-purpose" (or deployment-validator if available):
```
Validate staging deployment health:
1. Navigate to staging URL
2. Test all critical user flows
3. Check for console errors
4. Verify API endpoints respond correctly
5. Test authentication
6. Check database connectivity
7. Report any issues found

Staging URL: [staging-url]
This is a pre-production validation check.
```

**If staging validation fails:**
- Report issues to user
- ABORT deployment
- Say: "Staging has [X] issues. Fix these before production deployment:
  [list issues]"

### Step 2: Code Quality Checks (Maximum Rigor)

Run all validation checks:

```bash
# Lint check (must pass)
npm run lint

# Type check (must pass)
npm run typecheck

# Run all tests (must pass)
npm run test

# Build check (must pass)
npm run build

# Check for guard files
ls -la docs/CODEX_START_PROMPT.txt scripts/smoke-e2e.sh docs/BOOTSTRAP_PROMPT.md AGENTS.md
```

**If ANY check fails:**
- Report failure to user
- BLOCK deployment (no option to skip for production)
- Say: "Production deployment requires all checks to pass. Fix [issue] before deploying."

### Step 3: Invoke Multiple Subagents (Comprehensive Validation)

**🔴 MANDATORY: Multiple validation layers for production**

**A) PR Validation Orchestrator:**

```
Invoking pr-validation-orchestrator for production deployment validation...
```

Use Task tool with subagent_type="pr-validation-orchestrator":
```
Validate code for PRODUCTION deployment:
- Complete CODE_REVIEW.md checklist
- Verify all tests pass
- Check guard files intact
- Validate no critical issues
- Verify no security vulnerabilities
- Check for performance regressions
- Generate comprehensive validation report

Environment: PRODUCTION (branch: main)
Source: staging branch
```

**B) Medical Compliance Guardian (if medical features changed):**

Check if medical-related files were modified:
```bash
git diff staging..main --name-only | grep -E "(chat|explain|medical|observation|rag)"
```

If medical files changed:
```
Invoking medical-compliance-guardian to validate medical content compliance...
```

Use Task tool with subagent_type="medical-compliance-guardian":
```
Review all medical-related changes for production deployment:
- Validate non-SaMD compliance
- Check medical disclaimers present
- Verify refusal templates for diagnosis/dosing/triage
- Ensure proper citations on medical content
- Validate no SaMD violations introduced

Review changes from staging to main.
```

**C) Security Review (Database & API):**

If database or API changes detected:
```bash
git diff staging..main --name-only | grep -E "(schema.prisma|migration|api/|auth)"
```

If found:
```
Invoking database-architect and api-contract-validator for security review...
```

Use appropriate subagents to validate:
- Database migration safety
- RLS policy correctness
- API contract compliance
- No security regressions

**If ANY validation fails:**
- Report all issues to user
- BLOCK deployment
- Provide detailed remediation steps
- Say: "Production deployment blocked due to validation failures. Address these issues before deploying."

### Step 4: User Confirmation Checkpoint

**🛑 EXPLICIT CONFIRMATION REQUIRED:**

Show deployment summary:
```
Production Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source: staging branch
Target: main (PRODUCTION)
Release: $ARGUMENTS
Supabase: nqlxlkhbriqztkzwbdif

Changes:
[show git log staging..main]

Validations:
✅ Staging healthy
✅ All tests pass
✅ Code quality checks pass
✅ Subagent validations pass
✅ Guard files intact

Pending Migrations: [list if any]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  This will deploy to PRODUCTION.
⚠️  Real users will be affected.
⚠️  Downtime may occur during deployment.

Type 'DEPLOY TO PRODUCTION' to confirm, or anything else to abort:
```

**Wait for exact text match: "DEPLOY TO PRODUCTION"**
- If user types exact match: Proceed
- If user types anything else: ABORT and say "Production deployment cancelled."

### Step 5: Database Migration Planning (Production)

**🔴 CRITICAL: Production database changes require extreme care**

```bash
# Link to production Supabase project
supabase link --project-ref nqlxlkhbriqztkzwbdif

# Check migration status
npx prisma migrate status --schema=db/schema.prisma
```

**If migrations pending:**
- List migrations to user
- Show migration content: `cat db/migrations/[migration-file]/migration.sql`
- Ask: "⚠️ PRODUCTION DATABASE CHANGES ⚠️

  These migrations will be applied to the production database:
  [list migrations with file contents]

  Production database has REAL USER DATA.

  Confirm you have:
  ✓ Reviewed migration SQL
  ✓ Tested on staging database
  ✓ Have backup strategy ready
  ✓ Understand rollback procedure

  Type 'APPLY MIGRATIONS' to proceed:"

**Wait for exact text: "APPLY MIGRATIONS"**
- If not exact match: ABORT

**Before applying migrations:**
```bash
# Create manual backup point (document only, user should do via Supabase dashboard)
echo "⚠️ RECOMMENDED: Create manual database backup via Supabase Dashboard before proceeding"
echo "https://supabase.com/dashboard/project/nqlxlkhbriqztkzwbdif/database/backups"
```

Ask: "Have you created a manual backup? (yes/no)"
- If NO: Strongly recommend but allow override with warning

### Step 6: Merge Staging to Main

**Execute merge with protection:**

```bash
# Fetch latest
git fetch origin

# Switch to main
git checkout main

# Ensure main is up to date
git pull origin main

# Show what will be merged
git log main..staging --oneline

# Merge from staging with explicit merge commit
git merge staging --no-ff -m "chore(release): deploy $ARGUMENTS to production

Deploying from staging to production.
All validation checks passed.

Changes:
$(git log main..staging --oneline | head -10)

Release: $ARGUMENTS
Environment: Production
Supabase: nqlxlkhbriqztkzwbdif

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**If merge conflicts occur:**
- Show conflicts to user
- ABORT deployment
- Say: "Merge conflicts detected. This should NEVER happen in production deployment.

  Conflicts in:
  [list files]

  The staging and main branches have diverged. This indicates:
  1. Changes were made directly to main (WRONG)
  2. Hotfixes were applied to main but not backported to staging

  Resolution:
  1. Abort this deployment
  2. Investigate why branches diverged
  3. Backport changes to staging
  4. Re-test staging
  5. Try deployment again"

### Step 7: Create Release Tag

**Tag the release for tracking:**

```bash
# Create annotated tag
git tag -a "$ARGUMENTS" -m "Release $ARGUMENTS

Production deployment from staging.

Changelog:
$(git log staging..main --oneline | head -20)

Deployed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Supabase: nqlxlkhbriqztkzwbdif
Vercel: Production
"

# Show tag
git show $ARGUMENTS --no-patch
```

Ask: "Release tag created. Review above. Proceed with deployment?"

### Step 8: Apply Production Database Migrations

**🔴 EXTREME CAUTION: Production database**

```bash
# Verify connection to production
supabase projects list | grep nqlxlkhbriqztkzwbdif

# Show diff one more time
supabase db diff

# Apply migrations to PRODUCTION
supabase db push
```

**Monitor migration:**
- Watch for errors
- If ANY error occurs:
  - IMMEDIATELY stop
  - Do NOT push code to GitHub
  - Attempt rollback if possible
  - Alert user with full error details

**If migration succeeds:**
```
✅ Production database migrations applied successfully.
```

**Check for storage bucket migrations:**
- Look for SQL in `db/migrations/*storage*`
- If found: "Found storage migration. Executing manually..."
- Apply via Supabase SQL Editor if needed

### Step 9: Push to GitHub (Triggers Production Deployment)

**⚠️ POINT OF NO RETURN ⚠️**

Ask one final time:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 FINAL CONFIRMATION 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to push to GitHub and deploy to PRODUCTION.

✅ All validations passed
✅ Database migrations applied
✅ Release tag created: $ARGUMENTS

This will:
- Push main branch to GitHub
- Push release tag
- Trigger Vercel production deployment
- Affect REAL USERS immediately

Type 'PUSH TO PRODUCTION' to deploy:
```

**Wait for exact text: "PUSH TO PRODUCTION"**

If confirmed:
```bash
# Push main branch
git push origin main

# Push tag
git push origin $ARGUMENTS

# Inform user
echo "🚀 Pushed to production!"
echo "Vercel deployment starting..."
```

**Monitor deployment:**
```bash
# Check deployment status
vercel ls --scope thomasallnices-projects --prod

# Get production URL
echo "Production URL: https://evermed-app.vercel.app"
```

### Step 10: Post-Deployment Validation (Production)

**🔴 CRITICAL: Validate production immediately**

```
Validating production deployment...
```

Use Task tool (general-purpose agent):
```
URGENT: Validate production deployment immediately:

1. Navigate to https://evermed-app.vercel.app
2. Check homepage loads without errors
3. Test authentication flow
4. Verify critical API endpoints
5. Check for console errors
6. Test database connectivity
7. Verify no 500 errors
8. Check performance (load time < 3s)

This is PRODUCTION. Report any issues immediately.
```

**Validation checklist (manual):**
- [ ] Homepage loads
- [ ] Login works
- [ ] Document upload works
- [ ] Chat works
- [ ] No console errors
- [ ] Database queries work
- [ ] API responds correctly

**If validation finds critical issues:**
- Alert user immediately
- Provide rollback instructions
- Consider emergency rollback

**If validation passes:**
```
✅ Production deployment successful!
✅ All health checks passed
✅ Production is live
```

### Step 11: Post-Deployment Monitoring

**Set up monitoring:**

```
Production deployed successfully!

IMMEDIATE ACTION REQUIRED:
1. Monitor Vercel dashboard for errors: https://vercel.com/thomasallnices-projects/evermed-app
2. Check Supabase logs: https://supabase.com/dashboard/project/nqlxlkhbriqztkzwbdif/logs
3. Watch for user reports
4. Monitor performance metrics

Next 30 minutes: Active monitoring required
Next 24 hours: Regular monitoring recommended
```

**Create monitoring checklist:**
- [ ] Check Vercel errors (0 expected)
- [ ] Check Supabase logs (no errors)
- [ ] Monitor response times
- [ ] Check user activity (should be normal)
- [ ] Verify no spike in error rate

### Step 12: Cleanup and Documentation

**Return to dev branch:**

```bash
# Switch back to dev
git checkout dev

# Pull latest to include production changes
git pull origin main

# Update dev with production state
git merge main --no-ff -m "chore: sync dev with production release $ARGUMENTS"
```

**Generate deployment report:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 PRODUCTION DEPLOYMENT COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Release: $ARGUMENTS
Branch: main (production)
Supabase: nqlxlkhbriqztkzwbdif
Deployed: [timestamp]

Changes Deployed:
[git log summary]

Status: ✅ LIVE

Production URL: https://evermed-app.vercel.app

Monitoring:
- Vercel: https://vercel.com/thomasallnices-projects/evermed-app
- Supabase: https://supabase.com/dashboard/project/nqlxlkhbriqztkzwbdif/logs

Next Steps:
1. Monitor for 30 minutes
2. Update release notes
3. Notify stakeholders
4. Backport any hotfixes to staging/dev

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Emergency Rollback Procedure

**If production deployment fails critically:**

```bash
# 1. Revert main branch
git checkout main
git revert HEAD --no-edit
git push origin main

# 2. Revert database migrations (if needed)
# MANUAL STEP: Use Supabase Dashboard to restore from backup
echo "⚠️ If database was migrated, restore from backup via Supabase Dashboard"

# 3. Delete bad release tag
git tag -d $ARGUMENTS
git push origin :refs/tags/$ARGUMENTS

# 4. Inform user
echo "🔴 EMERGENCY ROLLBACK EXECUTED"
echo "Main branch reverted to previous state"
echo "Database: [needs manual restore if migrated]"
echo "Tag deleted: $ARGUMENTS"
```

**Post-rollback:**
- Investigate failure cause
- Fix issues
- Re-test on staging
- Attempt deployment again when ready

---

## Safety Guardrails

**This command includes multiple safety layers:**

1. ✅ Staging validation required
2. ✅ Comprehensive code quality checks
3. ✅ Multiple subagent validations
4. ✅ Three explicit user confirmations
5. ✅ Database backup recommendations
6. ✅ Release tagging for tracking
7. ✅ Post-deployment validation
8. ✅ Monitoring setup
9. ✅ Emergency rollback procedure
10. ✅ Never skips validations for production

**Cannot be bypassed:**
- All tests must pass
- Staging must be healthy
- User must type exact confirmation text
- Subagent validations must pass

---

## Best Practices

1. **Always deploy during low-traffic hours** (if possible)
2. **Have team available** during production deployment
3. **Test thoroughly on staging** before production
4. **Create manual database backup** before migrating
5. **Monitor immediately** after deployment
6. **Have rollback plan ready**
7. **Communicate with stakeholders** about deployment
8. **Document any issues** encountered

---

## Notes

- This command deploys from `staging` to `main` ONLY
- Direct deployments to production from feature branches are BLOCKED
- Database migrations are applied BEFORE code deployment
- Release tags follow semantic versioning: v[YEAR].[MONTH].[PATCH]
- All confirmations require EXACT text match (case-sensitive)
- Emergency hotfixes can use expedited workflow but still require validation

**Example usage:**
- `/project:deploy-production` - Will prompt for version
- `/project:deploy-production v2025.01.5` - Deploys with specified version
