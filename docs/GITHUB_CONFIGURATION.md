# GitHub Repository Configuration

This document provides recommended configuration for GitHub repository settings to enforce development workflows and prevent schema drift.

## Table of Contents

1. [Branch Protection Rules](#branch-protection-rules)
2. [Required Status Checks](#required-status-checks)
3. [Environment Secrets](#environment-secrets)
4. [GitHub Actions Configuration](#github-actions-configuration)

---

## Branch Protection Rules

### `main` Branch (Production)

**Navigate to:** Settings → Branches → Add branch protection rule

**Branch name pattern:** `main`

**Settings to enable:**

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (if CODEOWNERS file exists)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks:**
    - `validate-schema` (from CI workflow)
    - `build-and-test` (from CI workflow)

- [x] **Require conversation resolution before merging**

- [x] **Require linear history**
  - Enforces clean git history
  - Prevents merge commits (use squash or rebase)

- [x] **Do not allow bypassing the above settings**
  - Applies to administrators too
  - Critical for maintaining workflow discipline

- [ ] **Allow force pushes** (keep disabled)

- [ ] **Allow deletions** (keep disabled)

**Why these settings:**
- Prevents direct pushes to production branch
- Ensures all code goes through PR review
- Blocks merges if CI fails (including schema validation)
- Prevents accidental force pushes or branch deletions

---

### `staging` Branch (Staging Environment)

**Branch name pattern:** `staging`

**Settings to enable:**

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks:**
    - `validate-schema`
    - `build-and-test`

- [x] **Require conversation resolution before merging**

- [ ] **Allow force pushes** (keep disabled)

**Why these settings:**
- Staging is a pre-production environment
- Must pass all checks before deployment
- Allows testing before production merge

---

### `dev` Branch (Development)

**Branch name pattern:** `dev`

**Settings to enable:**

- [x] **Require status checks to pass before merging**
  - **Required status checks:**
    - `validate-schema`
    - `build-and-test`

- [ ] **Require pull request** (optional for dev)

**Why these settings:**
- More flexible for development
- Still requires CI to pass
- Prevents broken code from being merged

---

## Required Status Checks

GitHub Actions workflows that MUST pass before merge:

### 1. `validate-schema` Job

**Purpose:** Validates database schema and migrations

**What it checks:**
- Migration files are valid
- Schema compatibility with database
- No uncommitted migrations
- No schema drift detected

**Defined in:** `.github/workflows/ci.yml`

**Blocks merge if:**
- Migration validation fails
- Schema compatibility check fails
- Database connection fails (if DATABASE_URL provided)

---

### 2. `build-and-test` Job

**Purpose:** Validates code quality and functionality

**What it checks:**
- Dependencies install correctly
- Prisma Client generates successfully
- Migrations apply successfully (if DATABASE_URL provided)
- Lint passes
- TypeScript type check passes
- Build succeeds
- Unit tests pass

**Defined in:** `.github/workflows/ci.yml`

**Blocks merge if:**
- Any step fails
- Type errors detected
- Build fails
- Tests fail

---

## Environment Secrets

**Navigate to:** Settings → Secrets and variables → Actions

### Repository Secrets (Required for CI)

Add these secrets for GitHub Actions to run properly:

| Secret Name | Description | Where to get it |
|-------------|-------------|-----------------|
| `DATABASE_URL` | Staging database URL for CI testing | `.env.staging` → `SUPABASE_DB_URL` |
| `SUPABASE_URL` | Staging Supabase URL | `.env.staging` → `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key | `.env.staging` → `SUPABASE_SERVICE_ROLE_KEY` |
| `OPENAI_API_KEY` | OpenAI API key for tests | `.env.staging` → `OPENAI_API_KEY` |

**Optional secrets (for full E2E testing):**
| Secret Name | Description |
|-------------|-------------|
| `PDF_EXTRACT_URL` | PDF extraction service URL |
| `PDF_EXTRACT_BEARER` | PDF extraction service bearer token |
| `GOOGLE_API_KEY` | Google API key (for Gemini) |

### Environment-Specific Secrets

GitHub Actions can also use environment-specific secrets for deployments:

**Staging Environment:**
- Navigate to: Settings → Environments → New environment → "staging"
- Add secrets specific to staging deployment

**Production Environment:**
- Navigate to: Settings → Environments → New environment → "production"
- Add secrets specific to production deployment
- Enable "Required reviewers" (recommended: 1-2 people)
- Enable "Wait timer" (recommended: 5-10 minutes for production)

---

## GitHub Actions Configuration

### Current Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Pull requests to any branch
- Pushes to `refit/mvp-skeleton`, `main`, `staging`

**Jobs:**

1. **validate-schema**
   - Runs first
   - Validates migrations and schema compatibility
   - Can fail gracefully if DATABASE_URL not provided

2. **build-and-test**
   - Depends on `validate-schema` passing
   - Runs full build and test suite
   - Must pass for PR merge

**Improvements already implemented:**
- ✅ Schema validation runs before build
- ✅ Build failure blocks merge
- ✅ Type check integrated
- ✅ Prisma Client generation automated

---

### Recommended Additional Workflows

#### 1. Automatic Staging Deployment

**Create:** `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Apply migrations to staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: npm run prisma:migrate:deploy
      - name: Verify schema
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: node scripts/test-schema.mjs
      - name: Deploy to Vercel Staging
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm i -g vercel
          vercel --prod --token=$VERCEL_TOKEN --scope=$VERCEL_ORG_ID
```

**Benefits:**
- Automates staging deployment
- Applies migrations BEFORE code deployment
- Validates schema after migration
- Reduces manual steps

---

#### 2. Production Deployment with Approval

**Create:** `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Apply migrations to production
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: npm run prisma:migrate:deploy
      - name: Verify schema
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: node scripts/test-schema.mjs
      - name: Deploy to Vercel Production
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: |
          npm i -g vercel
          vercel --prod --token=$VERCEL_TOKEN --scope=$VERCEL_ORG_ID
```

**Benefits:**
- Requires manual approval before production deployment
- Applies migrations automatically after approval
- Validates schema after migration
- Ensures production safety

**To enable approval requirement:**
1. Settings → Environments → production
2. Enable "Required reviewers"
3. Add 1-2 people who can approve

---

#### 3. Weekly Schema Drift Check

**Create:** `.github/workflows/schema-drift-check.yml`

```yaml
name: Weekly Schema Drift Check

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  check-drift:
    name: Check Schema Drift Across Environments
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Check Local vs Staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: |
          echo "Checking staging schema drift..."
          node scripts/test-schema.mjs || echo "::warning::Staging schema drift detected!"
      - name: Check Local vs Production
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          echo "Checking production schema drift..."
          node scripts/test-schema.mjs || echo "::error::Production schema drift detected!"
      - name: Create Issue if Drift Detected
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '⚠️ Schema Drift Detected',
              body: 'Weekly schema drift check detected mismatches between local and deployed environments. Please run `./scripts/deploy-staging.sh` and `./scripts/deploy-production.sh` to synchronize schemas.',
              labels: ['bug', 'database', 'critical']
            })
```

**Benefits:**
- Proactively detects schema drift
- Runs weekly to catch issues early
- Creates GitHub issue if drift detected
- Can be manually triggered anytime

---

## Verification Checklist

After configuring GitHub repository settings:

- [ ] Branch protection enabled for `main` branch
- [ ] Branch protection enabled for `staging` branch
- [ ] Required status checks configured (validate-schema, build-and-test)
- [ ] Repository secrets added (DATABASE_URL, SUPABASE_URL, etc.)
- [ ] Staging environment created with secrets
- [ ] Production environment created with required reviewers
- [ ] CI workflow runs successfully on PR
- [ ] Pre-push hook works locally (Husky installed)
- [ ] Test PR merge - should block if CI fails
- [ ] Test PR merge - should succeed if CI passes

---

## Troubleshooting

### CI fails with "DATABASE_URL not set"

**Cause:** Missing repository secret

**Fix:**
1. Go to Settings → Secrets and variables → Actions
2. Add `DATABASE_URL` secret with staging database URL
3. Re-run CI workflow

---

### Branch protection not enforcing

**Cause:** "Do not allow bypassing" not enabled

**Fix:**
1. Go to Settings → Branches → Edit branch protection rule
2. Enable "Do not allow bypassing the above settings"
3. Apply to administrators: Yes

---

### Status checks not showing up

**Cause:** Workflow hasn't run yet on the branch

**Fix:**
1. Push a commit to the branch
2. Wait for CI to complete
3. Status checks will appear in PR

---

### Pre-push hook not running

**Cause:** Husky not installed or hook not executable

**Fix:**
```bash
npm run prepare
chmod +x .husky/pre-push
chmod +x scripts/pre-push-checks.sh
```

---

## Summary

**With these configurations in place:**

1. ✅ **Developers cannot push broken code to main**
   - Pre-push hook validates locally
   - CI validates in GitHub
   - Branch protection blocks merge if CI fails

2. ✅ **Schema drift is detected automatically**
   - validate-schema job runs on every PR
   - Weekly cron job checks for drift
   - Deployment scripts verify schema before deploy

3. ✅ **Deployments are safe and repeatable**
   - Migrations applied automatically
   - Schema validated after migration
   - Production requires manual approval

4. ✅ **Technical debt is prevented**
   - Required reviews for all changes
   - Linear git history enforced
   - Conversation resolution required

**This eliminates the broken workflow that caused the schema synchronization crisis.**
