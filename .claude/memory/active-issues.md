# Active Issues

## Blocker Issues

None currently! ✅

## Critical Issues

### 1. Metabolic Insights Migrations Not Applied to Staging
**Status**: Pending
**Severity**: Critical (blocks feature deployment)

**Description**:
Metabolic insights migrations exist but haven't been applied to staging database. Code references tables (FoodEntry, GlucoseReading, MLModel) that don't exist yet.

**Impact**:
- 5 API endpoints temporarily stubbed
- Metabolic insights features unavailable in staging
- Cannot test full feature set before production

**Solution**:
```bash
# Link to staging
supabase link --project-ref <staging-ref>

# Apply migrations
npm run prisma:migrate:deploy

# Verify
npm run validate:migrations
```

**ETA**: Ready to apply when instructed

## Medium Priority Issues

### 2. AnalyticsEvent Schema Evolution
**Status**: In Progress (compatibility layer added)
**Severity**: Medium

**Description**:
AnalyticsEvent table migrated from old schema (userId, name, meta) to new schema (sessionId, eventName, metadata). Code needs to work with both.

**Solution Implemented**:
- Created compatibility helper functions
- Use Prisma-generated types instead of hardcoded
- All direct property accesses replaced with helpers

**Status**: ✅ Fixed in code, pending staging validation

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
