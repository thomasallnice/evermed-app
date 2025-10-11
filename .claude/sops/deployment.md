# SOP: Deployment Process

## Overview

This SOP defines the deployment process for staging and production environments.

## Pre-Deployment Checklist (MANDATORY)

Before EVERY deployment, complete this checklist:

- [ ] `npm run typecheck` passes locally
- [ ] `npm run lint` passes locally
- [ ] `npm run build` passes locally
- [ ] All migrations committed to Git
- [ ] No uncommitted changes in `db/migrations/`
- [ ] All tests pass
- [ ] Code reviewed and approved (if PR-based workflow)

## Staging Deployment

### 1. Run Pre-Push Checks

```bash
./scripts/pre-push-checks.sh
```

This validates:
- TypeScript compiles without errors
- Linting passes
- Build succeeds
- No uncommitted migrations

### 2. Push to GitHub

```bash
git push origin dev  # or your branch name
```

### 3. Apply Migrations to Staging Database

```bash
./scripts/deploy-staging.sh
```

This will:
- Verify local build
- Apply migrations to staging database
- Validate schema matches Prisma schema

**BLOCK deployment if this fails!**

### 4. Deploy Code to Vercel Staging

- Vercel automatically deploys from GitHub push (if connected)
- Or manually trigger deployment in Vercel dashboard

### 5. Monitor Vercel Build

Watch the build logs in Vercel dashboard:
- Check for `prisma generate` success
- Check for TypeScript compilation success
- Check for build success

### 6. Run Smoke Tests

```bash
./scripts/smoke-e2e.sh
```

Manually test:
- Authentication flow
- Upload flow
- Vault page
- Metabolic dashboard (if applicable)
- Share pack creation

### 7. Verify Staging Environment

- Check Supabase logs for errors
- Check Vercel logs for runtime errors
- Test critical user flows end-to-end

**If any issues found:**
- Fix issues on dev branch
- Re-test locally
- Re-deploy to staging
- DO NOT proceed to production

## Production Deployment

### Pre-Production Checklist

- [ ] Staging deployment successful and tested
- [ ] Smoke tests passed on staging
- [ ] Critical user flows verified on staging
- [ ] Manual backup created in Supabase dashboard (MANDATORY)
- [ ] Deployment communication sent (if applicable)

### 1. Create Manual Backup

**CRITICAL:** Always create a manual backup before production deployment!

1. Go to Supabase dashboard → Production project
2. Navigate to Database → Backups
3. Click "Create backup"
4. Wait for backup to complete
5. Verify backup exists

### 2. Apply Migrations to Production Database

```bash
./scripts/deploy-production.sh
```

This will:
- Prompt for backup confirmation
- Prompt for staging verification confirmation
- Verify local build
- Apply migrations to production database
- Validate schema matches Prisma schema

**If migration fails:**
- Restore from backup immediately
- Investigate root cause
- Test fix on staging copy
- DO NOT re-attempt without understanding failure

### 3. Deploy Code to Vercel Production

- Promote staging to production in Vercel dashboard
- Or deploy from `main` branch (if using branch-based workflow)

### 4. Monitor Deployment

**Immediate monitoring (first 5 minutes):**
- Watch Vercel build logs
- Watch Vercel runtime logs
- Watch Supabase realtime logs
- Check for errors, warnings, or anomalies

**Post-deployment monitoring (first hour):**
- Monitor error rates
- Monitor API response times
- Monitor database query performance
- Monitor user activity

### 5. Run Production Smoke Tests

```bash
./scripts/smoke-e2e.sh --auth
```

Manually test:
- User signup/login
- Document upload
- Vault access
- Metabolic features (if applicable)
- Share pack creation and access

### 6. Verify Critical Metrics

- Check analytics for user activity
- Check error logs for zero new errors
- Check performance metrics (p95 < 10s for medical data processing)
- Check database connection pool health

**If any issues detected:**
- Assess severity
- If critical: Initiate rollback procedure immediately
- If non-critical: Create hotfix branch and follow hotfix workflow

## Rollback Procedure

If production deployment fails or critical issues detected:

### 1. Assess Severity

**Critical (requires immediate rollback):**
- Authentication broken
- Data loss occurring
- Security vulnerability exposed
- Core features completely broken

**Non-critical (hotfix acceptable):**
- Minor UI bugs
- Non-blocking feature issues
- Performance degradation (not total failure)

### 2. Rollback Steps

#### 2a. Revert Vercel Deployment

1. Go to Vercel dashboard → Production deployment
2. Navigate to Deployments
3. Find previous working deployment
4. Click "Promote to Production"
5. Wait for rollback deployment to complete

#### 2b. Restore Database (if necessary)

**ONLY if database changes caused the issue:**

1. Go to Supabase dashboard → Production project
2. Navigate to Database → Backups
3. Find most recent backup BEFORE deployment
4. Click "Restore"
5. Confirm restoration
6. Wait for restore to complete
7. Verify database restored successfully

#### 2c. Verify Rollback

- Run smoke tests
- Check error logs
- Monitor user activity
- Verify critical flows work

### 3. Post-Rollback

- Investigate root cause
- Document incident
- Create hotfix or revert PR
- Test fix thoroughly on staging
- Re-attempt deployment following correct workflow

## Hotfix Workflow

For urgent production fixes:

1. **Create hotfix branch from `main`:**
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/description
   ```

2. **Implement minimal fix:**
   - Fix ONLY the critical issue
   - No feature additions
   - No refactoring

3. **Test locally:**
   ```bash
   ./scripts/pre-push-checks.sh
   ```

4. **Deploy to staging first:**
   ```bash
   git push origin hotfix/description
   ./scripts/deploy-staging.sh
   # Deploy to Vercel staging
   # Run smoke tests
   ```

5. **Deploy to production:**
   ```bash
   ./scripts/deploy-production.sh
   # Deploy to Vercel production
   # Monitor closely
   ```

6. **Merge hotfix:**
   ```bash
   git checkout main
   git merge hotfix/description
   git push origin main

   git checkout dev
   git merge main
   git push origin dev
   ```

## Deployment Communication

For major deployments, communicate to team:

**Before deployment:**
- What is being deployed
- Expected downtime (if any)
- Rollback plan

**During deployment:**
- Deployment started
- Migration status
- Deployment completed

**After deployment:**
- Deployment successful
- Key changes live
- Known issues (if any)

## Environment Variables

**Never hardcode secrets in code!**

**Staging:**
- Set in Vercel staging environment settings
- Sync with `.env.example`

**Production:**
- Set in Vercel production environment settings
- Rotate secrets regularly
- Use Vercel CLI for bulk updates:
  ```bash
  vercel env pull .env.production
  # Edit .env.production
  vercel env push .env.production
  ```

## Monitoring and Alerting

**Monitor these metrics post-deployment:**
- Error rates (Vercel logs, Sentry)
- API response times (Vercel analytics)
- Database query performance (Supabase dashboard)
- User authentication success rate
- Critical user flow completion rate

**Set up alerts for:**
- Error rate > baseline + 50%
- API p95 latency > 10s
- Database connection pool exhausted
- Authentication failures > 5% of attempts

## Deployment Schedule

**Recommended deployment windows:**
- **Staging:** Anytime during business hours
- **Production:** Tuesday-Thursday, 10am-2pm (avoid Fridays, weekends, holidays)

**Avoid deploying:**
- Late Friday afternoons
- Weekends
- Holidays
- During known high-traffic periods

## Post-Deployment Checklist

- [ ] Vercel deployment successful
- [ ] Migration applied successfully
- [ ] Schema validation passed
- [ ] Smoke tests passed
- [ ] Error logs reviewed (zero new errors)
- [ ] Performance metrics within acceptable range
- [ ] User activity normal
- [ ] Team notified of successful deployment
- [ ] Deployment documented in changelog
