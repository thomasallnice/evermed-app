# EverMed Project State

## Last Updated
2025-01-10

## Current Status
✅ **Schema Drift Prevention System Implemented**
✅ **PWA Features Complete** (offline support, installable)
⚠️ **Metabolic Insights** - Migrations ready, pending staging deployment

## Git Branching Strategy

### Branch Workflow
```
dev (development) → staging (preview) → main (production)
```

### Branch Purposes:
- **`dev`**: Active development branch
  - All feature work happens here
  - Merge feature branches to `dev`
  - Daily development workflow
  - Auto-deploys to development preview (if configured)

- **`staging`**: Staging/preview environment
  - Merge `dev` to `staging` when ready for testing
  - Used for QA and validation
  - Auto-deploys to Vercel staging
  - Test environment for integration testing
  - Validate before production

- **`main`**: Production branch
  - Merge `staging` to `main` for production releases
  - Auto-deploys to production
  - Protected branch (requires reviews)
  - Represents live production state

### Deployment Flow:
```
Feature Branch → dev → staging → main
     (PR)        (PR)   (merge)  (merge)
```

### Important Notes:
- **Never push directly to `main`** - Always go through staging
- **Schema migrations** must be applied to staging BEFORE deploying code
- Run `npm run validate:all` before merging to any branch
- Tag production releases on `main` branch

## Current Phase
- ✅ Core Features Complete
- ✅ PWA Implemented
- ⚠️ Schema Drift Prevention: Implemented (2025-01-10)
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
- Deploying PWA to staging
- Fixing schema drift issues
- Preparing metabolic insights for deployment

## Known Issues
- Metabolic insights migrations not yet applied to staging
- Some endpoints temporarily stubbed pending migrations
- AnalyticsEvent schema evolution in progress (old vs new fields)

## Next Steps
1. Apply metabolic insights migrations to staging database
2. Re-enable stubbed metabolic endpoints
3. Run deployment validation
4. Promote staging to production after validation

## Technical Debt
- [ ] Add pre-commit hooks for validation
- [ ] Schedule daily schema parity checks
- [ ] Implement ESLint rules for type safety
- [ ] Add blue-green deployment capability
