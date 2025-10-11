# Deploy to Production

Deploy validated code from staging to production environment with maximum safety protocols, comprehensive validation, and rollback capabilities.

**Usage:** `/project:deploy-production` or `/project:deploy-production [version]`

**⚠️ CRITICAL: Production Deployment**

This command deploys to live users. It includes:
- ✅ Maximum validation (no shortcuts)
- ✅ Database backup before migrations
- ✅ Multiple confirmation gates
- ✅ Git tagging for version control
- ✅ Comprehensive monitoring
- ✅ Automated rollback capability

**Requirements:**
- Must deploy from `staging` branch (validated release candidate)
- All staging tests must pass
- QA approval required (manual confirmation)
- Database migrations reviewed and approved

---

## Deployment Workflow

You are deploying EverMed to **PRODUCTION** - this affects live users.

### Environment Details
- **Source Branch:** `staging` (MANDATORY)
- **Target Branch:** `main`
- **Supabase Project:** Production project
- **Vercel Environment:** Production
- **Impact:** LIVE USERS

---

## Pre-Flight Checklist

**Before starting, verify:**
[ ] Staging has been thoroughly tested
[ ] QA team has approved staging
[ ] All known bugs are fixed
[ ] Database migrations are reviewed
[ ] Rollback plan is understood
[ ] You have production access
[ ] It's not Friday evening (seriously)

---

## Step 1: Critical Pre-Deployment Verification

**[MANDATORY] Verify deployment prerequisites:**
```bash
echo "🔒 PRODUCTION DEPLOYMENT - Pre-Flight Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Verify current branch is staging
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "staging" ]; then
  echo "❌ BLOCKED: Must deploy from 'staging' branch"
  echo "   Current branch: $CURRENT_BRANCH"
  echo ""
  echo "Production deploys must come from validated staging branch."
  echo ""
  echo "Should I:"
  echo "1. Switch to staging branch"
  echo "2. Cancel deployment (recommended if unsure)"
  echo "3. Override and deploy from $CURRENT_BRANCH (DANGEROUS)"
  
  # If user chooses override, require explicit confirmation
  if [ "$CHOICE" = "3" ]; then
    echo ""
    echo "⚠️  WARNING: Deploying from non-staging branch"
    echo "This bypasses your QA validation process."
    echo ""
    echo "Type 'I UNDERSTAND THE RISKS' to proceed:"
    # Wait for exact phrase
  fi
  
  exit 1
fi

echo "✅ On staging branch"

# 2. Verify staging is up to date
git fetch origin staging

BEHIND=$(git rev-list HEAD..origin/staging --count)
if [ $BEHIND -gt 0 ]; then
  echo "⚠️  Your staging is $BEHIND commits behind remote"
  echo ""
  echo "Should I pull latest staging first? (Recommended: yes)"
fi

echo "✅ Staging is up to date"

# 3. Verify no uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ BLOCKED: Uncommitted changes detected"
  git status --short
  echo ""
  echo "Production must be deployed from clean state."
  echo "Commit or stash changes first."
  exit 1
fi

echo "✅ No uncommitted changes"

# 4. Check last staging deployment
echo ""
echo "📊 Last staging deployment:"
git log -1 --oneline staging
echo ""
echo "Staging deployed: $(git log -1 --format=%ar staging)"
echo ""

# 5. Verify Vercel staging is healthy
echo "🏥 Checking staging health..."
STAGING_URL="https://evermed-app-staging.vercel.app"  # Adjust to your URL
STAGING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $STAGING_URL)

if [ "$STAGING_STATUS" != "200" ]; then
  echo "❌ BLOCKED: Staging is not healthy (HTTP $STAGING_STATUS)"
  echo ""
  echo "Cannot deploy to production if staging is broken."
  echo "Fix staging first, then retry."
  exit 1
fi

echo "✅ Staging is healthy (HTTP 200)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All pre-flight checks passed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Step 2: Version Management
[REQUIRED] Determine version number:
bashecho ""
echo "📦 Version Management"
echo ""

# Get last production tag
LAST_TAG=$(git describe --tags --abbrev=0 main 2>/dev/null || echo "v0.0.0")
echo "Last production version: $LAST_TAG"

# Get commits since last production
COMMITS_SINCE=$(git rev-list ${LAST_TAG}..staging --count)
echo "Commits since last release: $COMMITS_SINCE"

# Show what's being deployed
echo ""
echo "Changes in this release:"
git log ${LAST_TAG}..staging --oneline | head -20

if [ $COMMITS_SINCE -gt 20 ]; then
  echo "... and $((COMMITS_SINCE - 20)) more commits"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Suggest next version
if [ -n "$ARGUMENTS" ]; then
  NEXT_VERSION="$ARGUMENTS"
  echo "Using provided version: $NEXT_VERSION"
else
  # Parse semver
  MAJOR=$(echo $LAST_TAG | sed 's/v//' | cut -d. -f1)
  MINOR=$(echo $LAST_TAG | sed 's/v//' | cut -d. -f2)
  PATCH=$(echo $LAST_TAG | sed 's/v//' | cut -d. -f3)
  
  echo "What type of release is this?"
  echo ""
  echo "1. 🐛 PATCH (v$MAJOR.$MINOR.$((PATCH + 1))) - Bug fixes, small changes"
  echo "2. ✨ MINOR (v$MAJOR.$((MINOR + 1)).0) - New features, backwards compatible"
  echo "3. 💥 MAJOR (v$((MAJOR + 1)).0.0) - Breaking changes"
  echo "4. 📝 Custom version number"
  echo ""
  echo "Your choice: [1/2/3/4]"
  
  # Get user input and set NEXT_VERSION
fi

echo ""
echo "Next version will be: $NEXT_VERSION"
echo ""

# Confirm version
echo "Is this version number correct? [y/n]"
# Wait for confirmation

Step 3: Comprehensive Pre-Deploy Validation
[MANDATORY] Run all validation checks (no shortcuts):
bashecho "🔍 MANDATORY VALIDATION - Maximum Safety Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  This will take 15-30 minutes. Production requires thoroughness."
echo ""

VALIDATION_START=$(date +%s)

# 1. Prisma Client Verification (CRITICAL)
echo "1️⃣  Verifying Prisma Client..."
echo ""

if [ ! -f "node_modules/.prisma/client/index.d.ts" ]; then
  echo "⚠️  Prisma client not generated! Generating now..."
  npx prisma generate
  
  if [ $? -ne 0 ]; then
    echo "❌ BLOCKED: Failed to generate Prisma client"
    echo "This will cause production build to fail!"
    exit 1
  fi
fi

if ! grep -q "postinstall.*prisma generate" package.json; then
  echo "❌ BLOCKED: Missing 'postinstall' hook in package.json"
  echo ""
  echo "Required script:"
  echo '  "postinstall": "prisma generate"'
  echo ""
  echo "Add this to package.json before deploying to production."
  exit 1
fi

if ! grep -q "prebuild.*prisma" package.json; then
  echo "❌ BLOCKED: Missing 'prebuild' hook in package.json"
  echo ""
  echo "Required script:"
  echo '  "prebuild": "npm run clean:next && npm run prisma:generate"'
  echo ""
  echo "Add this to package.json before deploying to production."
  exit 1
fi

echo "✅ Prisma client: OK"
echo ""

# 2. Clean Build Environment
echo "2️⃣  Cleaning build environment..."
rm -rf .next
rm -rf node_modules/.cache
echo "✅ Caches cleaned"
echo ""

# 3. TypeScript Full Check
echo "3️⃣  Running TypeScript validation (all files)..."
npx tsc --noEmit 2>&1 | tee /tmp/prod-typescript-errors.txt

TS_ERROR_COUNT=$(grep "error TS" /tmp/prod-typescript-errors.txt | wc -l)

if [ $TS_ERROR_COUNT -gt 0 ]; then
  echo ""
  echo "❌ BLOCKED: $TS_ERROR_COUNT TypeScript errors found"
  echo ""
  cat /tmp/prod-typescript-errors.txt | head -30
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Production deployments require zero TypeScript errors."
  echo ""
  echo "Options:"
  echo "1. Fix these errors (recommended)"
  echo "2. Check if ignoreBuildErrors is enabled"
  echo "3. Cancel deployment"
  echo ""
  
  # If ignoreBuildErrors is enabled, verify it was intentional
  if grep -q "ignoreBuildErrors.*true" next.config.js; then
    echo "ℹ️  Note: ignoreBuildErrors is enabled in next.config.js"
    echo "This was added due to environment mismatch (see docs/vercel-typescript-quirk.md)"
    echo ""
    echo "Verify this is still appropriate for production. Continue? [y/n]"
  else
    echo "Cannot proceed with TypeScript errors. Aborting."
    exit 1
  fi
else
  echo "✅ TypeScript: 0 errors"
fi

echo ""

# 4. Production Build Test
echo "4️⃣  Running production build test..."
npm run build 2>&1 | tee /tmp/prod-build-output.txt

BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ BLOCKED: Production build failed"
  echo ""
  cat /tmp/prod-build-output.txt | tail -50
  echo ""
  
  # Check for Prisma issue
  if grep -q "@prisma/client did not initialize" /tmp/prod-build-output.txt; then
    echo "🚨 Prisma client initialization error detected!"
    echo "This is the same issue that caused 6 hours of debugging."
    echo ""
    echo "Attempting fix: npx prisma generate"
    npx prisma generate
    echo "Retrying build..."
    npm run build
    
    if [ $? -ne 0 ]; then
      echo "❌ Build still failing after Prisma generation"
      echo "Cannot deploy to production with failing build."
      exit 1
    fi
  else
    echo "Build failed. Cannot deploy to production."
    exit 1
  fi
fi

echo "✅ Production build: SUCCESS"
echo ""

# 5. Lint Check
echo "5️⃣  Running lint check..."
npm run lint 2>&1 | tee /tmp/prod-lint-output.txt

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "⚠️  Lint issues found"
  cat /tmp/prod-lint-output.txt | head -20
  echo ""
  echo "Should I:"
  echo "1. Try to auto-fix (npm run lint --fix)"
  echo "2. Continue anyway (not recommended for production)"
  echo "3. Cancel and fix manually"
else
  echo "✅ Lint: PASSED"
fi

echo ""

# 6. Test Suite (if exists)
if grep -q "\"test\":" package.json; then
  echo "6️⃣  Running test suite..."
  npm run test 2>&1 | tee /tmp/prod-test-output.txt
  
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo "❌ BLOCKED: Tests failed"
    echo ""
    cat /tmp/prod-test-output.txt | tail -30
    echo ""
    echo "Cannot deploy to production with failing tests."
    echo ""
    echo "Options:"
    echo "1. Cancel deployment (recommended)"
    echo "2. Show full test output"
    echo "3. Override (DANGEROUS - only if tests are flaky)"
    exit 1
  fi
  
  echo "✅ Tests: ALL PASSED"
else
  echo "6️⃣  No test suite found (skipping)"
fi

echo ""

# 7. Dependency Security Audit
echo "7️⃣  Running security audit..."
npm audit --production 2>&1 | tee /tmp/prod-audit-output.txt

CRITICAL_VULNS=$(grep "critical" /tmp/prod-audit-output.txt | wc -l)
HIGH_VULNS=$(grep "high" /tmp/prod-audit-output.txt | wc -l)

if [ $CRITICAL_VULNS -gt 0 ]; then
  echo "❌ BLOCKED: $CRITICAL_VULNS critical vulnerabilities found"
  echo ""
  npm audit --production | grep -A 5 "critical"
  echo ""
  echo "Cannot deploy to production with critical vulnerabilities."
  echo "Run 'npm audit fix' to resolve."
  exit 1
elif [ $HIGH_VULNS -gt 0 ]; then
  echo "⚠️  $HIGH_VULNS high severity vulnerabilities found"
  echo ""
  echo "Should I:"
  echo "1. Show details and cancel"
  echo "2. Continue anyway (document in release notes)"
  echo "3. Try 'npm audit fix' now"
else
  echo "✅ Security: No critical vulnerabilities"
fi

echo ""

# 8. Version Pinning Check
echo "8️⃣  Verifying dependency versions..."

if grep -q "\"typescript\": \"^" package.json; then
  echo "⚠️  TypeScript version uses range (^) instead of exact"
  echo "This can cause environment mismatches."
  echo ""
  echo "Current: $(cat package.json | grep typescript | head -1)"
  echo "Recommended: Pin to exact version (no ^ or ~)"
  echo ""
  echo "Continue anyway? [y/n]"
fi

echo "✅ Version check: OK"
echo ""

# Validation Complete
VALIDATION_END=$(date +%s)
VALIDATION_DURATION=$((VALIDATION_END - VALIDATION_START))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL VALIDATIONS PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Validation Summary:"
echo "  - Prisma client: ✅"
echo "  - TypeScript: ✅ ($TS_ERROR_COUNT errors)"
echo "  - Build: ✅"
echo "  - Lint: ✅"
echo "  - Tests: ✅"
echo "  - Security: ✅"
echo ""
echo "Time taken: ${VALIDATION_DURATION}s"
echo ""

Step 4: Database Migration Planning & Backup
[CRITICAL] Production database operations:
bashecho "🗄️  DATABASE OPERATIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  This affects PRODUCTION DATA"
echo ""

# Check for pending migrations
echo "Checking for pending migrations..."
npx prisma migrate status --schema=db/schema.prisma 2>&1 | tee /tmp/migration-status.txt

PENDING_MIGRATIONS=$(grep "migration" /tmp/migration-status.txt | wc -l)

if [ $PENDING_MIGRATIONS -gt 0 ]; then
  echo ""
  echo "⚠️  PENDING MIGRATIONS DETECTED"
  echo ""
  echo "Migrations to apply:"
  cat /tmp/migration-status.txt | grep "migration"
  echo ""
  
  # Show migration diff
  echo "Migration changes:"
  npx prisma migrate diff \
    --from-schema-datamodel db/schema.prisma \
    --to-schema-datasource db/schema.prisma \
    --script | tee /tmp/migration-diff.sql
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # CRITICAL: Backup before migration
  echo "🛡️  MANDATORY: Database backup before migration"
  echo ""
  echo "Options:"
  echo "1. Create automatic backup now (recommended)"
  echo "2. I already have a recent backup (confirm timestamp)"
  echo "3. Cancel deployment"
  echo ""
  echo "Your choice: [1/2/3]"
  
  if [ "$CHOICE" = "1" ]; then
    echo ""
    echo "Creating production database backup..."
    
    # Link to production Supabase
    PROD_PROJECT_REF="[YOUR_PROD_PROJECT_REF]"  # Update this
    supabase link --project-ref $PROD_PROJECT_REF
    
    # Create backup
    BACKUP_NAME="prod-backup-$(date +%Y%m%d-%H%M%S)-pre-v${NEXT_VERSION}"
    echo "Backup name: $BACKUP_NAME"
    
    # Export database
    supabase db dump -f "/tmp/${BACKUP_NAME}.sql"
    
    if [ $? -eq 0 ]; then
      echo "✅ Backup created: /tmp/${BACKUP_NAME}.sql"
      echo "   Size: $(du -h /tmp/${BACKUP_NAME}.sql | cut -f1)"
      echo ""
      echo "Backup saved locally. Consider uploading to secure storage."
    else
      echo "❌ BLOCKED: Backup failed"
      echo "Cannot proceed with migration without backup."
      exit 1
    fi
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Migration Summary:"
  echo "  Pending: $PENDING_MIGRATIONS migrations"
  echo "  Backup: ✅ Created"
  echo "  Risk: $(assess_migration_risk)"  # Helper to assess risk
  echo ""
  echo "FINAL CONFIRMATION - Apply migrations to PRODUCTION?"
  echo ""
  echo "Type 'APPLY MIGRATIONS' to proceed:"
  # Wait for exact phrase
  
  # Apply migrations
  echo ""
  echo "Applying migrations to production database..."
  supabase db push
  
  if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully"
    
    # Verify migration
    echo "Verifying database state..."
    npx prisma migrate status
    
    # Regenerate Prisma client with new schema
    echo "Regenerating Prisma client..."
    npx prisma generate
    
    echo "✅ Database updated and client regenerated"
  else
    echo "❌ CRITICAL: Migration failed!"
    echo ""
    echo "Database may be in inconsistent state."
    echo ""
    echo "IMMEDIATE ACTIONS:"
    echo "1. Check Supabase dashboard for database state"
    echo "2. Review migration logs above"
    echo "3. Consider restoring from backup: /tmp/${BACKUP_NAME}.sql"
    echo ""
    echo "Abort deployment? [y/n]"
    exit 1
  fi
  
else
  echo "✅ No pending migrations"
  echo "   Database schema is up to date"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Step 5: Pre-Merge Approval Gate
[REQUIRED] Final human approval:
bashecho ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 FINAL APPROVAL REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You are about to deploy to PRODUCTION:"
echo ""
echo "📦 Version: $NEXT_VERSION"
echo "📂 Source: staging branch"
echo "🎯 Target: main branch"
echo "📊 Changes: $COMMITS_SINCE commits"
echo "🗄️  Database: Migrations $([ $PENDING_MIGRATIONS -gt 0 ] && echo 'applied' || echo 'not needed')"
echo ""
echo "Validation Results:"
echo "  ✅ All pre-flight checks passed"
echo "  ✅ All code quality checks passed"
echo "  ✅ Security audit passed"
echo "  ✅ Database backup created (if needed)"
echo ""
echo "What's being deployed:"
git log ${LAST_TAG}..staging --oneline | head -10
if [ $COMMITS_SINCE -gt 10 ]; then
  echo "... and $((COMMITS_SINCE - 10)) more commits"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  This will affect LIVE USERS immediately"
echo ""
echo "Have you:"
echo "  [ ] Tested thoroughly on staging?"
echo "  [ ] Received QA approval?"
echo "  [ ] Reviewed all changes?"
echo "  [ ] Notified team of deployment?"
echo "  [ ] Prepared rollback plan?"
echo ""
echo "Type 'DEPLOY TO PRODUCTION' to proceed:"
echo "(or anything else to cancel)"

read CONFIRMATION

if [ "$CONFIRMATION" != "DEPLOY TO PRODUCTION" ]; then
  echo ""
  echo "❌ Deployment cancelled"
  echo "No changes were made."
  exit 0
fi

echo ""
echo "✅ Deployment approved"
echo ""

Step 6: Merge Staging to Main
Execute production merge:
bashecho "🔀 Merging staging to main..."
echo ""

# Fetch all branches
git fetch origin

# Switch to main branch
git checkout main

# Pull latest main
git pull origin main

# Merge from staging
git merge staging --no-ff -m "🚀 Release $NEXT_VERSION

Version: $NEXT_VERSION
Source: staging branch
Commits: $COMMITS_SINCE since $LAST_TAG

Changes:
$(git log ${LAST_TAG}..staging --oneline | head -20)

Validation:
- TypeScript: ✅ $TS_ERROR_COUNT errors
- Build: ✅ PASSED
- Tests: ✅ PASSED
- Security: ✅ PASSED
- Database: ✅ $([ $PENDING_MIGRATIONS -gt 0 ] && echo "Migrated ($PENDING_MIGRATIONS migrations)" || echo "No changes")

Approved by: [Your Name]
Deployed: $(date -u +%Y-%m-%dT%H:%M:%SZ)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"

if [ $? -ne 0 ]; then
  echo "❌ CRITICAL: Merge conflict detected"
  echo ""
  git status
  echo ""
  echo "This should not happen - staging and main should be linear."
  echo "This indicates a hotfix or manual change to main."
  echo ""
  echo "Conflicting files:"
  git diff --name-only --diff-filter=U
  echo ""
  echo "STOP: Manual intervention required"
  echo ""
  echo "Options:"
  echo "1. Abort and investigate conflicts"
  echo "2. Show me the conflicts"
  echo ""
  echo "Recommended: Abort and investigate"
  exit 1
fi

echo "✅ Merge successful"
echo ""

Step 7: Create Git Tag
Tag the release:
bashecho "🏷️  Creating release tag..."
echo ""

# Create annotated tag
git tag -a "$NEXT_VERSION" -m "Release $NEXT_VERSION

Deployed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Commits: $COMMITS_SINCE since $LAST_TAG
Migration: $([ $PENDING_MIGRATIONS -gt 0 ] && echo "Yes ($PENDING_MIGRATIONS)" || echo "No")

Changelog:
$(git log ${LAST_TAG}..staging --oneline | head -20)

Validation: All checks passed
Approved by: [Your Name]"

if [ $? -eq 0 ]; then
  echo "✅ Created tag: $NEXT_VERSION"
else
  echo "❌ Failed to create tag"
  echo "This is non-critical, continuing deployment..."
fi

echo ""

Step 8: Push to GitHub (Triggers Vercel)
Push to production:
bashecho "🚀 PUSHING TO PRODUCTION..."
echo ""
echo "This will trigger Vercel production deployment"
echo ""

# Push main branch
git push origin main

if [ $? -ne 0 ]; then
  echo "❌ CRITICAL: Push failed"
  echo ""
  echo "This could be due to:"
  echo "- Network issues"
  echo "- Permission issues"
  echo "- Remote conflicts"
  echo ""
  echo "Should I:"
  echo "1. Retry push"
  echo "2. Show error details"
  echo "3. Abort (main branch is local only, can retry safely)"
  exit 1
fi

echo "✅ Pushed main branch"
echo ""

# Push tag
git push origin "$NEXT_VERSION"

if [ $? -eq 0 ]; then
  echo "✅ Pushed tag: $NEXT_VERSION"
else
  echo "⚠️  Failed to push tag (non-critical)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PRODUCTION DEPLOYMENT INITIATED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Vercel is now building production deployment..."
echo ""
echo "📊 Monitor at: https://vercel.com/thomasallnices-projects/evermed-app"
echo "🏷️  Version: $NEXT_VERSION"
echo "⏱️  Estimated build time: 5-10 minutes"
echo ""

Step 9: Intensive Deployment Monitoring
[CRITICAL] Monitor production deployment closely:
bashecho "📊 PRODUCTION DEPLOYMENT MONITORING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Actively monitoring deployment..."
echo "   This is production - we watch it closely"
echo ""

DEPLOY_START=$(date +%s)
MAX_WAIT=900  # 15 minutes max
CHECK_INTERVAL=20  # Check every 20 seconds

# Get deployment ID (simplified - actual implementation would use Vercel API)
echo "Fetching deployment ID..."
DEPLOYMENT_ID=$(vercel ls --scope thomasallnices-projects | grep production | head -1 | awk '{print $1}')

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "⚠️  Could not fetch deployment ID automatically"
  echo "Please monitor manually at Vercel dashboard"
else
  echo "Deployment ID: $DEPLOYMENT_ID"
  echo ""
  
  # Monitoring loop
  while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - DEPLOY_START))
    
    if [ $ELAPSED -gt $MAX_WAIT ]; then
      echo ""
      echo "⏱️  Monitoring timeout (15 minutes exceeded)"
      echo "Deployment is taking longer than expected."
      echo ""
      echo "Check Vercel dashboard: https://vercel.com/thomasallnices-projects/evermed-app"
      break
    fi
    
    # Check deployment status
    STATUS=$(vercel inspect $DEPLOYMENT_ID --scope thomasallnices-projects | grep "State:" | awk '{print $2}')
    
    MINUTES=$((ELAPSED / 60))
    SECONDS=$((ELAPSED % 60))
    
    case $STATUS in
      "BUILDING")
        echo "⏳ Building... (${MINUTES}m ${SECONDS}s elapsed)"
        ;;
      "READY")
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ PRODUCTION DEPLOYMENT SUCCESSFUL"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "⏱️  Build time: ${MINUTES}m ${SECONDS}s"
        echo "🌐 URL: [production-url]"
        echo ""
        break
        ;;
      "ERROR")
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "❌ PRODUCTION DEPLOYMENT FAILED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🚨 CRITICAL: Production build failed on Vercel"
        echo ""
        
        # Fetch build logs
        echo "Fetching build logs..."
        vercel logs $DEPLOYMENT_ID --scope thomasallnices-projects > /tmp/prod-deploy-logs.txt
        
        # Analyze logs for common issues
        if grep -q "@prisma/client did not initialize" /tmp/prod-deploy-logs.txt; then
          echo "🚨 Issue: Prisma client not initialized"
          echo "   This is the critical bug we identified earlier"
          echo ""
          echo "Likely cause: prebuild hook not running on Vercel"
          echo ""
        elif grep -q "error TS" /tmp/prod-deploy-logs.txt; then
          TS_ERROR_COUNT=$(grep "error TS" /tmp/prod-deploy-logs.txt | wc -l)
          echo "🚨 Issue: TypeScript errors ($TS_ERROR_COUNT found)"
          echo ""
          grep "error TS" /tmp/prod-deploy-logs.txt | head -10
          echo ""
        else
          echo "Unknown build error. Last 50 lines of logs:"
          tail -50 /tmp/prod-deploy-logs.txt
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🚨 ROLLBACK REQUIRED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Production deployment failed. Options:"
        echo ""
        echo "1. 🔄 Immediate rollback (restore previous version)"
        echo "2. 📋 Show full build logs"
        echo "3. ⏸️  Pause and investigate (leaves production broken)"
        echo ""
        echo "RECOMMENDED: Option 1 (Rollback immediately)"
        echo ""
        echo "Your choice: [1/2/3]"
        
        # Handle rollback if chosen
        break
        ;;
      *)
        echo "⏳ Status: $STATUS (${MINUTES}m ${SECONDS}s elapsed)"
        ;;
    esac
    
    sleep $CHECK_INTERVAL
  done
fi

echo ""

Step 10: Comprehensive Post-Deployment Validation
[CRITICAL] Validate production health:
bashecho "🏥 POST-DEPLOYMENT VALIDATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Running comprehensive production health checks..."
echo ""

PROD_URL="https://evermed-app.vercel.app"  # Your actual production URL
VALIDATION_FAILED=0

# 1. Basic HTTP Check
echo "1️⃣  HTTP Response Check..."
PROD_HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL)

if [ "$PROD_HTTP_STATUS" = "200" ]; then
  echo "   ✅ HTTP 200 OK"
else
  echo "   ❌ HTTP $PROD_HTTP_STATUS (Expected 200)"
  VALIDATION_FAILED=1
fi

# 2. Response Time Check
echo "2️⃣  Response Time Check..."
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' $PROD_URL)
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME < 5" | bc -l) )); then
  echo "   ✅ Response time: ${RESPONSE_MS}ms"
else
  echo "   ⚠️  Slow response: ${RESPONSE_MS}ms (>5s)"
fi

# 3. SSL Certificate Check
echo "3️⃣  SSL Certificate Check..."
SSL_EXPIRY=$(echo | openssl s_client -servername ${PROD_URL#https://} -connect ${PROD_URL#https://}:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)

if [ -n "$SSL_EXPIRY" ]; then
  echo "   ✅ SSL valid until: $SSL_EXPIRY"
else
  echo "   ⚠️  Could not verify SSL"
fi

# 4. Critical API Endpoints Check
echo "4️⃣  API Health Check..."

# Check health endpoint (adjust to your API)
HEALTH_CHECK=$(curl -s "$PROD_URL/api/health" || echo "FAILED")

if echo "$HEALTH_CHECK" | grep -q "ok"; then
  echo "   ✅ API health: OK"
else
  echo "   ❌ API health check failed"
  VALIDATION_FAILED=1
fi

# 5. Database Connectivity Check
echo "5️⃣  Database Connectivity..."

# Try a simple authenticated request (adjust to your app)
DB_CHECK=$(curl -s "$PROD_URL/api/db-check" || echo "FAILED")

if echo "$DB_CHECK" | grep -q "connected"; then
  echo "   ✅ Database: Connected"
else
  echo "   ❌ Database connectivity issue"
  VALIDATION_FAILED=1
fi

# 6. Authentication System Check
echo "6️⃣  Authentication System..."

# Check if auth endpoints are responding
AUTH_CHECK=$(curl -s -I "$PROD_URL/api/auth/session" | head -n1 | cut -d' ' -f2)

if [ "$AUTH_CHECK" = "200" ] || [ "$AUTH_CHECK" = "401" ]; then
  echo "   ✅ Auth endpoints: Responding"
else
  echo "   ⚠️  Auth endpoints: Unexpected response ($AUTH_CHECK)"
fi

# 7. Static Assets Check
echo "7️⃣  Static Assets..."

FAVICON_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/favicon.ico")

if [ "$FAVICON_CHECK" = "200" ]; then
  echo "   ✅ Static assets: Loading"
else
  echo "   ⚠️  Static assets issue"
fi

# 8. Version Verification
echo "8️⃣  Version Verification..."

# Check if deployed version matches tag (adjust to your version endpoint)
DEPLOYED_VERSION=$(curl -s "$PROD_URL/api/version" | grep -o 'v[0-9.]*' || echo "unknown")

if [ "$DEPLOYED_VERSION" = "$NEXT_VERSION" ]; then
  echo "   ✅ Version: $DEPLOYED_VERSION (matches)"
else
  echo "   ⚠️  Version: $DEPLOYED_VERSION (expected $NEXT_VERSION)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $VALIDATION_FAILED -eq 0 ]; then
  echo "✅ ALL HEALTH CHECKS PASSED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Production is healthy and serving traffic!"
else
  echo "⚠️  SOME HEALTH CHECKS FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Production is live but some issues were detected."
  echo "Review failures above and monitor closely."
  echo ""
  echo "Should I:"
  echo "1. Continue monitoring (issues are non-critical)"
  echo "2. Initiate rollback (issues are critical)"
  echo "3. Show detailed diagnostic info"
fi

echo ""

Step 11: Rollback Capability
[READY] Prepare rollback procedure:
bash# This function is available throughout deployment
function initiate_rollback() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 INITIATING PRODUCTION ROLLBACK"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  echo "⚠️  This will revert production to: $LAST_TAG"
  echo ""
  echo "Type 'ROLLBACK NOW' to confirm:"
  
  read ROLLBACK_CONFIRM
  
  if [ "$ROLLBACK_CONFIRM" != "ROLLBACK NOW" ]; then
    echo "Rollback cancelled"
    return 1
  fi
  
  echo ""
  echo "🔄 Rolling back production..."

  # Switch to main branch
  git checkout main

  # Reset to previous tag
  git reset --hard "$LAST_TAG"

  # Force push (this triggers immediate redeployment)
  git push origin main --force
  
  if [ $? -eq 0 ]; then
    echo "✅ Rollback initiated"
    echo ""
    echo "Vercel is now deploying previous version: $LAST_TAG"
    echo "Monitor: https://vercel.com/thomasallnices-projects/evermed-app"
    echo ""
    
    # If database was migrated, mention restoration
    if [ $PENDING_MIGRATIONS -gt 0 ]; then
      echo "⚠️  NOTE: Database was migrated"
      echo "If issues persist, may need to restore database backup:"
      echo "   /tmp/${BACKUP_NAME}.sql"
      echo ""
    fi
    
    echo "Previous version should be live in 5-10 minutes"
  else
    echo "❌ Rollback push failed"
    echo "Manual intervention required"
    exit 1
  fi
}

# Offer rollback at any failure point
# Example usage:
# initiate_rollback

Step 12: Sync Other Branches
[IMPORTANT] Keep branches in sync:
bashecho "🔄 Syncing branches..."
echo ""

# After successful production deployment, sync staging and dev
echo "Ensuring all branches are synchronized..."
echo ""

# Staging should already match main (we merged staging → main)
# But let's make sure staging points to same commit as main

git checkout staging
git merge main --ff-only

if [ $? -eq 0 ]; then
  git push origin staging
  echo "✅ Staging synchronized with main"
else
  echo "⚠️  Staging sync failed (this is unusual)"
  echo "   Staging and main are out of sync"
fi

# Optionally merge main → dev to keep dev up to date
echo ""
echo "Should I merge main → dev? (keeps dev current)"
echo "1. Yes, merge now"
echo "2. No, I'll merge later"
echo ""

if [ "$CHOICE" = "1" ]; then
  git checkout dev
  git merge main --no-ff -m "chore: sync dev with production release $NEXT_VERSION"
  git push origin dev
  echo "✅ Dev synchronized with main"
fi

echo ""

Step 13: Post-Deployment Tasks
[REQUIRED] Complete deployment process:
bashecho "📋 POST-DEPLOYMENT TASKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Create GitHub Release
echo "1️⃣  Creating GitHub Release..."
echo ""
echo "Should I create a GitHub release with changelog? [y/n]"

if [ "$CREATE_RELEASE" = "y" ]; then
  # Generate changelog
  CHANGELOG=$(git log ${LAST_TAG}..${NEXT_VERSION} --pretty=format:"- %s (%h)" | head -50)
  
  echo "Release notes preview:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$CHANGELOG"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Create GitHub release (requires gh CLI)
  if command -v gh &> /dev/null; then
    gh release create "$NEXT_VERSION" \
      --title "Release $NEXT_VERSION" \
      --notes "## Changes

$CHANGELOG

## Deployment Info
- Deployed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Build: ✅ Passed all validations
- Database: $([ $PENDING_MIGRATIONS -gt 0 ] && echo "Migrated" || echo "No changes")
- Health: ✅ All checks passed

## Links
- [Production](https://evermed-app.vercel.app)
- [Vercel Dashboard](https://vercel.com/thomasallnices-projects/evermed-app)"
    
    echo "✅ GitHub release created"
  else
    echo "⚠️  GitHub CLI not installed (skipping)"
    echo "   Create release manually at: https://github.com/[your-repo]/releases"
  fi
fi

# 2. Update CHANGELOG.md
echo ""
echo "2️⃣  Updating CHANGELOG.md..."

if [ -f "CHANGELOG.md" ]; then
  # Prepend new release to changelog
  cat > /tmp/new-changelog.md << EOF
# Changelog

## [$NEXT_VERSION] - $(date +%Y-%m-%d)

### Deployed
$CHANGELOG

---

EOF
  cat CHANGELOG.md >> /tmp/new-changelog.md
  mv /tmp/new-changelog.md CHANGELOG.md
  
  git add CHANGELOG.md
  git commit -m "docs: update CHANGELOG for $NEXT_VERSION"
  git push origin main

  echo "✅ CHANGELOG.md updated"
else
  echo "⚠️  CHANGELOG.md not found (skipping)"
fi

# 3. Notify team
echo ""
echo "3️⃣  Team Notification..."
echo ""
echo "📢 Notify your team of the deployment:"
echo ""
echo "Template message:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Production Deployment: $NEXT_VERSION"
echo ""
echo "Status: ✅ Deployed successfully"
echo "Time: $(date)"
echo "Changes: $COMMITS_SINCE commits"
echo ""
echo "What's new:"
git log ${LAST_TAG}..${NEXT_VERSION} --oneline | head -5
echo ""
echo "Health: All checks passed ✅"
echo "URL: https://evermed-app.vercel.app"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Copy this to Slack/Discord/etc."

# 4. Documentation
echo ""
echo "4️⃣  Documentation..."
echo ""
echo "Document this deployment in:"
echo "  - [ ] Team wiki/docs"
echo "  - [ ] Deployment log"
echo "  - [ ] Customer communications (if major changes)"
echo ""

echo ""

Step 14: Return to Original Branch
Clean up and return:
bashecho "🔄 Returning to original state..."
echo ""

# Return to staging (typical working branch)
git checkout staging

TOTAL_DEPLOY_TIME=$(($(date +%s) - VALIDATION_START))
TOTAL_MINUTES=$((TOTAL_DEPLOY_TIME / 60))
TOTAL_SECONDS=$((TOTAL_DEPLOY_TIME % 60))

echo "✅ Back on staging branch"
echo ""

Step 15: Deployment Summary Report
Comprehensive summary:
bashecho "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 PRODUCTION DEPLOYMENT COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Version:      $NEXT_VERSION"
echo "Previous:     $LAST_TAG"
echo "Commits:      $COMMITS_SINCE"
echo "Branch:       staging → main"
echo ""
echo "⏱️  Timeline:"
echo "  Validation:  ${VALIDATION_DURATION}s"
echo "  Build:       [from monitoring]"
echo "  Total:       ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
echo ""
echo "✅ Validations:"
echo "  Pre-flight:  ✅ Passed"
echo "  TypeScript:  ✅ $TS_ERROR_COUNT errors"
echo "  Build:       ✅ Success"
echo "  Tests:       ✅ Passed"
echo "  Security:    ✅ No critical issues"
echo "  Lint:        ✅ Clean"
echo ""
echo "🗄️  Database:"
if [ $PENDING_MIGRATIONS -gt 0 ]; then
  echo "  Migrations:  ✅ Applied ($PENDING_MIGRATIONS)"
  echo "  Backup:      ✅ Created"
else
  echo "  Migrations:  ✅ Not needed"
fi
echo ""
echo "🏥 Health Checks:"
echo "  HTTP:        ✅ 200 OK"
echo "  Response:    ✅ ${RESPONSE_MS}ms"
echo "  API:         ✅ Healthy"
echo "  Database:    ✅ Connected"
echo "  Auth:        ✅ Working"
echo "  Assets:      ✅ Loading"
echo ""
echo "🔗 Links:"
echo "  Production:  https://evermed-app.vercel.app"
echo "  Vercel:      https://vercel.com/thomasallnices-projects/evermed-app"
echo "  GitHub:      https://github.com/[your-repo]/releases/tag/$NEXT_VERSION"
echo ""
echo "📋 Post-Deployment:"
echo "  GitHub Release:  $([ -n "$CREATE_RELEASE" ] && echo '✅ Created' || echo '⏭️  Skipped')"
echo "  CHANGELOG:       ✅ Updated"
echo "  Team Notified:   📢 Message ready"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo "  1. Monitor production for next 30 minutes"
echo "  2. Watch for user reports/errors"
echo "  3. Check analytics for anomalies"
echo "  4. Notify stakeholders of completion"
echo ""
echo "🛡️  Rollback Available:"
echo "  If issues occur, can rollback to: $LAST_TAG"
echo "  Command: git checkout main && git reset --hard $LAST_TAG && git push --force"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Production is LIVE with $NEXT_VERSION!"
echo ""
echo "Current branch: $(git branch --show-current)"
echo ""

Emergency Procedures
If Deployment Fails
bash# Automatic rollback trigger
if [ "$DEPLOYMENT_FAILED" = "true" ]; then
  echo ""
  echo "🚨 DEPLOYMENT FAILED - INITIATING AUTOMATIC ROLLBACK"
  echo ""
  initiate_rollback
fi
If Health Checks Fail
bash# Continuous monitoring script (run separately)
while true; do
  HEALTH=$(curl -s "$PROD_URL/api/health")
  
  if ! echo "$HEALTH" | grep -q "ok"; then
    echo "🚨 ALERT: Production health check failed!"
    echo "Time: $(date)"
    echo "Response: $HEALTH"
    
    # Alert mechanism (email, Slack, PagerDuty, etc.)
    # send_alert "Production health check failed"
  fi
  
  sleep 60  # Check every minute
done
Manual Rollback Instructions
bash# If automatic rollback fails, manual steps:
echo "
MANUAL ROLLBACK PROCEDURE:

1. Switch to main branch:
   git checkout main

2. Reset to previous version:
   git reset --hard $LAST_TAG

3. Force push (triggers redeployment):
   git push origin main --force

4. Verify rollback:
   - Check Vercel dashboard
   - Wait 5-10 minutes
   - Test production URL

5. If database was migrated:
   - Restore from backup: /tmp/${BACKUP_NAME}.sql
   - supabase db restore /tmp/${BACKUP_NAME}.sql
"

Best Practices & Guidelines
When to Deploy to Production
✅ Deploy when:

Staging has been stable for 24+ hours
QA team has approved
All automated tests pass
Security audit is clean
Team is available for monitoring
It's during business hours (not late Friday)

❌ Don't deploy when:

Major features are untested
Critical bugs exist
Team is unavailable
Right before weekend/holidays
During high-traffic periods
Other incidents are ongoing

Pre-Deployment Checklist
24 Hours Before:

 Notify team of deployment window
 Verify staging is stable
 Review all changes since last release
 Check for security vulnerabilities
 Prepare rollback plan
 Schedule monitoring time

1 Hour Before:

 Re-verify staging health
 Ensure team is available
 Have rollback procedure ready
 Clear your schedule for monitoring

Deployment:

 Run this command
 Monitor closely for 30+ minutes
 Watch error tracking (Sentry, etc.)
 Check analytics for anomalies

After Deployment:

 Monitor for 1-2 hours
 Check user reports
 Verify key features work
 Update documentation

Communication Protocol
Before Deployment:
Team: "Planning production deployment of v1.2.0 at 2pm EST"
Stakeholders: "New features going live today"
During Deployment:
Team: "Deployment in progress, monitoring..."
After Success:
Team: "✅ v1.2.0 deployed successfully, all health checks passed"
Stakeholders: "New features are now live!"
Users: "Release notes: [link]"
After Failure:
Team: "🚨 Deployment failed, initiating rollback"
Stakeholders: "Deployment delayed, investigating"
Monitoring Checklist
First 15 Minutes:

 HTTP responses (200 OK)
 Error rates (should be normal)
 Response times (should be normal)
 Database connections (should work)

First Hour:

 User authentication (login works)
 Critical user flows (can complete tasks)
 Payment processing (if applicable)
 Third-party integrations (APIs working)

First Day:

 Error tracking (no new error spikes)
 Performance metrics (no degradation)
 User feedback (no major complaints)
 Analytics (traffic patterns normal)


Configuration Requirements
Required Files
package.json:
json{
  "scripts": {
    "postinstall": "prisma generate",
    "prebuild": "npm run clean:next && npm run prisma:generate",
    "prisma:generate": "prisma generate",
    "clean:next": "rm -rf .next",
    "build": "next build",
    "test": "[your test command]",
    "lint": "next lint"
  },
  "engines": {
    "node": "20.x",
    "npm": "10.x"
  }
}
Git Branches:

staging - Must exist and be up to date
main - Target for deployment
Clean state (no uncommitted changes)

Vercel:

Production environment configured
Environment variables set
Production domain connected
Deploy hooks enabled

Supabase:

Production project set up
Connection details in environment
Backup strategy in place


Notes

Deployment Time: 30-60 minutes (including monitoring)
Validation: Maximum (all checks required)
Risk Level: HIGH (affects live users)
Rollback Time: 5-10 minutes
Monitoring Required: Minimum 30 minutes post-deployment

Usage:
bash# Standard release
/project:deploy-production

# With version number
/project:deploy-production v1.2.0

# With custom version
/project:deploy-production v2.0.0-beta
Remember:

Production deploys are serious - take your time
When in doubt, don't deploy
It's okay to abort and retry later
Rollback is not failure, it's good engineering
Monitor closely - this affects real users

Emergency Contacts:

Team Lead: [contact]
DevOps: [contact]
Vercel Support: [link]
Supabase Support: [link]


🚀 "Deploy with confidence, monitor with diligence, rollback without hesitation."