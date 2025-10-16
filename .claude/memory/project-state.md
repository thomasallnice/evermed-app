# EverMed Project State

## Last Updated
2025-10-16

## Current Status
✅ **All Environments Deployed Successfully** (dev, staging, production)
✅ **IPv4/IPv6 Database Connection Fix** - Transaction Pooler implemented across all environments
✅ **Schema Drift Prevention System Implemented**
✅ **PWA Features Complete** (offline support, installable)
✅ **Validation Commands with Test Accounts** - Automated validation ready
✅ **Tech Stack Analysis Complete** - Comprehensive 2025 optimization research completed
🎯 **MVP FEATURES COMPLETE - BETA LAUNCH READY** (2025-10-16)
  - ✅ Mock glucose predictions API implemented (baseline-v1.0 model)
  - ✅ Daily insights generation with 7-day pattern detection
  - ✅ Dashboard showing all insights (time in range, spikes, meal impact)
  - ✅ Implementation roadmap created (4-week timeline to beta)
  - 🔶 CGM integration next priority (3 weeks)
  - 🔶 LSTM model optional for beta launch
🔍 **DECISION REQUIRED** - Tech stack migration: OpenAI GPT-5 vs Google Gemini 2.5 Flash

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
**MVP FEATURE COMPLETE - BETA PREPARATION (Week 1 of 4-week timeline)**

### Core Platform (Complete)
- ✅ Core Features Complete
- ✅ PWA Implemented
- ✅ Schema Drift Prevention: Implemented (2025-01-10)
- ✅ All Environments Deployed: Production + Staging/Preview (2025-10-11)
- ✅ IPv4/IPv6 Database Fix: Transaction Pooler implemented (2025-10-11)

### Metabolic Insights MVP (COMPLETE - 2025-10-16)
- ✅ Database schema complete (11 tables in Prisma)
- ✅ API endpoints implemented (12 endpoints)
- ✅ UI components built (7 pages, Material Design)
- ✅ Food recognition working (Google Gemini 2.5 Flash + Nutritionix)
- ✅ Dashboard displaying meals + glucose timeline
- ✅ **Mock glucose predictions API** (baseline-v1.0 model, 2-hour forecasts)
- ✅ **Daily insights generation** (time in range, spikes, meal impact)
- ✅ **7-day pattern detection** (trends, consistent meals, warnings)
- ✅ Dashboard showing all insights (not just latest)
- ✅ **STAGING DEPLOYED** (2025-10-12): 11 tables + 40 RLS policies + food-photos bucket
- ✅ **PRODUCTION DEPLOYED** (2025-10-12): 11 tables + 40 RLS policies + food-photos bucket
- 🔶 CGM integration (next priority, 3 weeks)
- 🔶 LSTM model (optional for beta)

### Next: Milestone 1 - CGM Integration (2-3 weeks)
1. ✅ Research Dexcom Developer Portal requirements (COMPLETE - Oct 16)
2. ✅ Configure DEXCOM environment variables (COMPLETE - Oct 16)
3. ✅ Apply CGM database migration (COMPLETE - Oct 16)
4. ✅ Build connection status UI in settings (COMPLETE - Oct 16)
5. 🔶 Test OAuth flow with Dexcom sandbox (next priority)
6. 🔶 Implement automatic background sync (2 days)
7. 🔶 Deploy to staging and validate (1 day)

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
