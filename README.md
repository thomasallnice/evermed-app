# EverMed — Developer README

**Glucose Tracking Application**

Monorepo for EverMed, an intelligent glucose tracking app with photo-first meal logging, AI food recognition, and personalized metabolic insights.

## Product Focus

EverMed helps users understand how food affects their blood sugar through:
- Photo-first meal logging (< 5 seconds to log)
- AI food recognition (Google Gemini 2.5 Flash)
- Nutrition database (Nutritionix API - 900k+ foods)
- Glucose-meal correlation (CGM or manual entry)
- Daily insights and pattern detection
- Weekly summaries for doctor appointments

**Note:** EverMed pivoted from a health document vault to glucose tracking in October 2025. Previous RAG/OCR/SharePack features were removed.

## Layout

- `apps/web` — Next.js 14 (App Router) web app + API routes
- `packages/config` — Shared ESLint, Prettier, TSConfig
- `packages/types`, `packages/ui` — Shared types and UI components
- `db` — Prisma schema & migrations (PostgreSQL/Supabase)
- `docs` — Product specs, PRD, architecture docs
- `tests` — Vitest unit tests (non-PHI data only)

## Core Features

### Food Tracking
- Photo upload → AI food recognition → Nutrition lookup
- Manual meal entry with search
- Meal templates for repeated meals
- Food photo storage with RLS policies

### Glucose Monitoring
- Manual fingerstick entry
- CGM integration (Dexcom, FreeStyle Libre) via OAuth
- Time-series visualization
- Spike detection (>180 mg/dL, >50 mg/dL rise)

### Analytics & Insights
- Glucose-meal correlation (2-4 hour windows)
- Daily timeline (meals + glucose readings)
- Pattern detection (spikes, stable meals, trends)
- Weekly summaries with PDF export

### Admin Dashboard
- Adoption metrics (meals logged, active users)
- Engagement metrics (retention, feature usage)
- Performance metrics (API latency, AI accuracy)
- Non-PHI telemetry only (aggregated, anonymized)

## Quick Start (Local Development)

### Prerequisites
- Node 20+
- Supabase project (Auth + Storage)
- Google Cloud Vision API key (food recognition)
- Nutritionix API key (nutrition database)
- OpenAI API key (optional, for embeddings)

### Setup
```bash
git clone <repo-url>
cd 2025_EverMed
npm ci
cp .env.example .env.local
# Populate environment variables (see .env.example)
```

### Environment Variables
Required variables in `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.your-project:password@pooler.supabase.com:6543/postgres

# AI Services
GOOGLE_CLOUD_PROJECT=your-gcp-project
GOOGLE_APPLICATION_CREDENTIALS_JSON=base64-encoded-service-account-json
USE_GEMINI_FOOD_ANALYSIS=true

# Nutritionix API
NUTRITIONIX_APP_ID=your-app-id
NUTRITIONIX_APP_KEY=your-app-key

# Optional: OpenAI (for future features)
OPENAI_API_KEY=your-openai-key
```

### Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Apply migrations (local or staging)
npm run prisma:migrate:deploy

# Seed database (optional)
npm run seed
```

### Admin User Management
```bash
# List admin users
npm run admin:list

# Add admin user
npm run admin:add <supabase-user-id> <email>
# Example: npm run admin:add abc-123-def tom@evermed.ai
```

## Local Build Validation (MANDATORY Before Deploying)

**ALWAYS run these checks before pushing to staging/production:**

```bash
# 1. Clean all caches (critical!)
npm run clean:next

# 2. Verify Prisma client is generated
ls node_modules/.prisma/client/index.d.ts || npx prisma generate

# 3. Full TypeScript check (shows ALL errors at once)
npm run typecheck

# 4. Linter check
npm run lint

# 5. Unit tests
npm run test

# 6. Production build test
npm run build

# Exit code must be 0 for all steps
```

**Why this matters:**
- Next.js incremental compilation hides errors in cached builds
- Vercel always does fresh builds - errors appear there if skipped locally
- **Incident (2025-10-11)**: 6+ hours wasted discovering 20+ errors one-by-one on Vercel
- See `.claude/memory/deployment-workflow.md` for full incident report

**If TypeScript errors found:**
```bash
# Count total errors
npm run typecheck 2>&1 | tee typescript-errors.log
grep "error TS" typescript-errors.log | wc -l

# Decision matrix:
# < 10 errors: Fix all now (15-30 min)
# 10-20 errors: Batch fix in one session (1 hour)
# > 20 errors: Consider staged rollout (see docs/vercel-typescript-quirk.md)
```

**Never push if builds fail locally - Vercel will also fail.**

## Deployment & Testing

### Staging Deployment
```bash
# 1. Apply database migrations to staging
export DATABASE_URL="postgresql://postgres.staging-ref:password@pooler.supabase.com:6543/postgres"
npm run prisma:migrate:deploy

# 2. Push code to staging branch
git checkout staging
git merge dev --no-edit
git push origin staging

# 3. Vercel auto-deploys on push to staging branch

# 4. Run smoke tests
./scripts/smoke-e2e.sh --env staging
```

### Production Deployment
```bash
# 1. Apply database migrations to production
export DATABASE_URL="postgresql://postgres.prod-ref:password@pooler.supabase.com:6543/postgres"
npm run prisma:migrate:deploy

# 2. Merge staging to main
git checkout main
git merge staging --no-edit
git push origin main

# 3. Vercel auto-deploys on push to main

# 4. Monitor for errors
# Check Vercel logs, Supabase logs, Sentry (if configured)
```

### Troubleshooting

#### Dev Server Issues
- If the dev server reports missing `_next/static/chunks/*.js` files (e.g., `main-app.js` 404):
  ```bash
  npm run clean:next
  npm ci
  npm run dev
  ```

#### Database Issues
- If food photo uploads fail with Supabase RLS errors:
  ```bash
  # Check RLS policies in Supabase Dashboard → Storage → food-photos
  # Policies should allow users to upload/view/delete their own photos only
  ```

- If glucose readings aren't saving:
  ```bash
  # Verify Person record exists for user
  npm run prisma:generate
  # Check database connection
  echo $DATABASE_URL
  ```

#### AI Services Issues
- If food recognition fails:
  ```bash
  # Check Google Cloud Vision API credentials
  echo $GOOGLE_APPLICATION_CREDENTIALS_JSON | base64 -d
  # Verify project has Vision API enabled
  ```

- If nutrition lookup fails:
  ```bash
  # Check Nutritionix API keys
  echo $NUTRITIONIX_APP_KEY
  # Test API directly: curl -H "x-app-id: $NUTRITIONIX_APP_ID" -H "x-app-key: $NUTRITIONIX_APP_KEY" "https://trackapi.nutritionix.com/v2/natural/nutrients" -d "query=1 apple"
  ```

#### Build Issues
- If Prisma client types are missing:
  ```bash
  npm run prisma:generate
  npm run build
  ```

- If migrations fail with connection timeout:
  ```bash
  # Use direct psql connection (not Prisma CLI)
  PGPASSWORD='password' psql -h project.pooler.supabase.com -U postgres.project-ref -d postgres -p 6543 -f db/migrations/XXXXXX_migration_name/migration.sql
  ```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs:
1. Install dependencies
2. Clean Next.js cache
3. Generate Prisma client
4. Apply migrations (if `SUPABASE_DB_URL` set)
5. Lint, typecheck, unit tests
6. Build monorepo

All steps must pass before merge to main.

## Documentation

### Product Documentation
- **Product Description**: `docs/project-description.md` (non-technical overview)
- **PRD**: `docs/metabolic-insights-prd.md` (detailed feature specs)
- **Technical Details**: `docs/METABOLIC_INSIGHTS_COMPLETE.md`

### Developer Documentation
- **CLAUDE.md**: Instructions for Claude Code AI assistant
- **CODE_REVIEW.md**: Pre-PR checklist
- **CONTRIBUTING.md**: Contribution guidelines
- **Deployment Guide**: `docs/archive/pivot-2025-10-15/STAGING_DEPLOYMENT_CHECKLIST.md`

### Architecture Documentation
- **Database Schema**: `db/schema.prisma` (14 metabolic tables)
- **API Routes**: `apps/web/src/app/api/` (metabolic, analytics, admin endpoints)
- **SOPs**: `.claude/sops/` (database changes, deployment, testing)

## Testing

### Unit Tests
```bash
# Run all tests
npm run test

# Run specific test file
npx vitest run tests/unit/auth.spec.ts

# Run tests in watch mode
npx vitest
```

### E2E Tests (Future)
```bash
# Placeholder - E2E tests deferred to later PRs
npm run e2e
```

### Manual Testing Checklist
Before deploying to production:
- [ ] Sign up flow works (email/password)
- [ ] Onboarding saves glucose targets
- [ ] Photo upload and food recognition works
- [ ] Manual meal entry and search works
- [ ] Glucose readings save correctly
- [ ] Dashboard timeline displays meals + glucose
- [ ] Daily insights generate correctly
- [ ] Weekly summary exports as PDF
- [ ] Admin dashboard loads (if admin user)
- [ ] No console errors in browser DevTools

## Contributing

See `CONTRIBUTING.md` for detailed contribution guidelines.

### Git Workflow
1. Create feature branch from `dev`
2. Make changes, commit with Conventional Commits
3. Run local build validation (see above)
4. Push to GitHub, create PR
5. Wait for CI to pass
6. Request review
7. Merge to `dev` after approval

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**
```
feat(metabolic): add glucose spike detection algorithm
fix(api): handle null values in nutrition lookup
docs(readme): update deployment instructions
```

### Never Commit
- `.env.local` (gitignored)
- API keys or secrets
- PHI (protected health information)
- Large binary files (> 1MB)

## Security & Privacy

- **Non-SaMD**: EverMed is a wellness app, not a medical device. We do not diagnose, dose, or provide treatment recommendations.
- **Encryption**: All data encrypted in transit (TLS) and at rest (AES-256)
- **RLS**: Row-Level Security enforces user-only access to their own data
- **No PHI in Analytics**: AnalyticsEvent table contains only aggregated, anonymized metrics
- **GDPR/HIPAA-ready**: User-controlled export, deletion, and data portability

## Support

For questions or issues:
- **Documentation**: Check `docs/` and `CLAUDE.md`
- **Issues**: Open GitHub issue with reproducible steps
- **Deployment Help**: See `docs/archive/pivot-2025-10-15/STAGING_DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: October 15, 2025
**Product Version**: 2.0 (Glucose Tracking Focus)
**Database Version**: October 2025 pivot (metabolic tables only)
