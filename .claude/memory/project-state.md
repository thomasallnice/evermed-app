# EverMed Project State

## Last Updated
2025-10-11

## Current Status
✅ **All Environments Deployed Successfully** (dev, staging, production)
✅ **IPv4/IPv6 Database Connection Fix** - Transaction Pooler implemented across all environments
✅ **Schema Drift Prevention System Implemented**
✅ **PWA Features Complete** (offline support, installable)
✅ **Validation Commands with Test Accounts** - Automated validation ready
⚠️ **Metabolic Insights** - Migrations ready, pending staging deployment

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
- ✅ Core Features Complete
- ✅ PWA Implemented
- ✅ Schema Drift Prevention: Implemented (2025-01-10)
- ✅ All Environments Deployed: Production + Staging/Preview (2025-10-11)
- ✅ IPv4/IPv6 Database Fix: Transaction Pooler implemented (2025-10-11)
- 🔄 Metabolic Insights: Migrations pending on staging
- 📋 Next: Apply migrations to staging, re-enable endpoints

## Key Milestones Completed
- [x] Document vault & RAG implementation
- [x] Authentication & onboarding
- [x] Share packs with passcode protection
- [x] PWA features (manifest, service worker, offline)
- [x] Schema drift prevention system
- [x] Validation scripts and CI/CD gates
- [x] Comprehensive documentation

## Active Work
- ✅ All environments deployed successfully (2025-10-11)
- ✅ IPv4/IPv6 database connection issue resolved (2025-10-11)
- ✅ Vercel environment variables cleaned and synchronized (2025-10-11)
- 📋 Next: Apply metabolic insights migrations to staging

## Known Issues
- Metabolic insights migrations not yet applied to staging
- Some endpoints temporarily stubbed pending migrations
- AnalyticsEvent schema evolution in progress (old vs new fields)

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
