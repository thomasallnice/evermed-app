# Active Issues

## Blocker Issues

**✅ NONE - All deployment blockers resolved as of 2025-10-12!**

**Completed:**
- ✅ Staging deployment: 11 tables + 40 RLS policies + food-photos bucket
- ✅ Production deployment: 11 tables + 40 RLS policies + food-photos bucket

**Ready for beta launch** (pending admin auth implementation in Sprint 7 Day 2)

---

## Critical Issues

**✅ NONE - All critical issues resolved!**

All admin endpoints now secured with proper role-based authentication.

---

## Medium Priority Issues

### 3. Metabolic Insights: Storage Buckets - ML Models Bucket Pending 🔶
**Status**: food-photos ✅ COMPLETE (all environments), ml-models pending (optional)
**Severity**: Low (LSTM model optional for beta)
**Affects**: ML model storage (future feature - Sprint 9)

**Description**:
The `ml-models` bucket is not created yet, but this is not blocking since LSTM model training is optional for beta launch.

**Current Status**:
- Dev: ✅ `food-photos` bucket exists and working
- Staging: ✅ `food-photos` bucket created (2025-10-12), ⏳ `ml-models` bucket pending
- Production: ✅ `food-photos` bucket created (2025-10-12), ⏳ `ml-models` bucket pending

**Buckets Status**:
1. **food-photos** - ✅ COMPLETED (All Environments)
   - Configuration: PUBLIC (required for OpenAI Vision API access)
   - RLS: 4 path-based isolation policies (`{userId}/*`)
   - Max file size: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp
   - Deployed: Dev, Staging, Production (2025-10-12)

2. **ml-models** - ⏳ PENDING (Optional for beta - Sprint 9)
   - Configuration: PRIVATE
   - RLS: User-scoped access only
   - Storage path: `models/{userId}/glucose-prediction/{version}/model.json`
   - Can be created when LSTM feature is implemented (Sprint 9)

**Risk**: Low - Mock predictor works without ML models bucket. Can launch beta without it.

## Medium Priority Issues

### 4. Metabolic Insights: LSTM Model Mock Baseline 🔶
**Status**: Active (acceptable for beta)
**Severity**: Medium (quality issue, not breaking)
**Affects**: Glucose prediction accuracy

**Description**:
Glucose predictions currently use a mock baseline predictor instead of the designed TensorFlow.js LSTM model. Predictions are simple arithmetic rather than ML-powered.

**Current Implementation**:
```typescript
// Mock predictor
predictedPeak = currentGlucose + (totalCarbs * 2.5)
```

**Target Implementation**:
- LSTM architecture (2 layers, 64 units)
- 28 features (meal nutrition, glucose history, time, user baseline)
- Target accuracy: MAE < 10 mg/dL, R² > 0.85

**Current Accuracy**:
- Baseline MAE: ~15-20 mg/dL (acceptable for beta)
- Confidence intervals: Not available

**Fix Timeline**:
- Optional for Sprint 7-8 (can launch without)
- Recommended for Sprint 9 (post-beta launch)
- Estimated time: 3-5 days

**Decision**:
Launch beta with baseline predictor, communicate "Early Beta - Predictions Improving Daily" to users. Iterate based on real user data.

**Risk**: Users may find predictions inaccurate, but won't break functionality. Can improve post-launch.

---

### 5. Manual Deployment Process
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

### ✅ CRITICAL: Vercel Environment Variable Corruption via echo (2025-10-16)
**Was**:
- Vercel deployment failing with authentication errors (500 status)
- API calls returning "invalid API key" errors
- Production deployment completely broken
- Error: `Authentication failed: Invalid credentials`

**Root Cause**:
- Used `echo "value" | vercel env add KEY_NAME production` to sync environment variables
- The `echo` command adds a newline character (`\n`) by default
- When piped to Vercel CLI, the newline becomes part of the stored value
- Example: `OPENAI_API_KEY` stored as `sk-proj-abc123\n` instead of `sk-proj-abc123`
- OpenAI API rejected the key because of the trailing newline

**Symptoms**:
- 500 Internal Server Error on API endpoints requiring authentication
- Error logs showed "Invalid API key" from external services
- Environment variables looked correct in Vercel dashboard (newline not visible)
- Local development worked fine (no newline in .env files)

**Fix**:
- **NEVER use `echo` when piping to `vercel env add`**
- **ALWAYS use `printf` instead** - it doesn't add newlines by default
- Correct command: `printf '%s' "$value" | vercel env add KEY_NAME production`

**Wrong (Corrupts Values)**:
```bash
echo "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production
# Stores: "sk-proj-abc123\n" ❌
```

**Correct (No Newline)**:
```bash
printf '%s' "$OPENAI_API_KEY" | vercel env add OPENAI_API_KEY production
# Stores: "sk-proj-abc123" ✅
```

**Solution Implemented**:
1. Created automated sync script: `scripts/sync-vercel-env.sh`
2. Script uses `printf '%s'` exclusively for all variable syncing
3. Created slash command `/syncVercel` for easy invocation
4. Documented in project memory and SOPs

**Prevention**:
- Use `/syncVercel` slash command for all environment variable syncing
- Never manually pipe values with `echo` to Vercel CLI
- Script validates variables after syncing
- Pre-deployment validation checks env var integrity

**Files Created**:
- `scripts/sync-vercel-env.sh` - Automated sync script using printf
- `.claude/commands/syncVercel.md` - Slash command definition
- Documentation added to `.claude/memory/active-issues.md`

**Duration**: 4+ hours debugging across multiple deployments, 30 minutes to fix once identified

**Related**: This issue caused the failed Vercel deployment at 2025-10-16 13:38 (dpl_CxpJe5dv1h1ywZCCx4d5EuXn5oq2)

**Lesson Learned**:
- `echo` is unsafe for piping sensitive values to external CLIs
- Always use `printf '%s'` for exact value replication
- Trailing whitespace/newlines are invisible in web dashboards
- Test environment variables immediately after syncing
- Automate environment syncing to prevent human error

---

### ✅ CRITICAL: PgBouncer Cache Issue with Manual Schema Changes (2025-10-16)
**Was**:
- Food upload endpoint failing with "The column `food_ingredients.food_photo_id` does not exist" error
- Column verified to exist in database via psql
- Prisma Client correctly generated with foodPhotoId field
- Error persisted despite multiple cache clears and Prisma client regenerations

**Root Cause**:
- DATABASE_URL used PgBouncer connection pooler (port 6543) with `pgbouncer=true`
- Manual schema change (ALTER TABLE to add column) bypassed PgBouncer's schema cache
- Prisma's runtime schema validation checked against stale PgBouncer cache
- PgBouncer cached old schema without food_photo_id column

**Fix**:
- Changed DATABASE_URL from pooler (port 6543) to direct connection (port 5432)
- Removed `pgbouncer=true` parameter
- Restarted Next.js dev server to pick up new connection string
- Food upload endpoint now works correctly

**Lesson Learned**:
- ALWAYS use direct connection (port 5432) for schema changes and development
- Only use pooler connection (port 6543) for production/high-concurrency scenarios
- When manually applying schema changes, PgBouncer cache must be invalidated OR use direct connection
- Prisma migrate deploy should use direct connection to avoid cache issues

**Files Changed**:
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/apps/web/.env.local` - Updated DATABASE_URL
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/apps/web/src/app/api/metabolic/food/route.ts` - Removed ingredients from create include

**Duration**: 3 hours debugging, 5 minutes to fix once root cause identified

**Related**: Migration `20251015000001_add_multi_dish_support` applied manually to `wukrnqifpgjwbqxpockm` database

---

### ✅ BLOCKER: Metabolic Insights Full Deployment Complete (Staging + Production) (2025-10-12)
**Was**:
- Database migrations NOT applied to staging/production (11 tables missing)
- Storage buckets NOT created (food-photos missing)
- 36 RLS policies NOT applied
- Feature completely non-functional in staging/production

**Now (Staging)**:
- ✅ All 11 metabolic tables created
- ✅ All 40 RLS policies applied (36 table + 4 storage)
- ✅ food-photos storage bucket created (PUBLIC for OpenAI Vision API)
- ✅ feature_flags table with metabolic_insights_enabled flag
- ✅ analytics_events table migrated to new schema

**Now (Production)**:
- ✅ All 11 metabolic tables created
- ✅ All 40 RLS policies applied (36 table + 4 storage)
- ✅ food-photos storage bucket created (PUBLIC for OpenAI Vision API)
- ✅ feature_flags table with metabolic_insights_enabled flag
- ✅ analytics_events table migrated to new schema

**Tables Created (Both Environments)**:
1. food_entries, 2. food_photos, 3. food_ingredients, 4. glucose_readings, 5. glucose_predictions, 6. personal_models, 7. meal_templates, 8. metabolic_insights, 9. subscription_tiers, 10. feature_flags, 11. analytics_events (updated)

**Deployment Method**:
- Staging: Manual SQL via psql (staging-migrations-manual.sql + storage SQL)
- Production: Same idempotent SQL files via psql

**Duration**: ~2 hours (both environments)

**Next**: Sprint 7 Day 2 - Admin authentication + Vercel deployment + validation testing

---

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

### ✅ Metabolic Insights Migrations Applied to DEV (2025-10-11)
**Was**: Migrations existed but not applied to any environment
**Now**: Migrations applied to development environment, tables exist and validated in dev
**Note**: Staging and production still pending (see Blocker Issues #1 above)

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
