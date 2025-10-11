# Active Issues

## Blocker Issues

None currently! ✅

## Critical Issues

None currently! ✅

## Medium Priority Issues

### 3. Manual Deployment Process
**Status**: Documented
**Severity**: Medium

**Description**:
Database migrations require manual Supabase CLI operations. No automated migration deployment in CI/CD.

**Current Workaround**:
- Documented in `MIGRATION_DEPLOYMENT_GUIDE.md`
- Validation scripts catch pending migrations
- Manual deployment with `npm run prisma:migrate:deploy`

**Future Enhancement**:
- Automated migration deployment with approval gates
- Blue-green deployment strategy
- Automatic rollback on failure

## Low Priority Issues

### 4. No Pre-Commit Hooks
**Status**: Backlog
**Severity**: Low

**Description**:
Validation scripts exist but don't run automatically on `git commit`.

**Enhancement**:
Add husky pre-commit hook:
```bash
npm run validate:all
```

**Trade-off**: Slows down commits, but catches issues earlier

### 5. ESLint Rules for Type Safety
**Status**: Backlog
**Severity**: Low

**Description**:
No ESLint rules to enforce Prisma-generated type usage.

**Enhancement**:
Add rules to prevent hardcoded type definitions:
```javascript
// .eslintrc.js
rules: {
  'no-restricted-imports': ['error', {
    patterns: ['!@prisma/client']
  }]
}
```

## Resolved Recently

### ✅ CRITICAL: Food Photos Bucket - OpenAI Vision API Access (2025-10-11)
**Was**:
- Food photo uploads succeeded but OpenAI Vision API failed to analyze them
- Error: "BadRequestError: 400 Error while downloading" with code 'invalid_image_url'
- food-photos bucket was PRIVATE (default Supabase setting)
- Public URLs generated but returned 403 Forbidden

**Now**:
- Bucket set to PUBLIC (required for OpenAI Vision API)
- Public URLs accessible via HTTP fetch
- OpenAI Vision API successfully downloads and analyzes photos
- Food analysis feature fully functional end-to-end
- Comprehensive verification scripts created
- Security validated: NON-PHI data, RLS on write operations

**Scripts Created**:
- `scripts/check-bucket-config.ts` - Inspect bucket settings
- `scripts/apply-bucket-fix-prisma.ts` - Apply public bucket fix
- `scripts/verify-food-photos-bucket.ts` - Comprehensive validation
- `scripts/test-existing-photo.ts` - OpenAI Vision API test

**Documentation**: `docs/fixes/food-photos-bucket-fix.md`

### ✅ CRITICAL: Schema Synchronization Crisis (2025-10-11)
**Was**:
- Schema drift across all environments
- Migrations not applied to staging/production
- Infinite Vercel build failures
- No validation scripts
- No deployment workflow

**Now**:
- All environments synchronized (local, staging, production)
- Corrective migration applied (`20251011000000_fix_personal_model_schema`)
- Schema validation script created (`scripts/test-schema.mjs`)
- Pre-push validation script created (`scripts/pre-push-checks.sh`)
- Deployment runbooks created (`scripts/deploy-staging.sh`, `scripts/deploy-production.sh`)
- SOPs documented (`.claude/sops/database-changes.md`, `.claude/sops/deployment.md`)
- All builds passing

### ✅ Metabolic Insights Migrations Applied (2025-10-11)
**Was**: Migrations existed but not applied to staging/production
**Now**: All metabolic migrations applied to all environments, tables exist and validated

### ✅ AnalyticsEvent Schema Migration (2025-10-11)
**Was**: Table missing in some environments, schema drift
**Now**: Table exists in all environments with correct schema (eventType, eventName, metadata, sessionId)

### ✅ PersonalModel Schema Drift (2025-10-11)
**Was**: Created with 9 columns, Prisma schema expected 17 columns
**Now**: All 17 columns exist (modelType, version, isActive, trainingDataStart, etc.)

### ✅ Schema Drift Prevention (2025-01-10)
**Was**: No validation before deployment, frequent failures
**Now**: Comprehensive validation system with CI/CD gates

### ✅ TypeScript Build Failures (2025-01-10)
**Was**: Hardcoded types causing build errors
**Now**: Using Prisma-generated types with compatibility helpers

### ✅ Missing Documentation (2025-01-10)
**Was**: No guides for migrations or type safety
**Now**: Complete documentation suite created

## Technical Debt

### Database
- [ ] Add indexes on frequently queried columns
- [ ] Implement database connection pooling
- [ ] Add query performance monitoring
- [ ] Create database backup strategy

### Code Quality
- [ ] Add pre-commit linting/validation hooks
- [ ] Implement ESLint rules for type safety
- [ ] Add code coverage requirements (80%+)
- [ ] Create API integration tests

### CI/CD
- [ ] Automated migration deployment
- [ ] Blue-green deployment support
- [ ] Automatic rollback on failures
- [ ] Environment parity monitoring dashboard

### Monitoring
- [ ] Daily schema parity checks (cron job)
- [ ] Validation pass rate tracking
- [ ] Migration success rate monitoring
- [ ] Error rate alerting

## Notes

### Issue Reporting
When adding new issues:
1. Categorize by severity (Blocker/Critical/Medium/Low)
2. Include reproduction steps
3. Document workarounds if available
4. Link to related issues/PRs
5. Update when resolved

### Branching Strategy
**Important**: Always follow the branching workflow:
```
dev → staging → main
```

Never push directly to main. All work goes through dev → staging → main.
