# EverMed Project State

## Last Updated
2025-10-31

## Current Status
✅ **All Environments Deployed Successfully** (dev, staging, production)
✅ **IPv4/IPv6 Database Connection Fix** - Transaction Pooler implemented across all environments
✅ **Schema Drift Prevention System Implemented**
✅ **8-Week Sprint Plan to App Store Launch** - Created 2025-10-30
✅ **Sprint 1 COMPLETE** - Multi-Dish UI & Meal Editing (2025-10-30)
  - ✅ Multi-dish carousel with per-dish nutrition
  - ✅ Meal editing with Nutritionix search (800,000+ foods)
  - ✅ Real-time nutrition recalculation
  - ✅ Database migration deployed (meal_templates columns)
  - ✅ 10 integration tests, comprehensive documentation
✅ **Sprint 2 COMPLETE** - Glucose Foundation (2025-10-31) 🎉 **11 DAYS AHEAD OF SCHEDULE**
  - ✅ Manual glucose entry with full validation
  - ✅ Glucose list view with color-coded readings
  - ✅ Interactive glucose chart with target range
  - ✅ Real-time API integration (POST, GET, DELETE)
  - ✅ 1,305 lines of code added (3 screens + chart component)
✅ **Sprint 4 COMPLETE** - Timeline & Correlation (2025-10-31) 🎉 **18 DAYS AHEAD OF SCHEDULE**
  - ✅ Combined timeline view (glucose + meals in daily context)
  - ✅ Spike detection algorithm (>30 mg/dL within 2h post-meal)
  - ✅ Daily summary card (avg, time in range, spikes, meals)
  - ✅ Best/worst meal categorization
  - ✅ Color-coded glucose response indicators
  - ✅ 820 lines of code added (1 API client + 1 screen)
🚀 **APP STORE LAUNCH TARGET: December 25, 2025** (7 weeks, 25 days remaining)
🎯 **PROGRESS: 3/8 Sprints Complete (37.5%)** - **18 Days Ahead of Schedule** ⚡
  - Sprint 3: HealthKit Integration (95% complete - optional remaining)
  - Sprint 5: Insights & Analytics (Nov 25-Dec 1) - NEXT
  - Sprint 6: Reports & Export (Dec 2-8)
  - Sprint 7: Polish & Performance (Dec 9-15)
  - Sprint 8: Beta Testing & App Store (Dec 16-25)

## Git Branching Strategy & Environments

### Branch Workflow
```
dev (development) → staging (preview) → main (production)
```

### Environments Configuration

Each environment has its own Supabase project and configuration:

| Environment | Branch | Supabase Org ID | Supabase Project ID | Config File | Vercel Branch |
|------------|--------|-----------------|---------------------|-------------|---------------|
| **Development** | `dev` | `fynzeuadkrldmzsywmlp` | `wukrnqifpgjwbqxpockm` | `.env.local` | development |
| **Staging** | `staging` | `xlrzxirtetsyolahwlzd` | `jwarorrwgpqrksrxmesx` | `.env.staging` | staging/preview |
| **Production** | `main` | `xlrzxirtetsyolahwlzd` | `nqlxlkhbriqztkzwbdif` | `.env.production` | main/production |

**Note:** Production and Staging share the same Supabase organization (`xlrzxirtetsyolahwlzd`), while Development uses a separate organization (`fynzeuadkrldmzsywmlp`).

### Vercel Configuration
- **Vercel Project:** `evermed-app` (https://vercel.com/thomasallnices-projects/evermed-app)
- **Vercel Token:** Available in `.env.local` as `VERCEL_TOKEN`
- **CLI Access:** Configured for programmatic deployment management

### Validation Test Accounts
- **Email:** `testaccount@evermed.ai`
- **Password:** `ValidationTest2025!Secure`
- **Created In:** All 3 environments (dev, staging, production)
- **Person Records:** Completed onboarding in all environments
- **Purpose:** Automated end-to-end validation with authentication
- **Credentials Stored:** `.env.local`, `.env.staging`, `.env.production`

### Environment Files
- **`.env.local`** - Local development (branch: dev)
- **`.env.staging`** - Staging/preview deployments
- **`.env.production`** - Production deployments
- **`.env`** - Currently used for local dev (same as development)

### Branch Purposes:
- **`dev`**: Active development branch
  - All feature work happens here
  - Merge feature branches to `dev`
  - Daily development workflow
  - Uses development Supabase project (wukrnqifpgjwbqxpockm)

- **`staging`**: Staging/preview environment
  - Merge `dev` to `staging` when ready for testing
  - Used for QA and validation
  - Auto-deploys to Vercel staging
  - Uses staging Supabase project (jwarorrwgpqrksrxmesx)
  - Test environment for integration testing

- **`main`**: Production branch
  - Merge `staging` to `main` for production releases
  - Auto-deploys to Vercel production
  - Protected branch (requires reviews)
  - Uses production Supabase project (nqlxlkhbriqztkzwbdif)

### Deployment Flow:
```
Feature Branch → dev → staging → main
     (PR)        (PR)   (merge)  (merge)
     |           |      |        |
     ↓           ↓      ↓        ↓
  (local)   (dev env) (staging) (production)
```

### Important Notes:
- **Never push directly to `main`** - Always go through staging
- **Schema migrations** must be applied to each environment's Supabase project BEFORE deploying code
- Run `npm run validate:all` before merging to any branch
- Tag production releases on `main` branch
- Each environment has separate API keys and database credentials

## Current Phase
**SPRINT 2 COMPLETE - SPRINT 3 STARTING (8-Week Roadmap to App Store)**
**Status:** 🎯 **2/8 Sprints Complete (25%)** - 11 Days Ahead of Schedule

### Sprint 1: Multi-Dish UI & Meal Editing (COMPLETE - 2025-10-30)
- ✅ Multi-dish carousel with per-dish nutrition breakdown
- ✅ Dish number badges and analysis status indicators
- ✅ Meal editing screen with Nutritionix search (800,000+ foods)
- ✅ Real-time nutrition recalculation
- ✅ Backend PATCH endpoint enhanced for multi-dish support
- ✅ Nutritionix proxy API with caching and rate limiting
- ✅ 10 integration tests, comprehensive documentation
- ✅ Database migration deployed (meal_templates columns)
- ✅ Build verification passed
- **Commits:** d02bee1 (multi-dish UI), b0ed09b (meal editing)

### Sprint 2: Glucose Foundation (COMPLETE - 2025-10-31) 🎉 **11 DAYS AHEAD**
- ✅ Manual glucose entry screen with full validation
  - Unit toggle (mg/dL ↔ mmol/L) with live conversion
  - Date/time pickers (no future dates)
  - Source selector (fingerstick/lab)
  - Range validation (20-600 mg/dL)
  - Color-coded range preview
- ✅ Glucose list view with color-coded readings
  - Summary stats (average, time in range %)
  - Pull-to-refresh
  - Long-press delete with confirmation
  - Floating Action Button
- ✅ Basic glucose line chart with target range
  - Interactive timeline visualization (react-native-chart-kit)
  - Target range shading (70-180 mg/dL)
  - Tap-to-view reading details
- ✅ Glucose API integration (POST, GET, DELETE)
  - Session management with retry logic
  - Comprehensive error handling
- ✅ Navigation integration (GlucoseStackNavigator)
- **Commit:** 2c60056
- **Files:** 3 screens + 1 chart component (1,305 lines)

### Sprint 3: HealthKit Integration (NEXT - Starting Early)
- ⏳ Request read permission for glucose from Apple Health
- ⏳ Import glucose samples from HealthKit
- ⏳ Background sync every 15 minutes
- ⏳ CGM detection and brand identification
- ⏳ Settings screen for sync preferences
- ⏳ Deduplicate manual entries with HealthKit data

### Mobile App Progress (iOS)
- ✅ Authentication & Onboarding (Weeks 1-4)
- ✅ Food Tracking with Camera (Weeks 5-7)
- ✅ Meal Templates (Week 7.5)
- ✅ Multi-Dish UI (Sprint 1)
- ✅ Meal Editing (Sprint 1)
- ✅ Manual Glucose Tracking (Sprint 2)
  - ✅ Entry screen with validation
  - ✅ List view with color-coded readings
  - ✅ Interactive timeline chart
  - ✅ Real-time API integration
- ✅ HealthKit Integration (Sprint 3) - 95% Complete
  - ✅ HealthKit API client fully implemented (376 lines)
  - ✅ Profile screen UI complete with connect/sync/import controls
  - ✅ Manual sync, historical import, connection management
  - 🔶 Optional: Background sync scheduling (15-min intervals)
  - 🔶 Optional: CGM brand detection
- ✅ Timeline & Correlation (Sprint 4) 🎉 **NEW**
  - ✅ Combined timeline view (glucose + meals)
  - ✅ Spike detection algorithm (>30 mg/dL, 2h window)
  - ✅ Daily summary card (4 key metrics)
  - ✅ Best/worst meal categorization
  - ✅ Color-coded glucose response indicators
- ⏳ Insights & Analytics (Sprint 5)
- ⏳ Reports & Export (Sprint 6)
- ⏳ Polish & Performance (Sprint 7)
- ⏳ Beta Testing & App Store (Sprint 8)

### Backend Platform (Complete)
- ✅ Core Features Complete
- ✅ PWA Implemented
- ✅ Schema Drift Prevention: Implemented (2025-01-10)
- ✅ All Environments Deployed: Production + Staging/Preview (2025-10-11)
- ✅ IPv4/IPv6 Database Fix: Transaction Pooler implemented (2025-10-11)
- ✅ Google Gemini 2.5 Flash for food recognition
- ✅ Nutritionix API integration (800,000+ foods)

## Key Milestones Completed
- [x] Document vault & RAG implementation
- [x] Authentication & onboarding
- [x] Share packs with passcode protection
- [x] PWA features (manifest, service worker, offline)
- [x] Schema drift prevention system
- [x] Validation scripts and CI/CD gates
- [x] Comprehensive documentation

## Active Work (As of 2025-10-12)

### Metabolic Insights Finalization (Sprint 7-8)
- 🔄 **STATUS DOCUMENT CREATED**: `docs/METABOLIC_INSIGHTS_STATUS_2025-10-12.md`
  - Comprehensive 85% completion assessment
  - Sprint 7-8 roadmap (2-3 weeks to production)
  - Deployment blocker analysis
  - Success metrics defined

### Recent Metabolic Insights Fixes (2025-10-12)
- ✅ Timeline API implemented (was stubbed) - commit `49042ac`
- ✅ Dashboard empty state fixed - commit `49042ac`
- ✅ State timing bug resolved - commit `a36ea9e`
- ✅ OpenAI client lazy initialization - commit `08d4d62`
- ✅ Dashboard displaying meals correctly in dev environment

### Sprint 7 Day 1 Completed (2025-10-12)
1. ✅ Apply database migrations to staging Supabase project
2. ✅ Apply database migrations to production Supabase project
3. ✅ Create `food-photos` storage bucket in staging
4. ✅ Create `food-photos` storage bucket in production
5. ✅ Verify all 40 RLS policies in both environments

### Next Immediate Actions (Sprint 7 Day 2)
1. ⏳ Implement admin authentication (replace placeholder `isAdmin()`)
2. ⏳ Deploy metabolic insights code to Vercel staging
3. ⏳ Run validation tests with staging test account
4. ⏳ Fix any staging-specific issues
5. ⏳ Deploy to production and validate

## Known Issues

### Remaining Metabolic Insights Tasks
1. **Admin Authentication Placeholder** 🚨 CRITICAL (Sprint 7 Day 2)
   - `isAdmin()` in `apps/web/src/lib/auth.ts` returns `true` for everyone
   - Risk: Admin endpoints publicly accessible
   - Endpoints at risk: `/admin/metabolic`, `/api/admin/*`
   - Status: Next priority for Sprint 7 Day 2

2. **LSTM Model Mock Baseline** 🔶 OPTIONAL (Sprint 9)
   - Using mock predictor instead of TensorFlow.js LSTM
   - Risk: Inaccurate predictions (acceptable for beta)
   - Decision: Can launch beta without, iterate post-launch with real user data

## Recent Fixes (2025-10-11)
- ✅ Production database connection failure (IPv4/IPv6 incompatibility) - RESOLVED
  - Switched from direct connection to Supabase Transaction Pooler (port 6543)
  - All environments now use IPv4-compatible pooler URLs
  - Production vault page fully functional
- ✅ Vercel environment variables cleanup
  - Deleted 48 old/unused variables
  - Uploaded fresh configurations from `.env` files
  - Synchronized production (38 vars) and preview (39 vars) environments

## Next Steps

### IMMEDIATE: Tech Stack Decision Required
**Documentation:** `docs/TECH_STACK_ANALYSIS_2025.md`

**Decision:** OpenAI GPT-5 vs Google Gemini 2.5 Flash for food analysis
- **Recommendation:** Migrate to Google Gemini 2.5 Flash
- **Cost Savings:** 40% reduction ($27.50/month at beta scale, $1,650/year at 1,000 users)
- **Performance:** 20% better food recognition (CalCam case study)
- **Integration:** Native GCP integration (existing account)
- **Migration Time:** 2-3 days (low risk, feature flag rollback available)
- **Approval Needed:** Tech lead, product manager, finance

**If Approved:**
1. Enable Vertex AI API in Google Cloud project
2. Implement Gemini integration with feature flag
3. Side-by-side testing with 10+ sample photos
4. Gradual rollout to staging → production
5. Monitor for 2 weeks, then remove OpenAI implementation

**If Deferred:**
- Keep current OpenAI GPT-4o implementation
- Revisit when cost optimization becomes priority

---

### Operational Next Steps
1. Monitor production deployment for stability
2. Run automated validation workflows with test accounts
3. Verify all critical user flows (auth, vault, upload, chat, share packs)
4. Apply metabolic insights migrations to staging database
5. Re-enable stubbed metabolic endpoints
6. Run comprehensive deployment validation

## Technical Debt
- [ ] Add pre-commit hooks for validation
- [ ] Schedule daily schema parity checks
- [ ] Implement ESLint rules for type safety
- [ ] Add blue-green deployment capability
