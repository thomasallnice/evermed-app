# Deploy to Staging

Deploy the current code to Vercel staging environment with comprehensive validation, ORM client generation, and database synchronization.

**Usage:** `/project:deploy-staging` or `/project:deploy-staging [commit-message]`

**What this command does:**
1. Validates current branch and git state
2. **[NEW]** Verifies Prisma client generation and ORM setup
3. **[NEW]** Runs comprehensive TypeScript validation (clean build + full type check)
4. Runs code quality checks (lint, tests)
5. **[NEW]** Uses time-boxed debugging with escape hatch decision logic
6. Merges current branch to staging
7. Applies database migrations to staging
8. Pushes to GitHub to trigger Vercel deployment
9. Validates deployment success

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
Questions to ask user if unclear:

If there are uncommitted changes: "You have uncommitted changes. Should I commit them first? What commit message should I use?"
If not on dev branch: "You're on branch [X]. Should I switch to dev or proceed from this branch?"
If behind remote: "Your branch is behind remote. Should I pull latest changes first?"

Step 2: Prisma/ORM Client Verification ⚠️ CRITICAL
[NEW] Verify Prisma setup before ANY other checks:
bash# 1. Check if Prisma client exists
if [ ! -f "node_modules/.prisma/client/index.d.ts" ]; then
  echo "⚠️  Prisma client not generated!"
  npx prisma generate
fi

# 2. Verify package.json has generation hooks
grep -q "postinstall.*prisma generate" package.json || echo "⚠️  Missing postinstall hook"
grep -q "prebuild.*prisma.*generate" package.json || echo "⚠️  Missing prebuild hook"

# 3. Check Prisma client version matches
npx prisma --version
If Prisma hooks are missing:

STOP deployment immediately
Report to user: "🚨 CRITICAL: package.json is missing Prisma generation hooks. This will cause Vercel builds to fail."
Ask: "Should I:

Add the missing hooks to package.json
Cancel deployment (you add them manually)



Recommended: Option 1"
Add missing hooks automatically:
json{
  "scripts": {
    "postinstall": "prisma generate",
    "prebuild": "npm run clean:next && npm run prisma:generate",
    "prisma:generate": "prisma generate"
  }
}
Step 3: Comprehensive TypeScript Validation ⚠️ CRITICAL
[NEW] Run full type checking with clean build (prevents Vercel surprises):
bash# CRITICAL: Clean all caches first
echo "🧹 Cleaning build caches..."
rm -rf .next
rm -rf node_modules/.cache

# Run standalone TypeScript check (sees ALL errors at once)
echo "🔍 Running full TypeScript check (this catches all errors)..."
npx tsc --noEmit 2>&1 | tee /tmp/typescript-errors.txt

# Count errors
ERROR_COUNT=$(grep "error TS" /tmp/typescript-errors.txt | wc -l)

echo "📊 Found $ERROR_COUNT TypeScript errors"
[NEW] Decision matrix based on error count:
If ERROR_COUNT = 0:
bashecho "✅ TypeScript validation passed!"
# Proceed to next step
If ERROR_COUNT > 0 and ERROR_COUNT <= 10:
bashecho "⚠️  Found $ERROR_COUNT TypeScript errors (manageable)"
cat /tmp/typescript-errors.txt | head -20

# Ask user:
"I found $ERROR_COUNT TypeScript errors. These should be fixed before deploying.

Should I:
1. Try to fix them automatically (recommended, 15-30 min)
2. Show me all errors and I'll fix them manually
3. Skip and deploy anyway (NOT RECOMMENDED - will fail on Vercel)"
If ERROR_COUNT > 10 and ERROR_COUNT <= 20:
bashecho "⚠️  Found $ERROR_COUNT TypeScript errors (significant)"
cat /tmp/typescript-errors.txt | head -30

# Ask user:
"I found $ERROR_COUNT TypeScript errors. This is more than expected.

Should I:
1. Try to batch-fix them (may take 1 hour)
2. Use 'ignoreBuildErrors' escape hatch (ONLY if you've verified code works locally)
3. Cancel deployment and you'll fix them manually

Note: We learned from recent incident that fixing errors one-by-one on Vercel wastes hours. 
Better to fix locally or use escape hatch."
If ERROR_COUNT > 20:
bashecho "🚨 Found $ERROR_COUNT TypeScript errors (too many to fix individually)"
cat /tmp/typescript-errors.txt | head -50

# Recommend escape hatch immediately:
"I found $ERROR_COUNT TypeScript errors. This suggests either:
- Strict TypeScript was enabled without cleanup
- Environment mismatch between local and Vercel

RECOMMENDATION: Use 'ignoreBuildErrors: true' escape hatch.

This is pragmatic when:
✅ You've verified code works locally
✅ Errors are stylistic (implicit 'any') not logic bugs
✅ Fixing would take 3+ hours

Should I:
1. Add 'ignoreBuildErrors: true' to next.config.js (recommended)
2. Try to fix errors anyway (will take several hours)
3. Cancel deployment

Reference: We spent 6+ hours on similar issue recently. Escape hatch is valid option."
Step 4: Production Build Validation
[NEW] Run Next.js build (not just tsc) to catch build-specific issues:
bashecho "🏗️  Running production build..."
npm run build 2>&1 | tee /tmp/build-output.txt

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo "✅ Build passed!"
else
  echo "❌ Build failed with exit code $BUILD_EXIT_CODE"
  
  # Check if it's a Prisma issue
  if grep -q "@prisma/client did not initialize" /tmp/build-output.txt; then
    echo "🚨 CRITICAL: Prisma client not initialized!"
    echo "Running: npx prisma generate"
    npx prisma generate
    echo "Retrying build..."
    npm run build
  else
    # Show errors to user
    cat /tmp/build-output.txt | tail -50
    
    # Ask user what to do
    echo "Build failed. Should I:
    1. Show full build log
    2. Try to fix automatically
    3. Cancel deployment"
  fi
fi
Step 5: Lint and Test Checks
bash# Lint check
echo "🔍 Running lint check..."
npm run lint

# Run tests (if they exist)
if grep -q "\"test\":" package.json; then
  echo "🧪 Running tests..."
  npm run test
fi
If any checks fail:

Report failures to user with counts
Show first 10-20 errors
Ask for decision (fix, skip, cancel)

Step 6: [NEW] Time-Boxed Debugging Decision Point
[NEW] Before proceeding, check how much time has been spent:
bashVALIDATION_START_TIME=$(date +%s)

# ... run all validations ...

VALIDATION_END_TIME=$(date +%s)
VALIDATION_DURATION=$((VALIDATION_END_TIME - VALIDATION_START_TIME))

if [ $VALIDATION_DURATION -gt 1800 ]; then  # 30 minutes
  echo "⏱️  Validation has taken ${VALIDATION_DURATION}s (30+ min)"
  echo "This suggests deeper issues. Consider using escape hatches."
fi
Decision logic:

< 30 min + errors found: Continue fixing


30 min + still finding errors: Recommend escape hatch




60 min: STRONGLY recommend escape hatch or cancel



Step 7: Version Verification ⚠️ CRITICAL
[NEW] Verify all critical versions are pinned:
bashecho "🔍 Checking version pinning..."

# Check TypeScript
TS_VERSION=$(cat package.json | grep '"typescript"' | grep -o '[0-9.]*')
if [[ $TS_VERSION == *"^"* ]] || [[ $TS_VERSION == *"~"* ]]; then
  echo "⚠️  TypeScript version uses range (^$TS_VERSION) instead of exact version"
  echo "This can cause environment mismatches between local and Vercel"
  echo "Should I pin to exact version? (recommended: yes)"
fi

# Check other critical deps
echo "📦 Current versions:"
echo "- TypeScript: $(npx tsc --version)"
echo "- Next.js: $(npm list next --depth=0 | grep next@)"
echo "- Prisma: $(npx prisma --version | head -1)"
If versions use ^ or ~:

Recommend pinning to exact versions
Offer to update package.json automatically

Step 8: Invoke Subagents for Validation
Use pr-validation-orchestrator subagent:
I'm invoking the pr-validation-orchestrator subagent to validate code readiness for staging deployment.
Use the Task tool with subagent_type="pr-validation-orchestrator" and prompt:
Validate code readiness for staging deployment:
- Run through CODE_REVIEW.md checklist
- Verify all tests pass
- Check guard files are intact
- Validate no critical issues exist
- Generate validation report

CONTEXT: This is for staging deployment after comprehensive TypeScript validation.
All TypeScript errors have been [resolved/documented with escape hatch].
Focus on logic errors, security issues, and functionality validation.

Environment: staging (branch: staging, Supabase: jwarorrwgpqrksrxmesx)
Step 9: Database Migration Planning
Check for pending migrations:
bash# Check Prisma migration status
echo "🗄️  Checking database migrations..."
npx prisma migrate status --schema=db/schema.prisma

# [NEW] Also check for schema drift
npx prisma migrate diff \
  --from-schema-datamodel db/schema.prisma \
  --to-schema-datasource db/schema.prisma \
  --script > /tmp/schema-drift.sql

if [ -s /tmp/schema-drift.sql ]; then
  echo "⚠️  Schema drift detected between local and remote database"
  cat /tmp/schema-drift.sql
fi
If migrations are pending:

List all pending migrations
Estimate impact (tables affected, data at risk)
Ask user: "Should I apply these to staging database?"
Always apply BEFORE deploying code

Step 10: Merge to Staging Branch
bash# Fetch latest
git fetch origin

# Switch to staging
git checkout staging

# Pull latest staging
git pull origin staging

# Merge from dev (or current branch)
MERGE_SOURCE=$(git branch --show-current)
git merge $MERGE_SOURCE --no-ff -m "chore(deploy): merge $MERGE_SOURCE to staging for deployment

$ARGUMENTS

Validated with:
- TypeScript: $(npx tsc --version) (pinned)
- Clean build: ✅ Passed
- Prisma client: ✅ Generated
- Migrations: ✅ Ready

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"
If merge conflicts:

Report conflicts
Offer to show diff
Ask for decision (abort, auto-resolve, manual)

Step 11: Apply Database Migrations to Staging
bash# Link to staging project
supabase link --project-ref jwarorrwgpqrksrxmesx

# Apply migrations
echo "🗄️  Applying migrations to staging database..."
supabase db push

# [NEW] Verify migration success
if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully"
  
  # Regenerate Prisma client with new schema
  echo "🔄 Regenerating Prisma client..."
  npx prisma generate
else
  echo "❌ Migration failed!"
  echo "Should I:
  1. Rollback git merge and abort deployment
  2. Show migration error details
  3. Continue anyway (NOT RECOMMENDED - will cause runtime errors)"
fi
Step 12: Final Pre-Push Verification
[NEW] One last check before pushing:
bashecho "🔍 Final verification before push..."

# 1. Verify we're on staging branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "staging" ]; then
  echo "❌ Not on staging branch! Currently on: $CURRENT_BRANCH"
  exit 1
fi

# 2. Verify Prisma client exists
if [ ! -f "node_modules/.prisma/client/index.d.ts" ]; then
  echo "⚠️  Prisma client missing! Generating..."
  npx prisma generate
fi

# 3. Verify package.json has correct scripts
if ! grep -q "prebuild.*prisma" package.json; then
  echo "⚠️  WARNING: prebuild script doesn't include Prisma generation"
  echo "Vercel build will fail without this!"
fi

echo "✅ All pre-push checks passed"
Step 13: Push to GitHub (Triggers Vercel Deployment)
bash# Push staging to GitHub
echo "🚀 Pushing to GitHub (this triggers Vercel deployment)..."
git push origin staging

# Get deployment URL
echo "📊 Monitoring Vercel deployment..."
echo "Dashboard: https://vercel.com/thomasallnices-projects/evermed-app"
Inform user with comprehensive summary:
✅ Pushed to staging branch!

Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Validations:
  - TypeScript: $ERROR_COUNT errors [$ERROR_STATUS]
  - Build: ✅ Passed (clean build)
  - Prisma: ✅ Client generated
  - Tests: ✅ Passed
  - Migrations: ✅ Applied to staging

🔧 Configuration:
  - TypeScript: $(npx tsc --version) (pinned)
  - Prisma: $(npx prisma --version | head -1)
  - Branch: staging
  
🚀 Deployment:
  - Environment: Staging
  - Vercel URL: https://vercel.com/thomasallnices-projects/evermed-app
  - Supabase: jwarorrwgpqrksrxmesx
  
⏱️  Estimated build time: 3-5 minutes

I'll monitor the deployment and notify you of the result.
Step 14: Monitor Vercel Build
[NEW] Actively monitor and report build progress:
bash# Poll Vercel API for build status
DEPLOYMENT_ID=$(vercel ls --scope thomasallnices-projects | grep staging | head -1 | awk '{print $1}')

echo "📊 Monitoring deployment: $DEPLOYMENT_ID"

# Check every 30 seconds
while true; do
  STATUS=$(vercel inspect $DEPLOYMENT_ID --scope thomasallnices-projects | grep "State:" | awk '{print $2}')
  
  case $STATUS in
    "BUILDING")
      echo "⏳ Still building... ($(date +%H:%M:%S))"
      ;;
    "READY")
      echo "✅ Deployment successful!"
      break
      ;;
    "ERROR")
      echo "❌ Deployment failed!"
      echo "Fetching build logs..."
      vercel logs $DEPLOYMENT_ID --scope thomasallnices-projects
      break
      ;;
  esac
  
  sleep 30
done
If build fails on Vercel:
bashecho "❌ Vercel build failed. Analyzing logs..."

# Check for common issues
if vercel logs $DEPLOYMENT_ID | grep "@prisma/client did not initialize"; then
  echo "🚨 ISSUE: Prisma client not generated on Vercel"
  echo "This means prebuild hook didn't run or isn't configured correctly"
  echo "
  Should I:
  1. Add 'prisma generate' to prebuild script
  2. Add postinstall script as backup
  3. Show me the full build log"
  
elif vercel logs $DEPLOYMENT_ID | grep "error TS"; then
  # Count TypeScript errors in Vercel build
  TS_ERRORS=$(vercel logs $DEPLOYMENT_ID | grep "error TS" | wc -l)
  
  echo "🚨 ISSUE: $TS_ERRORS TypeScript errors on Vercel"
  echo "But local build passed... this is an environment mismatch"
  echo "
  Should I:
  1. Add 'ignoreBuildErrors: true' to next.config.js (recommended)
  2. Try to debug environment differences (may take hours)
  3. Show me the specific errors"
  
else
  echo "🚨 Unknown build failure. Here are the last 50 lines:"
  vercel logs $DEPLOYMENT_ID | tail -50
fi
Step 15: Post-Deployment Validation

### Basic Health Checks

Use deployment-validator subagent:
Invoking deployment-validator subagent to verify staging deployment health.
Use Task tool with subagent to:

Check staging URL loads
Verify database connectivity
Test authentication
Check for console errors
Validate critical features

Report comprehensive validation results:
Deployment Validation Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ URL accessible
✅ Database connected
✅ Authentication working
⚠️  [Issue if any found]

Overall Status: [SUCCESS/WARNING/FAILED]

---

### Step 15.5: Optional Advanced Validation (Chrome DevTools MCP)

**[RECOMMENDED]** Run comprehensive Chrome DevTools validation:

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 RECOMMENDED: Advanced Staging Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run comprehensive Chrome DevTools validation?"
echo ""
echo "This validates:"
echo "  ✅ Console errors (document for dev fixes)"
echo "  ✅ Performance (p95 < 10s requirement)"
echo "  ✅ Security (SSL, API protection, data leaks)"
echo "  ✅ Medical safety compliance (disclaimers, refusals)"
echo "  ✅ Visual regression (screenshots vs baseline)"
echo "  ✅ Responsive design (mobile/tablet/desktop)"
echo ""
echo "⏱️  Takes ~3-5 minutes"
echo "📋 Generates bug report for development team"
echo "🎯 Recommended before promoting to production"
echo ""
echo "Run validation? [y/n]"

read RUN_VALIDATION

if [ "$RUN_VALIDATION" = "y" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 LAUNCHING CHROME DEVTOOLS VALIDATION"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "To run validation, execute:"
  echo ""
  echo "  /validate-staging-deployment"
  echo ""
  echo "This will:"
  echo "  1. Navigate to staging URL"
  echo "  2. Document ALL console errors (don't block, just report)"
  echo "  3. Run performance traces"
  echo "  4. Validate security (SSL, API protection)"
  echo "  5. Check medical compliance"
  echo "  6. Capture screenshots for visual regression"
  echo "  7. Test responsive design breakpoints"
  echo "  8. Generate bug report with GitHub issue templates"
  echo ""
  echo "📝 IMPORTANT: Validation will create action items for development:"
  echo "    - Console errors → Create GitHub issues"
  echo "    - Performance issues → Document for optimization"
  echo "    - Security issues → Flag as BLOCKERS for production"
  echo "    - Missing disclaimers → Flag as BLOCKERS for production"
  echo ""
  echo "Return here when validation completes to review action items."
  echo ""
  echo "Press Enter to acknowledge..."
  read

  echo ""
  echo "✅ Advanced validation completed"
  echo ""
  echo "📊 Review validation report and action items"
  echo ""
  echo "⚠️  CRITICAL REMINDER:"
  echo "    If validation found issues, create GitHub issues NOW."
  echo "    Track all bugs in development environment."
  echo "    Re-deploy to staging after fixes and re-validate."
  echo ""
else
  echo ""
  echo "⚠️  Skipping advanced validation"
  echo ""
  echo "⚠️  WARNING: You may miss:"
  echo "    - Console errors that break user experience"
  echo "    - Performance regressions"
  echo "    - Security issues (data leaks, unprotected APIs)"
  echo "    - Medical compliance violations"
  echo "    - Visual regressions"
  echo ""
  echo "Consider running validation manually before promoting to production:"
  echo "  /validate-staging-deployment"
  echo ""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**Why this step is critical for staging:**

- **Early Bug Detection**: Catch issues in staging before they reach production
- **Dev Team Feedback Loop**: Generate actionable bug reports for development
- **QA Gate**: Ensure staging is ready for production promotion
- **Performance Baseline**: Track performance metrics over time
- **Security Audit**: Validate no PHI leaks or security vulnerabilities
- **Medical Compliance**: Ensure all disclaimers and refusal templates are present

**When to run:**
- **ALWAYS** before promoting staging to production
- After major feature deployments
- After database migrations
- After API contract changes
- After UI/UX changes

**When to skip:**
- Urgent hotfix (but run validation after deployment)
- Chrome DevTools MCP not available
- Minor documentation-only changes

---

### Post-Validation Workflow

**If validation found issues:**

1. **Create GitHub Issues** (Don't rely on memory!)
   ```bash
   # For each issue found, create a GitHub issue:
   gh issue create --title "Bug: [Description]" \
     --body "**Found in:** Staging validation
   **Environment:** https://evermed-app-git-staging-thomasallnices-projects.vercel.app
   **Severity:** [BLOCKER/HIGH/MEDIUM/LOW]

   **Description:**
   [Detailed description from validation report]

   **Steps to Reproduce:**
   1. Navigate to [URL]
   2. [Action]
   3. [Expected vs Actual]

   **Console Error:**
   \`\`\`
   [Error message if applicable]
   \`\`\`

   **Screenshot:**
   ![Screenshot](tests/screenshots/staging/[filename].png)

   **Action Required:**
   - [ ] Fix in development environment
   - [ ] Deploy to staging
   - [ ] Re-validate with /validate-staging-deployment
   - [ ] Promote to production only after fix verified"
   ```

2. **Switch to Development Branch**
   ```bash
   git checkout dev
   ```

3. **Fix Issues in Development**
   - Address all BLOCKER issues before production
   - Fix HIGH severity issues if time permits
   - Track MEDIUM/LOW issues for future sprints

4. **Re-deploy to Staging**
   ```bash
   /deploy-staging
   ```

5. **Re-validate**
   ```bash
   /validate-staging-deployment
   ```

6. **Repeat Until Clean**
   - Continue until zero BLOCKER issues
   - Zero console errors is ideal
   - All security checks pass

**If validation passed cleanly:**

1. **Document Success**
   ```bash
   # Create validation success record
   echo "✅ Staging validation passed - $(date)" >> deployment-log.txt
   ```

2. **Proceed to Production**
   - Staging is ready for production promotion
   - Run `/deploy-production` when ready

---
Step 16: Cleanup and Return to Dev Branch
bash# Return to dev branch
git checkout dev

# Optional: Pull latest dev
git pull origin dev

echo "
✅ Deployment Complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary:
  Branch: staging → deployed ✅
  Database: migrations applied ✅
  Vercel: build succeeded ✅
  Validation: passed ✅
  
You're back on: dev branch

Next Steps:
  1. Test staging thoroughly: [staging-url]
  2. If all tests pass → /project:deploy-production
  3. If issues found → fix on dev, redeploy to staging

Time spent on deployment: [X minutes]
"