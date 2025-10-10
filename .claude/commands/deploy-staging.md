# Deploy to Staging

Deploy the current code to Vercel staging environment with full validation and database synchronization.

**Usage:** `/project:deploy-staging` or `/project:deploy-staging [commit-message]`

**What this command does:**
1. Validates current branch and git state
2. Runs code quality checks (lint, typecheck, tests)
3. Invokes subagents for pre-deployment validation
4. Merges current branch to staging
5. Applies database migrations to staging Supabase project
6. Pushes to GitHub to trigger Vercel deployment
7. Validates deployment success

---

## Deployment Workflow

You are deploying EverMed to the **staging environment** for QA and validation before production.

### Environment Details
- **Target Branch:** `staging`
- **Supabase Project:** `jwarorrwgpqrksrxmesx` (staging)
- **Vercel Environment:** Preview/Staging
- **Config File:** `.env.staging`

### Step 1: Pre-Deployment Validation

**Check current state:**
```bash
# Get current branch
git branch --show-current

# Check git status
git status

# Check for uncommitted changes
git diff --stat
```

**Questions to ask user if unclear:**
- If there are uncommitted changes: "You have uncommitted changes. Should I commit them first? What commit message should I use?"
- If not on dev branch: "You're on branch [X]. Should I switch to dev or proceed from this branch?"
- If behind remote: "Your branch is behind remote. Should I pull latest changes first?"

### Step 2: Code Quality Checks

Run validation before deployment:

```bash
# Lint check
npm run lint

# Type check
npm run typecheck

# Run tests
npm run test

# Build check
npm run build
```

**If any checks fail:**
- Report failures to user
- Ask: "There are [lint/type/test] errors. Should I:
  1. Try to fix them automatically
  2. Skip and deploy anyway (not recommended)
  3. Cancel deployment"

### Step 3: Invoke Subagents for Validation

**MANDATORY: Use the pr-validation-orchestrator subagent** before deploying:

```
I'm going to invoke the pr-validation-orchestrator subagent to validate the code before staging deployment.
```

Use the Task tool with subagent_type="pr-validation-orchestrator" and prompt:
```
Validate code readiness for staging deployment:
- Run through CODE_REVIEW.md checklist
- Verify all tests pass
- Check guard files are intact
- Validate no critical issues exist
- Generate validation report

This is for staging deployment (branch: staging, environment: preview).
```

**If validation finds issues:**
- Report issues to user
- Ask: "Validation found [X] issues. Should I:
  1. Fix the issues before deploying
  2. Deploy anyway (if issues are non-critical)
  3. Cancel deployment"

### Step 4: Database Migration Planning

**Check for pending migrations:**

```bash
# Check Prisma migration status for staging
npx prisma migrate status --schema=db/schema.prisma
```

**If migrations are pending:**
- List the pending migrations to user
- Ask: "There are [X] pending migrations:
  [list migrations]

  Should I apply these to the staging database before deployment?"

**Important:** Always apply migrations BEFORE deploying code to avoid runtime errors.

### Step 5: Merge to Staging Branch

**Execute merge workflow:**

```bash
# Fetch latest
git fetch origin

# Switch to staging
git checkout staging

# Pull latest staging
git pull origin staging

# Merge from dev (or current branch)
git merge dev --no-ff -m "chore(deploy): merge dev to staging for deployment

$ARGUMENTS

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**If merge conflicts occur:**
- Report conflicts to user
- Ask: "There are merge conflicts in:
  [list conflicting files]

  Should I:
  1. Abort and let you resolve conflicts manually
  2. Try to auto-resolve conflicts
  3. Show me the conflicts"

### Step 6: Apply Database Migrations to Staging

**Connect to staging Supabase project and apply migrations:**

```bash
# Link to staging project
supabase link --project-ref jwarorrwgpqrksrxmesx

# Verify connection
supabase projects list

# Preview migrations
supabase db diff

# Apply migrations
supabase db push
```

**If migration application fails:**
- Show error to user
- Ask: "Database migration failed with error:
  [error message]

  Should I:
  1. Rollback the git merge and abort deployment
  2. Continue deployment (database will be out of sync - NOT RECOMMENDED)
  3. Try manual migration approach"

**Check for new storage buckets or policies:**
- Look for SQL files in `db/migrations/` that create storage buckets
- If found, inform user: "Found storage bucket migration: [filename]. This needs to be applied to staging."
- Execute the SQL manually if needed

### Step 7: Push to GitHub (Triggers Vercel Deployment)

**Push staging branch to trigger deployment:**

```bash
# Push staging to GitHub
git push origin staging
```

**Monitor deployment:**
```bash
# Check Vercel deployment status
vercel ls --scope thomasallnices-projects

# Get deployment URL
vercel inspect [deployment-url]
```

**Inform user:**
"Pushed to staging branch. Vercel deployment triggered.
Deployment URL: [url]
You can monitor progress at: https://vercel.com/thomasallnices-projects/evermed-app"

### Step 8: Post-Deployment Validation

**MANDATORY: Use deployment-validator subagent** to verify deployment:

```
I'm going to invoke the deployment-validator subagent to validate the staging deployment.
```

Use the Task tool with subagent_type="deployment-validator" (if available) or general-purpose agent to:
1. Navigate to staging URL
2. Check critical pages load without errors
3. Verify database connectivity
4. Test authentication flow
5. Check console for errors

**Report validation results to user:**
- ✅ "Staging deployment successful! All checks passed."
- ⚠️ "Staging deployed but [X] issues found: [list issues]"
- ❌ "Staging deployment failed: [error]"

### Step 9: Cleanup and Return to Dev Branch

**Switch back to dev branch:**

```bash
# Return to dev branch
git checkout dev

# Optional: Pull latest dev
git pull origin dev
```

**Inform user:**
"Deployment complete! You're back on the dev branch.

Summary:
- Branch: staging
- Supabase: jwarorrwgpqrksrxmesx
- Vercel: [deployment-url]
- Status: [success/warning/failed]

Next steps:
- Test the staging deployment thoroughly
- If everything works, you can promote to production with /project:deploy-production"

---

## Error Handling

**If any step fails:**
1. Report the exact error to user
2. Suggest possible fixes
3. Ask whether to:
   - Retry the failed step
   - Skip the step (if safe)
   - Abort deployment

**Rollback procedure if deployment fails critically:**
```bash
# Revert staging branch
git checkout staging
git reset --hard origin/staging
git push origin staging --force

# Inform user
"Rolled back staging branch to previous state. Deployment aborted."
```

---

## Best Practices

1. **Always validate before deploying** - Use pr-validation-orchestrator
2. **Apply migrations first** - Database schema must match code
3. **Never skip tests** - Failed tests indicate broken functionality
4. **Monitor deployment** - Don't assume success, verify it
5. **Document issues** - If deployment succeeds with warnings, note them

---

## Notes

- This command assumes you're deploying from `dev` branch to `staging`
- If deploying from a feature branch, the command will ask for confirmation
- Database migrations are applied via Supabase CLI (not Prisma migrate deploy)
- Vercel deployment is triggered automatically via GitHub Actions
- Use `$ARGUMENTS` to provide custom commit message

**Example usage:**
- `/project:deploy-staging` - Deploy with default commit message
- `/project:deploy-staging "Add metabolic insights feature"` - Deploy with custom message
