# Deploy to Development

Deploy the current code to Vercel development environment for testing and iteration. This is a faster, lighter deployment process since dev environment uses the same Supabase project as local development.

**Usage:** `/project:deploy-dev` or `/project:deploy-dev [commit-message]`

**What this command does:**
1. Validates current branch and git state
2. Verifies Prisma client generation (critical)
3. Runs quick validation checks (optional full validation)
4. Merges current branch to dev
5. Pushes to GitHub to trigger Vercel deployment
6. Basic deployment validation

**Key Differences from Staging:**
- ✅ Faster: Lighter validation, no migration steps
- ✅ Same Database: Dev branch uses same Supabase as local (no migration needed)
- ✅ Iterative: Designed for quick testing cycles
- ⚠️ Less Strict: Can skip some checks for speed (your choice)

---

## Deployment Workflow

You are deploying EverMed to the **development environment** for testing and rapid iteration.

### Environment Details
- **Target Branch:** `dev`
- **Supabase Project:** Same as local development (no migration needed)
- **Vercel Environment:** Development preview
- **Purpose:** Quick testing and iteration

### Step 1: Pre-Deployment Validation

**Check current state:**
```bash
# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Check git status
git status --short

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  You have uncommitted changes"
fi
Ask user about uncommitted changes:
You have uncommitted changes. What should I do?

1. Commit them now (provide message)
2. Stash them temporarily
3. Deploy without committing (if trivial changes)
4. Cancel deployment

Your choice:
If not on a feature branch:
You're currently on: $CURRENT_BRANCH

Development deployments typically happen from feature branches to dev.

Should I:
1. Proceed from current branch
2. Create a feature branch first
3. Cancel
Step 2: Prisma Client Verification ⚠️ CRITICAL
[MANDATORY] Verify Prisma setup (this is non-negotiable even for dev):
bashecho "🔍 Verifying Prisma client..."

# 1. Check if Prisma client exists
if [ ! -f "node_modules/.prisma/client/index.d.ts" ]; then
  echo "⚠️  Prisma client not generated! Generating now..."
  npx prisma generate
  
  if [ $? -eq 0 ]; then
    echo "✅ Prisma client generated successfully"
  else
    echo "❌ Failed to generate Prisma client"
    echo "Cannot proceed with deployment - Vercel build will fail"
    exit 1
  fi
else
  echo "✅ Prisma client exists"
fi

# 2. Quick check for package.json hooks (warn if missing)
if ! grep -q "postinstall.*prisma generate" package.json; then
  echo "⚠️  WARNING: Missing 'postinstall' hook for Prisma generation"
  echo "This will cause Vercel builds to fail!"
  echo ""
  echo "Should I add it now? (Recommended: yes)"
  echo "1. Yes, add postinstall hook"
  echo "2. No, I'll add it later (risky)"
  echo "3. Cancel deployment"
fi

if ! grep -q "prebuild.*prisma" package.json; then
  echo "⚠️  WARNING: Missing 'prebuild' hook for Prisma generation"
  echo "This is a safety net for Vercel builds"
  echo "Should I add it? (Recommended: yes)"
fi

# 3. Show current Prisma version
echo "📦 Prisma version: $(npx prisma --version | head -1)"
If hooks are missing, add them:
json{
  "scripts": {
    "postinstall": "prisma generate",
    "prebuild": "npm run clean:next && npm run prisma:generate",
    "prisma:generate": "prisma generate",
    "clean:next": "rm -rf .next"
  }
}
Step 3: Quick Validation Check
[FLEXIBLE] Offer validation options:
bashecho "🎯 Validation Options"
echo ""
echo "Development deployments can be fast or thorough. Choose your speed:"
echo ""
echo "1. 🚀 FAST (2 min) - Skip validation, push immediately"
echo "   - Use when: Quick iteration, minor changes"
echo "   - Risk: Might fail on Vercel if issues exist"
echo ""
echo "2. ⚡ QUICK CHECK (5 min) - Basic build test only"
echo "   - Use when: Normal changes, want basic confidence"
echo "   - Checks: Build passes, Prisma works"
echo ""
echo "3. 🔍 FULL VALIDATION (15-30 min) - Complete staging-level checks"
echo "   - Use when: Major changes, want high confidence"
echo "   - Checks: TypeScript, build, lint, tests"
echo ""
echo "Recommended for dev: Option 2 (Quick Check)"
echo ""
echo "Your choice: [1/2/3]"
Option 1: FAST (Skip Everything)
bashecho "🚀 Fast mode - skipping validation"
echo "⚠️  Note: If build fails on Vercel, you'll need to fix and redeploy"
# Skip directly to merge
Option 2: QUICK CHECK (Recommended)
bashecho "⚡ Running quick validation..."

# Quick build test (uses cache for speed)
echo "🏗️  Quick build test..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  echo ""
  echo "The build is broken. This will fail on Vercel too."
  echo ""
  echo "Should I:"
  echo "1. Show me the error and cancel"
  echo "2. Try to clean build (slower but more accurate)"
  echo "3. Deploy anyway (not recommended)"
  
  # Handle user choice
fi

echo "✅ Quick build passed"
Option 3: FULL VALIDATION
bashecho "🔍 Running full validation (this takes longer)..."

# Clean build
echo "🧹 Cleaning caches..."
rm -rf .next node_modules/.cache

# TypeScript check
echo "📝 TypeScript check..."
npx tsc --noEmit 2>&1 | tee /tmp/typescript-errors.txt
ERROR_COUNT=$(grep "error TS" /tmp/typescript-errors.txt | wc -l)

if [ $ERROR_COUNT -gt 0 ]; then
  echo "⚠️  Found $ERROR_COUNT TypeScript errors"
  cat /tmp/typescript-errors.txt | head -20
  
  echo ""
  echo "Should I:"
  echo "1. Try to fix them"
  echo "2. Use ignoreBuildErrors escape hatch"
  echo "3. Deploy anyway (errors might appear on Vercel)"
  echo "4. Cancel"
fi

# Full build
echo "🏗️  Full production build..."
npm run build

# Lint
echo "🔍 Linting..."
npm run lint

# Tests (if they exist)
if grep -q "\"test\":" package.json; then
  echo "🧪 Running tests..."
  npm run test
fi

echo "✅ Full validation passed"
Step 4: Pre-Merge Summary
Show deployment summary before proceeding:
bashecho ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Source:      $CURRENT_BRANCH"
echo "Target:      dev"
echo "Environment: Development (Vercel)"
echo "Database:    Same as local (no migration)"
echo "Validation:  [$VALIDATION_LEVEL]"
echo ""
echo "Changes to deploy:"
git log dev..HEAD --oneline | head -10
echo ""
echo "Files changed: $(git diff dev --name-only | wc -l)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Proceed with deployment? [y/n]"
Step 5: Merge to Dev Branch
Execute merge workflow:
bashecho "🔀 Merging to dev branch..."

# Fetch latest
git fetch origin

# Store current branch
SOURCE_BRANCH=$(git branch --show-current)

# Switch to dev
git checkout dev

# Pull latest dev
git pull origin dev

# Merge from source branch
if [ -n "$ARGUMENTS" ]; then
  COMMIT_MSG="$ARGUMENTS"
else
  COMMIT_MSG="chore(dev): deploy from $SOURCE_BRANCH"
fi

git merge $SOURCE_BRANCH --no-ff -m "$COMMIT_MSG

Deployed from: $SOURCE_BRANCH
Validation: [$VALIDATION_LEVEL]
Prisma client: ✅ Verified

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

if [ $? -ne 0 ]; then
  echo "❌ Merge conflict detected!"
  echo ""
  git status
  echo ""
  echo "Conflicting files:"
  git diff --name-only --diff-filter=U
  echo ""
  echo "Should I:"
  echo "1. Abort merge and cancel deployment"
  echo "2. Show me the conflicts"
  echo "3. Try to auto-resolve (risky)"
  
  # Wait for user decision
fi

echo "✅ Merged successfully"
Step 6: Push to GitHub (Triggers Vercel)
Push dev branch to trigger deployment:
bashecho "🚀 Pushing to GitHub..."
echo ""

# Show what's about to be pushed
echo "Commits to push:"
git log origin/dev..dev --oneline
echo ""

# Push
git push origin dev

if [ $? -eq 0 ]; then
  echo "✅ Pushed successfully!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 Deployment Triggered"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Vercel is now building your deployment..."
  echo ""
  echo "📊 Monitor at: https://vercel.com/thomasallnices-projects/evermed-app"
  echo ""
  echo "⏱️  Estimated build time: 3-5 minutes"
  echo ""
else
  echo "❌ Push failed!"
  echo ""
  echo "This might be because:"
  echo "- You don't have push access"
  echo "- The remote rejected the push"
  echo "- Network issues"
  echo ""
  echo "Should I:"
  echo "1. Retry the push"
  echo "2. Show me the error details"
  echo "3. Cancel and rollback"
fi
Step 7: Monitor Deployment (Optional)
[OPTIONAL] Offer to monitor Vercel build:
bashecho "Would you like me to monitor the Vercel deployment? [y/n]"
echo "(I can watch the build and notify you when it's done)"

# If yes:
echo ""
echo "📊 Monitoring Vercel deployment..."
echo ""

# Simple polling (every 30 seconds for up to 10 minutes)
TIMEOUT=600
ELAPSED=0
INTERVAL=30

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Check Vercel status (simplified - actual implementation would use Vercel API)
  echo "⏳ Building... ($(($ELAPSED / 60))m $(($ELAPSED % 60))s elapsed)"
  
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  
  # In real implementation, would check actual status
  # For now, just show progress
done

echo ""
echo "⏱️  Monitoring timeout reached (10 minutes)"
echo "Check Vercel dashboard for current status:"
echo "https://vercel.com/thomasallnices-projects/evermed-app"
Simplified monitoring alternative:
bashecho ""
echo "🔔 I'll check back in 3 minutes..."
sleep 180

echo ""
echo "Deployment should be complete by now."
echo "Check: https://[your-dev-url].vercel.app"
echo ""
echo "If you see any issues, let me know!"
Step 8: Quick Deployment Validation
[LIGHTWEIGHT] Basic health check:
bashecho ""
echo "🏥 Running quick health check..."
echo ""

# Try to curl the dev URL (if known)
DEV_URL="https://evermed-app-dev.vercel.app"  # Adjust to actual URL

echo "Checking: $DEV_URL"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DEV_URL)

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Dev site is responding (HTTP 200)"
elif [ "$HTTP_STATUS" = "000" ]; then
  echo "⏳ Site might still be deploying (no response yet)"
else
  echo "⚠️  Site returned HTTP $HTTP_STATUS"
fi

echo ""
echo "For full validation, visit: $DEV_URL"
echo "And check:"
echo "- [ ] Site loads without errors"
echo "- [ ] Authentication works"
echo "- [ ] Your changes are visible"
echo "- [ ] Console has no critical errors"
Step 9: Return to Source Branch
Switch back to original branch:
bashecho ""
echo "🔄 Returning to original branch..."

# Go back to source branch
git checkout $SOURCE_BRANCH

echo "✅ Back on: $SOURCE_BRANCH"
echo ""
Step 10: Deployment Summary
Comprehensive summary:
bashecho "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Development Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Deployed:"
echo "  From: $SOURCE_BRANCH"
echo "  To:   dev branch"
echo "  Validation: [$VALIDATION_LEVEL]"
echo ""
echo "🔗 URLs:"
echo "  Dev Site: $DEV_URL"
echo "  Vercel Dashboard: https://vercel.com/thomasallnices-projects/evermed-app"
echo ""
echo "✅ Status:"
echo "  Git Push: ✅ Success"
echo "  Vercel Build: ⏳ In Progress (check dashboard)"
echo "  Health Check: [$HEALTH_STATUS]"
echo ""
echo "📍 You're now on: $SOURCE_BRANCH"
echo ""
echo "🧪 Next Steps:"
echo "  1. Test your changes on dev: $DEV_URL"
echo "  2. If all good → /project:deploy-staging"
echo "  3. If issues → fix on $SOURCE_BRANCH, redeploy"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏱️  Total deployment time: [X minutes]"

Error Handling
Common Issues & Solutions
Issue: Prisma client not generated
bash# Symptom: Vercel build fails with "@prisma/client did not initialize"
# Fix: Add hooks to package.json
echo "Adding Prisma hooks to package.json..."

# Add postinstall and prebuild scripts
# Then redeploy
Issue: Merge conflicts
bash# Offer to show conflicts
git diff --name-only --diff-filter=U

echo "Conflicts found. Should I:"
echo "1. Abort and let you resolve manually"
echo "2. Show me each conflict"
echo "3. Cancel deployment"
Issue: Push rejected
bash# Usually means dev branch is ahead on remote
echo "Remote has commits you don't have locally"
echo ""
echo "Should I:"
echo "1. Pull and merge, then push"
echo "2. Force push (DANGEROUS)"
echo "3. Cancel deployment"
Issue: Build fails on Vercel
bashecho "Vercel build failed. Common causes:"
echo ""
echo "1. Prisma client not generated → Check prebuild hook"
echo "2. TypeScript errors → Run full validation next time"
echo "3. Missing environment variables → Check Vercel settings"
echo "4. Dependency issues → Check package.json"
echo ""
echo "Should I:"
echo "1. Show me the Vercel build logs"
echo "2. Roll back this deployment"
echo "3. Try to diagnose the issue"
Rollback Procedure
If deployment needs to be rolled back:
bashecho "🔄 Rolling back deployment..."

# Switch to dev
git checkout dev

# Reset to previous commit
git reset --hard HEAD^

# Force push
git push origin dev --force

echo "✅ Rolled back dev branch"
echo "Previous deployment is restored"
echo ""
echo "To redeploy with fixes:"
echo "1. Fix issues on $SOURCE_BRANCH"
echo "2. Run /project:deploy-dev again"

Best Practices
When to Use Each Validation Level
🚀 FAST (Skip Validation):

✅ Fixing typos, copy changes
✅ CSS/styling updates
✅ Minor bug fixes you're confident about
✅ Reverting a bad change
❌ Don't use for: New features, refactors, API changes

⚡ QUICK CHECK (Recommended Default):

✅ Normal feature development
✅ Most bug fixes
✅ Database query changes
✅ Component updates
✅ 90% of development work

🔍 FULL VALIDATION (Use Before Staging):

✅ Before deploying to staging
✅ Large refactors
✅ Breaking changes
✅ When you're unsure
✅ After resolving complex merge conflicts

Development Workflow
Typical flow:
1. Work on feature branch
2. Deploy to dev (Quick Check) → Test
3. Iterate: Fix → Deploy (Fast) → Test
4. When satisfied → Deploy to staging (Full Validation)
5. After QA → Deploy to production
Database Considerations
Remember:

Dev and local use SAME Supabase project
Schema changes affect both immediately
No migration needed for dev deployment
But DO run migrations before staging/production

If you changed schema:
bash# You've already run this locally, which updated dev database:
npx prisma migrate dev

# No need to run again for dev deployment
# But remember to apply to staging before deploying there:
# /project:deploy-staging (will prompt you)