# Metabolic Insights Feature: Current Status & Finalization Plan

**Date**: October 12, 2025
**Overall Completion**: 85% ✅ (All 6 sprints complete, deployment pending)
**Production Status**: DEV WORKING ✅ | STAGING PENDING ⚠️ | PRODUCTION BLOCKED ⚠️

---

## Executive Summary

**Metabolic Insights is FEATURE COMPLETE but NOT YET DEPLOYED.** All core functionality has been implemented and is working in the local development environment. The dashboard loads, food photos can be uploaded and analyzed, and the timeline API is functional.

**Current State (as of 2025-10-12)**:
- ✅ Database schema complete (11 tables in Prisma schema)
- ✅ API endpoints implemented (10 endpoints)
- ✅ UI components built (7 pages, Material Design)
- ✅ Food recognition working (OpenAI Vision + Gemini 2.5 Flash)
- ✅ Dashboard displaying meals correctly
- ⚠️ Database migrations NOT applied to staging/production
- ⚠️ Storage buckets NOT created in staging/production
- ⚠️ Admin authentication is placeholder (security risk)
- ⚠️ LSTM model is mock baseline (needs TensorFlow.js)

**Path to Production**: 2-3 weeks (see Sprint 7-8 below)

---

## What's Working RIGHT NOW (Dev Environment)

Based on recent dev server logs and commits, these features are CONFIRMED WORKING:

### ✅ Core Functionality
1. **Food Photo Upload**: Users can upload photos via `/metabolic/camera`
2. **AI Analysis**: OpenAI Vision API analyzes photos and extracts ingredients
3. **Dashboard Display**: `/metabolic/dashboard` shows meals with ingredients
4. **Timeline API**: `/api/analytics/timeline/daily` returns meal and glucose data
5. **Food Entry Details**: `/metabolic/entry/[id]` displays detailed ingredient breakdown

### ✅ Recent Fixes Applied
- **Timeline API Fix** (commit `49042ac`): Implemented actual database queries (was stubbed)
- **Dashboard Empty State Fix** (commit `49042ac`): Shows meals even without glucose data
- **State Timing Fix** (commit `a36ea9e`): Uses fetched data directly in calculations
- **OpenAI Client Fix** (commit `08d4d62`): Lazy initialization to avoid module-load errors

### ✅ Database Schema (Confirmed in Prisma)
All 11 tables are defined in `db/schema.prisma`:
1. `FoodEntry` - Meal logging with nutrition totals
2. `FoodPhoto` - Photos with analysis status tracking
3. `FoodIngredient` - Ingredient details with nutrition
4. `GlucoseReading` - Time-series glucose data
5. `GlucosePrediction` - ML glucose forecasts
6. `PersonalModel` - Per-user ML models
7. `MealTemplate` - Reusable meal templates
8. `MetabolicInsight` - Daily/weekly insights
9. `SubscriptionTier` - Premium tier management
10. `FeatureFlag` - Feature toggles
11. `AnalyticsEvent` - Non-PHI telemetry

---

## What's NOT Working Yet

### ⚠️ Deployment Blockers (MUST FIX)

#### 1. Database Migrations Not Applied
**Issue**: Schema exists in `db/schema.prisma` but migrations not applied to staging/production databases.

**Evidence**: The `project-state.md` says "Metabolic Insights - Migrations ready, pending staging deployment"

**Risk**: HIGH - Code will fail in staging/production without database tables.

**Fix**:
```bash
# For staging
supabase link --project-ref jwarorrwgpqrksrxmesx
supabase db push

# For production
supabase link --project-ref nqlxlkhbriqztkzwbdif
supabase db push
```

**Migration Files** (from COMPLETE.md):
- `db/migrations/20251010090000_add_metabolic_insights/migration.sql`
- `db/migrations/20251010090001_add_metabolic_rls_policies/migration.sql`
- `db/migrations/20250610000000_add_feature_flags_and_analytics/migration.sql`

---

#### 2. Storage Buckets Not Created
**Issue**: Code expects `food-photos` and `ml-models` buckets in Supabase Storage.

**Risk**: HIGH - Photo uploads will fail without buckets.

**Fix**:
```bash
# Run setup scripts for staging
./scripts/setup-food-photos-bucket.sh staging

# Run setup scripts for production
./scripts/setup-food-photos-bucket.sh prod
```

**RLS Policies Required**: Path-based isolation (`{userId}/*`)

---

#### 3. Admin Authentication Placeholder
**Issue**: `apps/web/src/lib/auth.ts` has `isAdmin()` returning `true` (placeholder).

**Risk**: CRITICAL - Admin endpoints (`/admin/metabolic`, `/api/admin/*`) are publicly accessible.

**Fix**: Implement role-based auth using:
- Supabase RLS with `user_roles` table, OR
- JWT claims with `role: 'admin'` field

**Affected Endpoints**:
- `/api/admin/metabolic` - Metrics dashboard
- `/api/admin/feature-flags` - Feature flag management

---

#### 4. TensorFlow.js LSTM Not Integrated
**Issue**: Glucose prediction uses mock baseline predictor, not real LSTM model.

**Risk**: MEDIUM - Predictions will be inaccurate, but won't break functionality.

**Current State**: Mock predictor returns `currentGlucose + (carbs * 2.5)`.

**Fix**: Implement LSTM training/inference (3-5 days work):
1. Install: `npm install @tensorflow/tfjs-node`
2. Complete TODO markers in `apps/web/src/lib/ml/training.ts`
3. Train baseline models for test users
4. Deploy to staging for validation

**Can Launch Without**: Yes, as long as we communicate "Early Beta - Predictions Improving"

---

### 🔶 Enhancement Opportunities (NICE TO HAVE)

#### 5. CGM Provider Integrations
**Status**: NOT IMPLEMENTED (manual glucose entry only)

**Target Integrations**:
- Dexcom G7 via HealthKit (iOS)
- FreeStyle Libre via LibreLinkUp
- Generic CGM via Google Fit (Android)

**Timeline**: 4-6 weeks (post-launch Phase 2)

---

#### 6. Background Job Workers
**Status**: NOT IMPLEMENTED (AI analysis runs in API route, blocks response)

**Issue**: Food photo analysis takes 15-25 seconds, delays user feedback.

**Ideal**: Offload to Cloud Run worker, return immediately with "Processing..." status.

**Timeline**: 2-3 weeks (post-launch Phase 2)

---

#### 7. Test Coverage Gaps
**Status**: Sprint 1-3 tested (105 tests), Sprint 4-6 NOT tested (0 tests)

**Missing Tests**:
- ML pipeline (training, prediction, versioning)
- UI components (dashboard, camera, ingredient editor)
- Admin dashboard (metrics, feature flags)

**Recommendation**: Invoke `vitest-test-writer` subagent for Sprint 4-6 coverage.

**Timeline**: 1 week

---

## Current Git Status

```
Branch: dev
Recent commits:
- a36ea9e: fix(metabolic): use fetched data directly in summary calculation
- 49042ac: fix(metabolic): implement timeline API and fix dashboard empty state
- 08d4d62: fix(metabolic): lazy-initialize OpenAI client
- 7049fe0: feat(metabolic): add food tracker UI
- 70535e4: feat(metabolic): implement food photo analysis using OpenAI Vision API
```

**Uncommitted Changes**:
- Various documentation deletions (old docs cleanup)
- No code changes pending

---

## Environment Status

### Development (Branch: dev)
- ✅ Database: Connected (wukrnqifpgjwbqxpockm)
- ✅ Supabase Storage: `food-photos` bucket exists
- ✅ Environment Variables: All set in `.env.local`
- ✅ Dev Server: Running on http://192.168.178.114:3200
- ✅ Test Account: testaccount@evermed.ai working
- ✅ Dashboard: Loading and displaying meals

### Staging (Branch: staging)
- ⚠️ Database: Migrations NOT applied (jwarorrwgpqrksrxmesx)
- ⚠️ Supabase Storage: Buckets NOT created
- ⚠️ Environment Variables: Need Google Vision + Nutritionix keys
- 🔄 Deployment: Pending migration application
- ⚠️ Test Account: Needs validation after migration

### Production (Branch: main)
- ❌ Database: Migrations NOT applied (nqlxlkhbriqztkzwbdif)
- ❌ Supabase Storage: Buckets NOT created
- ❌ Environment Variables: Missing external API keys
- 🚫 Deployment: BLOCKED until staging validated
- ❌ Test Account: Not yet tested

---

## Finalization Sprint Plan (Sprint 7-8)

### Sprint 7: Staging Deployment (Week 1-2)
**Goal**: Get Metabolic Insights working in staging environment

**Tasks**:
1. **Database Migrations** (Day 1) - HIGH PRIORITY
   - Link to staging Supabase project
   - Apply all metabolic insights migrations
   - Verify all 11 tables created
   - Test RLS policies with staging test account

2. **Storage Buckets** (Day 1) - HIGH PRIORITY
   - Create `food-photos` bucket in staging
   - Configure path-based RLS policies
   - Create `ml-models` bucket in staging
   - Test photo upload and retrieval

3. **Admin Authentication** (Day 2-3) - CRITICAL
   - Implement role-based auth (choose Supabase RLS or JWT)
   - Create `user_roles` table if needed
   - Update `isAdmin()` to check real roles
   - Test admin endpoint protection

4. **Environment Variables** (Day 1)
   - Add `GOOGLE_VISION_API_KEY` to staging Vercel
   - Add `NUTRITIONIX_APP_ID` and `NUTRITIONIX_APP_KEY`
   - Verify all existing vars copied from dev

5. **Deploy to Staging** (Day 2)
   - Merge `dev` → `staging` branch
   - Trigger Vercel deployment
   - Monitor build logs for errors
   - Run smoke tests

6. **Validation Testing** (Day 3-4)
   - Sign up/login with staging test account
   - Upload food photo via camera
   - Verify AI analysis completes
   - Check dashboard displays meal
   - Test ingredient editing
   - Verify admin dashboard loads
   - Test feature flag toggles

7. **Bug Fixes** (Day 4-5)
   - Fix any staging-specific issues
   - Update error messages
   - Improve loading states
   - Handle edge cases

**Deliverables**:
- ✅ Staging environment fully functional
- ✅ Admin authentication secured
- ✅ All critical bugs fixed
- ✅ Validation checklist 100% passed

**Success Criteria**:
- Can upload and analyze 10+ food photos without errors
- Dashboard loads in <2 seconds
- No console errors or security warnings
- Admin dashboard accessible only to admins

---

### Sprint 8: Production Launch Prep (Week 2-3)
**Goal**: Deploy to production and launch closed beta

**Tasks**:
1. **Production Database Setup** (Day 1)
   - Link to production Supabase project
   - Apply all migrations
   - Create storage buckets
   - Test with production test account

2. **Production Deployment** (Day 2)
   - Merge `staging` → `main` branch
   - Configure Vercel environment variables
   - Deploy to production
   - Monitor for errors

3. **Feature Flag Configuration** (Day 2)
   - Set `metabolic_insights_enabled` to 10% rollout
   - Create admin UI for flag management
   - Test hash-based user bucketing
   - Document rollout process

4. **Beta User Recruitment** (Day 3-5)
   - Identify 100 existing premium users
   - Send beta invitation emails
   - Create onboarding guide
   - Set up feedback collection form

5. **Monitoring Setup** (Day 3)
   - Configure alerts for error rates
   - Set up dashboard for adoption metrics
   - Create daily report automation
   - Document incident response process

6. **LSTM Integration** (OPTIONAL - Day 6-10)
   - Install TensorFlow.js dependency
   - Replace mock predictor with LSTM
   - Train baseline models
   - Validate accuracy (target: MAE < 12 mg/dL)
   - Deploy to staging, then production

**Deliverables**:
- ✅ Production environment live
- ✅ 10% feature flag rollout active
- ✅ 100 beta users invited
- ✅ Monitoring dashboard operational
- 🔶 LSTM integrated (optional for Week 1)

**Success Criteria (Week 1)**:
- 50+ beta users activated (50% of invited)
- 30+ meals logged per day
- Error rate <2%
- No critical security issues
- Positive user feedback (>4.0/5.0)

---

## Resource Requirements

### Developer Time
- **Sprint 7**: 5 days (40 hours)
- **Sprint 8**: 5 days (40 hours)
- **LSTM Integration**: +5 days (optional)

### External Services
- **Google Cloud Vision API**: $1.50 per 1,000 images
- **Nutritionix API**: Free tier (5,000 requests/day)
- **Supabase**: Existing plan sufficient (until 1,000+ users)

### Budget Estimate
- **Cloud Services**: $50-100/month (beta phase)
- **Monitoring**: $0 (using Vercel Analytics)
- **Total Sprint 7-8**: $100-200

---

## Risk Assessment

### High Risk
1. **Migration Failures**: If migrations fail in production, rollback is complex
   - **Mitigation**: Test thoroughly in staging, have rollback plan
2. **Admin Auth Bypass**: Security vulnerability if not fixed before launch
   - **Mitigation**: Make this Sprint 7 Day 2 priority, test extensively

### Medium Risk
3. **Poor LSTM Accuracy**: Users lose trust if predictions are wildly inaccurate
   - **Mitigation**: Launch with baseline predictor, communicate "improving daily"
4. **Storage Costs**: Photos could consume significant storage at scale
   - **Mitigation**: Implement photo compression, auto-delete after 90 days

### Low Risk
5. **CGM Integration Delays**: Manual entry is sufficient for beta
   - **Mitigation**: Postpone to Phase 2, focus on core experience
6. **Performance Issues**: Dashboard could slow down with many meals
   - **Mitigation**: Already optimized (p95 < 400ms), pagination implemented

---

## Success Metrics (Beta Launch)

### Week 1 Goals
- **Activation**: 50+ users (50% of invited)
- **Engagement**: 30+ meals logged/day (average 0.6 meals/user/day)
- **Retention**: 60% of Day 1 users return on Day 7
- **Error Rate**: <2%
- **User Satisfaction**: >4.0/5.0 average rating

### Month 1 Goals
- **Activation**: 80+ users (80% of invited)
- **Engagement**: 150+ meals logged/day (average 2 meals/user/day)
- **Retention**: 40% monthly retention
- **Conversion**: 15% of free users upgrade to premium
- **Revenue**: $100+ MRR (10 premium users × $9.99)

---

## Technical Debt & Future Work

### Phase 2 (Month 2-3)
1. CGM provider integrations (OAuth flows)
2. Background job workers (Cloud Run)
3. LSTM model improvements (hyperparameter tuning)
4. Comprehensive test coverage (Sprint 4-6)
5. Performance optimizations (Redis caching)

### Phase 3 (Month 4-6)
6. Social features (meal sharing, community)
7. Caregiver mode (family accounts)
8. Clinical report export (PDF generation)
9. Nutrition database expansion (restaurant menus)
10. Voice input for meal logging

### Phase 4 (Month 7-12)
11. FDA pathway preparation (Class II SaMD)
12. Clinical validation study (500 patients)
13. Insulin dose recommendations (requires FDA approval)
14. Medication timing optimization
15. International expansion (GDPR compliance)

---

## Documentation Status

### ✅ Complete
- `/docs/metabolic-insights-prd.md` - Product requirements
- `/docs/metabolic-insights-technical-plan.md` - Technical implementation
- `/docs/METABOLIC_INSIGHTS_COMPLETE.md` - Sprint 1-6 summary
- `/docs/METABOLIC_INSIGHTS_MIGRATION_SUMMARY.md` - Database schema
- `/docs/EXTERNAL_API_INTEGRATION_SUMMARY.md` - API clients
- `/docs/SPRINT_3_ANALYTICS_REPORT.md` - Analytics implementation
- `/docs/SPRINT4_ML_SUMMARY.md` - ML pipeline
- `/docs/SPRINT_5_UI_IMPLEMENTATION.md` - UI components
- `/docs/SPRINT_6_BETA_LAUNCH_SUMMARY.md` - Beta features

### ⚠️ Needs Update
- `.claude/memory/project-state.md` - Update with Sprint 7-8 plan
- `.claude/memory/active-issues.md` - Add deployment blockers
- `CLAUDE.md` - Add Metabolic Insights architecture section
- `README.md` - Mention Metabolic Insights feature

### 🆕 Needs Creation
- `/docs/METABOLIC_INSIGHTS_DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- `/docs/METABOLIC_INSIGHTS_TROUBLESHOOTING.md` - Common issues and fixes
- `/docs/METABOLIC_INSIGHTS_USER_GUIDE.md` - End-user documentation

---

## Recommendations

### Immediate Actions (This Week)
1. ✅ **Read this document** to understand current state
2. ⚠️ **Apply migrations to staging** (Day 1 priority)
3. ⚠️ **Create storage buckets** (Day 1 priority)
4. ⚠️ **Fix admin authentication** (Day 2 priority)
5. ✅ **Deploy to staging** and run validation tests

### Strategic Decisions Required
1. **LSTM Now or Later?**
   - **Option A**: Launch beta with baseline predictor, add LSTM in 2 weeks
   - **Option B**: Delay launch 1 week, launch with LSTM integrated
   - **Recommendation**: Option A (faster time to market, iterate based on feedback)

2. **Beta Size?**
   - **Option A**: 100 users (manageable, tight feedback loop)
   - **Option B**: 500 users (faster data collection, risk of scaling issues)
   - **Recommendation**: Option A (quality over quantity in beta)

3. **Premium Pricing?**
   - **Current**: $9.99/month (5 meals/week free)
   - **Alternative**: $14.99/month (unlimited, higher perceived value)
   - **Recommendation**: Keep $9.99 for beta, increase after clinical validation

---

## Conclusion

**Metabolic Insights is 85% complete and ready for deployment preparation.** All core functionality works in development. The remaining 15% is deployment tasks (migrations, storage, auth) and optional enhancements (LSTM).

**Path to Launch**:
- **Sprint 7** (Week 1-2): Staging deployment + validation
- **Sprint 8** (Week 2-3): Production deployment + beta launch
- **Total Time**: 2-3 weeks to first beta users

**Key Success Factor**: Focus on Sprint 7 blockers first (migrations, storage, admin auth). Everything else can be iterated post-launch.

---

**Next Steps**: See Sprint 7 task list above. Start with migrations and storage buckets.

---

*Document Created*: 2025-10-12
*Author*: Claude Code
*Implementation Method*: Mandatory Subagent Architecture
*Co-Authored-By*: Claude <noreply@anthropic.com>
