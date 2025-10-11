# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start dev server (auto-cleans .next cache)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Type check
npm run typecheck

# Run unit tests
npm run test

# Run smoke E2E test
./scripts/smoke-e2e.sh

# Clean Next.js cache (run if dev server has issues)
npm run clean:next
```

### Database (Prisma + Supabase)
```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate:dev

# Deploy migrations (staging/prod)
npm run prisma:migrate:deploy

# Format schema
npm run prisma:format

# Seed database
npm run seed
```

### Supabase CLI
```bash
# Link to Supabase project (interactive)
supabase link

# List all projects
supabase projects list

# Diff local schema vs remote
supabase db diff

# Pull remote schema to local
supabase db pull

# Push local migrations to remote
supabase db push

# Reset local database
supabase db reset

# Create database branch for testing
supabase db branch create test-branch

# Deploy edge functions
supabase functions deploy function-name

# List/set secrets
supabase secrets list
supabase secrets set KEY=value

# Generate types from database
supabase gen types typescript --local > types/supabase.ts
```

### Single Test
```bash
# Run specific test file
npx vitest run tests/unit/auth.spec.ts
```

## Architecture

### Monorepo Structure
- **apps/web**: Next.js 14 App Router web app with API routes
- **apps/workers**: OCR/extraction background jobs (Cloud Run)
- **packages/config**: Shared ESLint, Prettier, TSConfig
- **packages/types**, **packages/ui**: Shared types and UI components
- **db**: Prisma schema and migrations (PostgreSQL/Supabase)
- **docs**: Product specs, refit plans, ground truth
- **tests**: Vitest unit tests and fixtures (non-PHI)

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Auth/Storage**: Supabase Auth + Storage
- **AI/ML**: OpenAI (embeddings, chat), pgvector (semantic search)
- **OCR**: External service via `PDF_EXTRACT_URL`

### Key Data Models (db/schema.prisma)
- **Person**: User profiles linked to Supabase auth.uid() via `ownerId`
- **Document**: Uploaded PDFs/images stored in Supabase Storage
- **DocChunk**: Text chunks with pgvector embeddings for RAG
- **ChatMessage**: Chat history, optionally linked to documents
- **Observation**: Extracted medical data (FHIR-aligned codes)
- **SharePack**: Passcode-protected shareable packs with 7-day expiry
- **TokenUsage**, **AnalyticsEvent**: Non-PHI telemetry

### API Routes Pattern
All API routes in `apps/web/src/app/api/`:
- Authentication via `x-user-id` header (dev) or Supabase session (prod)
- RLS enforced at database level via Supabase policies
- JSON responses with proper error handling
- Key routes: `/api/uploads`, `/api/chat`, `/api/explain`, `/api/share-packs`, `/api/documents/:id`

### RAG Architecture
1. Documents uploaded → stored in Supabase Storage
2. OCR via external service (`/api/ocr`)
3. Text chunked → stored in `DocChunk` with pgvector embeddings
4. Chat queries → semantic search via pgvector → LLM with citations
5. Implementation in `apps/web/src/lib/rag.ts`

### Authentication Flow
- Supabase Auth for signup/login
- Session management via `@supabase/ssr`
- Onboarding wizard creates Person record
- RLS policies enforce row-level security (Person.ownerId = auth.uid())

## Chrome DevTools MCP Integration

**Project uses chrome-devtools-mcp from:** https://github.com/ChromeDevTools/chrome-devtools-mcp

**Configuration:** Add to MCP config with isolated + headless mode:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]
    }
  }
}
```

**Available Chrome DevTools MCP Tools (26 total):**

### Input Automation (7 tools)
- `click` — Click on elements
- `drag` — Drag elements
- `fill` — Fill input fields
- `fill_form` — Fill out entire forms
- `handle_dialog` — Manage browser dialogs
- `hover` — Hover over elements
- `upload_file` — Upload files

### Navigation Automation (7 tools)
- `close_page` — Close browser pages
- `list_pages` — List open browser pages
- `navigate_page` — Navigate to web pages
- `navigate_page_history` — Navigate browser history
- `new_page` — Open a new browser page
- `select_page` — Switch between browser pages
- `wait_for` — Wait for specific conditions

### Emulation (3 tools)
- `emulate_cpu` — Simulate CPU performance
- `emulate_network` — Simulate network conditions
- `resize_page` — Change browser viewport size

### Performance (3 tools)
- `performance_analyze_insight` — Analyze performance traces
- `performance_start_trace` — Start performance tracing
- `performance_stop_trace` — Stop performance tracing

### Network (2 tools)
- `get_network_request` — Retrieve specific network requests
- `list_network_requests` — List all network requests

### Debugging (4 tools)
- `evaluate_script` — Run JavaScript in browser context
- `list_console_messages` — Retrieve browser console logs
- `take_screenshot` — Capture browser screenshots
- `take_snapshot` — Create browser state snapshots

**When to use:**
- After making frontend changes, use `performance_start_trace` + `performance_analyze_insight`
- When investigating bugs, use `list_console_messages` and `list_network_requests`
- Before committing UI changes, take screenshots with `take_screenshot`
- To validate PRD NFR requirements (p95 < 10s), use performance tracing tools
- When debugging API calls, check `list_network_requests`
- For automated testing, use input automation tools (click, fill, fill_form)

**Example workflow:**
```typescript
// 1. Start dev server first
// npm run dev

// 2. Open browser to app
mcp__chrome_devtools__navigate_page({ url: 'http://localhost:3000' });

// 3. Capture current state
mcp__chrome_devtools__take_screenshot({ path: 'baseline.png' });

// 4. Start performance trace
mcp__chrome_devtools__performance_start_trace();

// 5. Perform user interactions
mcp__chrome_devtools__click({ selector: '#upload-button' });
mcp__chrome_devtools__fill({ selector: '#file-input', value: 'test.pdf' });

// 6. Stop trace and analyze
mcp__chrome_devtools__performance_stop_trace();
const insights = mcp__chrome_devtools__performance_analyze_insight();

// 7. Check for errors
const consoleMessages = mcp__chrome_devtools__list_console_messages();

// 8. Verify API calls
const networkRequests = mcp__chrome_devtools__list_network_requests();
```

**Subagent Integration:**
See specific Chrome DevTools requirements in each subagent's description below (pr-validation-orchestrator, vitest-test-writer, nextjs-ui-builder).

### Share Packs
- Passcode-protected with scrypt hashing (`SHARE_LINK_PEPPER` + passcode)
- 7-day expiry, view logs, one-tap revoke
- Public viewer at `/share/[token]` after passcode verification
- Never exposes full vault, only selected items

## Memory & SOPs System

**Memory Files** (persistent context across sessions):
- **Project State:** `.claude/memory/project-state.md` (current phase, completion status)
- **Recent Changes:** `.claude/memory/recent-changes.md` (last 3-5 major changes)
- **Active Issues:** `.claude/memory/active-issues.md` (known bugs, blockers, tech debt)

**Standard Operating Procedures** (how to do common tasks):
- **Database Changes:** `.claude/sops/database-changes.md`
- **API Endpoints:** `.claude/sops/api-endpoints.md`
- **Testing:** `.claude/sops/testing.md`
- **Deployment:** `.claude/sops/deployment.md`

### 🤖 Automatic Memory & SOP Maintenance (MANDATORY)

**You MUST proactively update these files without being asked:**

**After completing ANY significant work (features, fixes, refactors):**
1. ✅ Update `.claude/memory/recent-changes.md` - Add entry at the top with date and what was done
2. ✅ Update `.claude/memory/project-state.md` - Update completion status, current phase, next steps
3. ✅ Update `.claude/memory/active-issues.md` - Add new issues found, remove resolved ones

**When you encounter a repeated mistake or learn a better pattern:**
1. ✅ Create or update relevant SOP in `.claude/sops/`
2. ✅ Document the mistake, why it happened, and the correct approach
3. ✅ Add to the "Common Mistakes to Avoid" section

**When discovering new issues or tech debt:**
1. ✅ Add to `.claude/memory/active-issues.md` immediately
2. ✅ Categorize by severity (Blocker, Critical, Medium, Low)
3. ✅ Include reproduction steps and potential fixes

**When issues are resolved:**
1. ✅ Move from "Active Issues" to "Resolved Recently" in `.claude/memory/active-issues.md`
2. ✅ Document the fix in `.claude/memory/recent-changes.md`

**Triggers for memory updates:**
- ✅ Feature completed
- ✅ Migration run
- ✅ API endpoint added
- ✅ Bug fixed
- ✅ Phase/milestone completed
- ✅ Deployment completed
- ✅ Major refactor completed

**This is NOT optional. Update these files as part of completing your work, not as a separate task.**

## Development Practices

### Dependency Management
- `openai` package is hoisted at root level for workspace consistency
- Always run `npm install` from repository root, never inside workspaces
- Run `npm run clean:next` before linting if cached artifacts cause issues

### Guard Files (Never Delete)
- `docs/CODEX_START_PROMPT.txt`
- `scripts/smoke-e2e.sh`
- `docs/BOOTSTRAP_PROMPT.md`
- `AGENTS.md`

### Ground Truth Documentation
Always consult these before making architectural changes:
- `docs/CODEX_REFIT_PLAN.md`: Complete architecture and migration plan
- `docs/project-description.md`: Product requirements
- `docs/BOOTSTRAP_PROMPT.md`: Initial setup instructions
- `AGENTS.md`: Agent-specific instructions
- `docs/refit/PR*_NOTES.md`: Per-PR migration notes

### Medical Safety Guardrails (Non-SaMD)
- **No diagnosis, dosing, triage, or emergency advice**
- **No automated image classification/grading**
- All AI outputs must include **provenance** (citations with sourceAnchor)
- Refusal templates in `apps/web/src/lib/copy.ts`
- Germany/EU first; FHIR/gematik alignment

### Testing Requirements
- Unit tests: API contracts, auth, RLS, passcode hashing
- E2E: Upload → Explain → Pack → Share → Revoke flow
- Smoke script validates full stack integration
- All tests must pass before merge
- DB-dependent tests skip gracefully if `SUPABASE_DB_URL` not set

### Code Review Process
- Complete `CODE_REVIEW.md` checklist before requesting review
- CI includes "Codex review QA" step (lint → typecheck → tests → smoke)
  - Note: This was originally for Codex (OpenAI GPT), but Claude Code now handles development
- All tests, lint, typecheck, and smoke tests must pass before PR merge

### Environment Variables
See `.env.example` and README. Key vars:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`, `EMBEDDINGS_MODEL`
- `PDF_EXTRACT_URL`, `PDF_EXTRACT_BEARER`
- `SHARE_LINK_PEPPER` (for passcode hashing)
- `DATABASE_URL` (Prisma connection)

### Troubleshooting
- Missing static chunks → `npm run clean:next && npm ci && npm run dev`
- Upload RLS errors → re-apply `db/policies.sql` policies
- OpenAI errors → verify `OPENAI_API_KEY` is set
- OCR blank text → check `PDF_EXTRACT_URL` / `PDF_EXTRACT_BEARER`
- Prisma relation errors → ensure both sides defined, rerun `prisma generate`

### Schema Change Workflow (MANDATORY)

**⚠️ CRITICAL**: The #1 cause of production incidents is schema drift. Follow this workflow EXACTLY.

**Before EVERY Push:**
```bash
./scripts/pre-push-checks.sh
```

This script runs automatically via Husky pre-push hook and validates:
- ✅ TypeScript type check passes
- ✅ ESLint passes
- ✅ Build succeeds
- ✅ No uncommitted migrations

**The Correct Workflow for Schema Changes:**

1. **Modify Prisma schema** (`db/schema.prisma`)
2. **Create migration**: `npm run prisma:migrate:dev --name descriptive_name`
3. **Verify migration SQL** matches your intent
4. **Generate Prisma Client**: `npm run prisma:generate`
5. **Write code** using new types
6. **Run full build**: `npm run build` (catches type errors locally)
7. **Test locally**: Verify functionality works
8. **Commit migration + code together** (never separately!)
9. **Push to GitHub** (pre-push hook validates automatically)
10. **Deploy migration to staging FIRST**: `./scripts/deploy-staging.sh`
11. **Deploy code to Vercel staging** (build will succeed because DB has new schema)
12. **Verify staging works** (smoke test critical flows)
13. **Deploy migration to production**: `./scripts/deploy-production.sh`
14. **Deploy code to Vercel production** (merge to main)

**❌ NEVER DO THIS:**

- Modify Prisma schema after creating migration (creates permanent drift)
- Push code without applying migrations to staging/prod (causes infinite build failures)
- Skip local build testing (`npm run build` is required before push)
- Use Vercel as your "type checker" (slow feedback, wastes build minutes)
- Commit migration and code separately (breaks atomic change principle)

**Why This Workflow Exists:**

The schema synchronization crisis of October 2025 was caused by:
1. Schema changed locally → Prisma types generated from LOCAL db
2. Code written against new types → Works locally ✅
3. Push to GitHub → Vercel builds
4. Vercel runs `prisma generate` → Types generated from STAGING/PROD db (OLD schema) ❌
5. Build fails → Types don't match code
6. Fix symptom → Push again → NEW error
7. **REPEAT INFINITELY** 🔄

**Documentation:**
- Complete workflow: `docs/DEVELOPER_WORKFLOW.md`
- Database SOP: `.claude/sops/database-changes.md`
- Deployment SOP: `.claude/sops/deployment.md`
- GitHub config: `docs/GITHUB_CONFIGURATION.md`

## Deployment

### Vercel Configuration
- **Build command**: `npm run build` (at root)
- **Output directory**: `apps/web/.next`
- **Install command**: `npm install` (triggers `prisma generate` via postinstall)
- Set all required env vars in Vercel project settings

### Staging/Production
1. **Link to target environment**:
   ```bash
   supabase link --project-ref <staging-or-prod-ref>
   ```

2. **Preview and apply migrations**:
   ```bash
   # Preview changes
   supabase db diff

   # Option A: Prisma migrations (for schema-only changes)
   npm run prisma:migrate:deploy

   # Option B: Supabase push (when RLS policies, triggers, or functions are involved)
   supabase db push
   ```

3. **Deploy edge functions** (if applicable):
   ```bash
   supabase functions deploy <function-name>
   ```

4. **Sync environment secrets**:
   ```bash
   supabase secrets set KEY=value
   ```

5. **Deploy to Vercel** with Supabase staging/prod project

6. **Run smoke test**: `./scripts/smoke-e2e.sh --auth`

7. **Verify CI** "Codex review QA" step passes

8. **Monitor** Supabase logs and Vercel analytics

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):
1. Install dependencies
2. Clean Next cache
3. Generate Prisma client
4. Apply migrations (if `SUPABASE_DB_URL` set)
5. Lint, typecheck, unit tests
6. Build monorepo
7. Codex review QA step

All steps must pass before merge to main.

## Claude Code Subagents - MANDATORY USAGE

⚠️ **CRITICAL WARNING**: Subagent usage is MANDATORY, NOT OPTIONAL. ⚠️

**BEFORE STARTING ANY TECHNICAL WORK, YOU MUST:**
1. Check the task type against the subagent list below
2. If a subagent matches, STOP and invoke it IMMEDIATELY
3. NEVER proceed with manual implementation when a subagent exists
4. Subagents have specialized validation, security checks, and domain knowledge that CANNOT be replicated manually

### Why This Is Absolute

**Historical failures from NOT using subagents:**
- Deployment validation skipped → missed critical migration issues and security gaps
- Manual RLS policy writing → incomplete policies, security vulnerabilities
- API changes without validation → contract deviations, broken integrations
- Database changes without architect review → orphaned migrations, index performance issues

**Consequences of skipping subagents:**
- ❌ Security vulnerabilities in production
- ❌ Data integrity violations
- ❌ Performance degradation
- ❌ Failed deployments
- ❌ Incomplete test coverage
- ❌ Non-compliant medical content

### Pre-Action Checklist (READ THIS BEFORE EVERY TASK)

Before implementing ANY technical change, ask yourself:

- [ ] Am I modifying database schema or migrations? → **STOP** → Use `database-architect`
- [ ] Am I creating/changing API routes? → **STOP** → Use `api-contract-validator`
- [ ] Am I working with AI/medical content? → **STOP** → Use `medical-compliance-guardian`
- [ ] Am I implementing RAG/embeddings/search? → **STOP** → Use `rag-pipeline-manager`
- [ ] Am I modifying RLS policies or storage security? → **STOP** → Use `supabase-rls-security`
- [ ] Am I building UI components or flows? → **STOP** → Use `nextjs-ui-builder`
- [ ] Am I writing tests? → **STOP** → Use `vitest-test-writer`
- [ ] Am I preparing a pull request? → **STOP** → Use `pr-validation-orchestrator`
- [ ] Am I implementing ML models or prediction systems? → **STOP** → Use `ml-pipeline-architect`
- [ ] Am I integrating external APIs (Google Vision, Nutritionix, CGM)? → **STOP** → Use `external-api-integrator`
- [ ] Am I building analytics, dashboards, or correlation algorithms? → **STOP** → Use `analytics-architect`

**If you answered YES to any of the above, you MUST invoke the subagent. NO EXCEPTIONS.**

### Available Subagents (ALWAYS USE WHEN APPLICABLE)

1. **medical-compliance-guardian**
   - **ALWAYS USE FOR**: Any changes to AI outputs, medical data handling, or user-facing medical content
   - **WITHOUT EXCEPTION**: All chat endpoints, explain features, medical disclaimers, refusal templates
   - **WHY CRITICAL**: Ensures non-SaMD compliance, prevents diagnosis/dosing/triage violations
   - **NEVER SKIP**: Even "minor" text changes to medical content require review

2. **database-architect**
   - **ALWAYS USE FOR**: Database schema changes, Prisma migrations, relation modifications, deployment validation, Supabase infrastructure setup
   - **WITHOUT EXCEPTION**: All Prisma schema edits, new tables, foreign key changes, index additions, Supabase CLI operations
   - **WHY CRITICAL**: Prevents migration corruption, ensures relation integrity, validates RLS compatibility, manages Supabase infrastructure
   - **NEVER SKIP**: Even single-field additions can have cascading effects
   - **SUPABASE CLI CAPABILITIES**:
     - Project linking and environment management (`supabase link`, `supabase projects list`)
     - Database migrations and deployments (`supabase db push`, `supabase db diff`, `supabase db reset`)
     - Schema introspection and validation (`supabase db pull`)
     - Function and trigger management (`supabase functions deploy`)
     - Edge Functions deployment (`supabase functions new`, `supabase functions serve`)
     - Storage bucket creation and policy management
     - Environment variable synchronization (`supabase secrets set/list`)
     - Branch database creation for testing (`supabase db branch create`)
   - **DEPLOYMENT WORKFLOWS**:
     - Always validate migrations locally before deploying to staging/production
     - Use `supabase db diff` to preview schema changes before applying
     - Leverage `supabase db branch` for testing destructive migrations
     - Sync RLS policies via CLI rather than manual SQL when possible
     - Use `supabase db push` for deployment instead of direct Prisma migrate deploy when RLS/triggers are involved

3. **rag-pipeline-manager**
   - **ALWAYS USE FOR**: RAG pipeline changes, embedding logic, semantic search modifications, chunking strategies
   - **WITHOUT EXCEPTION**: All changes to OCR ingestion, text chunking, pgvector queries, citation tracking
   - **WHY CRITICAL**: Maintains retrieval accuracy, ensures proper citation flow, optimizes search performance
   - **NEVER SKIP**: RAG is core functionality; manual changes will degrade quality

4. **supabase-rls-security**
   - **ALWAYS USE FOR**: RLS policy changes, storage security, multi-tenant isolation, deployment security setup
   - **WITHOUT EXCEPTION**: All policy additions, storage bucket configs, security reviews before deployment
   - **WHY CRITICAL**: Prevents data leakage between users, enforces authorization, secures file uploads
   - **NEVER SKIP**: Security vulnerabilities are unacceptable in medical apps

5. **api-contract-validator**
   - **ALWAYS USE FOR**: Adding/modifying API routes, changing request/response shapes, auth modifications
   - **WITHOUT EXCEPTION**: All new endpoints, route changes, API contract updates, before merging API work
   - **WHY CRITICAL**: Ensures API consistency, validates against spec, prevents breaking changes
   - **NEVER SKIP**: Contract violations break frontend integration

6. **pr-validation-orchestrator**
   - **ALWAYS USE FOR**: Before creating ANY pull request
   - **WITHOUT EXCEPTION**: Every single PR, no matter how small
   - **WHY CRITICAL**: Validates CODE_REVIEW.md checklist, runs full CI, ensures merge readiness
   - **NEVER SKIP**: Incomplete PRs waste review time and delay shipping
   - **CHROME DEVTOOLS MCP INTEGRATION**: See "Chrome DevTools MCP Integration" section above for complete tool reference. For PR validation:
     - MUST run performance traces on key user flows (BLOCK PR if p95 > 10s)
     - MUST capture screenshots for UI change validation
     - MUST check console errors across all modified pages (BLOCK PR if errors found)
     - MUST validate API contracts with network request inspection
     - MUST run accessibility audits for WCAG 2.1 AA compliance

7. **vitest-test-writer**
   - **ALWAYS USE FOR**: Adding features or fixing bugs that need test coverage
   - **WITHOUT EXCEPTION**: All new features, bug fixes, performance-critical code, medical safety features
   - **WHY CRITICAL**: Ensures comprehensive test coverage, validates safety requirements, prevents regressions
   - **NEVER SKIP**: Untested code is broken code
   - **CHROME DEVTOOLS MCP INTEGRATION**: See "Chrome DevTools MCP Integration" section above for complete tool reference. For test writing:
     - MUST use input automation tools for E2E test automation
     - MUST capture screenshots for visual regression testing (store in `tests/screenshots/`)
     - MUST assert zero console errors in all E2E tests
     - MUST validate network requests for API contract testing
     - MUST include performance assertions (p95 < 10s)

8. **nextjs-ui-builder**
   - **ALWAYS USE FOR**: UI components, styling, UX flows, frontend development, onboarding flows
   - **WITHOUT EXCEPTION**: All React components, Tailwind styling, responsive design, accessibility work
   - **WHY CRITICAL**: Ensures design consistency, accessibility compliance, proper medical data visualization
   - **NEVER SKIP**: Manual UI work often misses accessibility and responsive requirements
   - **DESIGN PRINCIPLES**:
     - Light, modern, and professional aesthetic
     - Visually appealing with attention to spacing, typography, and color harmony
     - Engaging and fun to use - make the app delightful, not clinical
     - Use subtle animations, smooth transitions, and micro-interactions
     - Balance professionalism with approachability
     - Medical app should feel trustworthy but not intimidating
   - **COLOR SYSTEM** (Google Material Design Inspired):
     - **Primary Blue**: Blue-600 (#2563eb) - Use ONLY for primary CTAs and key interactive elements
       - Upload buttons, Open buttons, primary form submissions
       - Active state indicators (e.g., active view toggle)
       - Page header icons and branding
       - **DO NOT OVERUSE** - blue should be reserved for the most important actions
     - **Gray for Secondary Actions**: Use gray (gray-100, gray-200, gray-700) for secondary buttons
       - Edit/Add buttons: `bg-gray-100 text-gray-700 hover:bg-gray-200`
       - Cancel buttons: `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`
       - AI Suggest buttons: `border border-gray-300 text-gray-700 hover:bg-gray-50`
       - Inactive view toggles: `bg-white text-gray-700 border border-gray-300`
     - **Colorful Topic Badges** (Gmail-style labels):
       - Labs: `bg-blue-100 text-blue-700 border-blue-200`
       - Imaging: `bg-purple-100 text-purple-700 border-purple-200`
       - Medications: `bg-orange-100 text-orange-700 border-orange-200`
       - Immunizations: `bg-green-100 text-green-700 border-green-200`
       - Consultations: `bg-pink-100 text-pink-700 border-pink-200`
       - Insurance: `bg-indigo-100 text-indigo-700 border-indigo-200`
       - Other: `bg-gray-100 text-gray-700 border-gray-200`
       - All badges should use `rounded-full` for pill shape
     - **Success States**: Green (green-600, green-50 for backgrounds)
     - **Warnings**: Amber (amber-500, amber-50 for backgrounds)
     - **Errors**: Red (red-600, red-50 for backgrounds)
     - **Destructive Actions**: Gray with red on hover (e.g., `text-gray-600 hover:text-red-600 hover:bg-gray-100`)
     - **Backgrounds**:
       - Page background: `bg-gray-50` (light gray to make white cards pop)
       - Cards: `bg-white` with shadows for elevation
       - Input fields: `bg-white` with gray borders
     - **NO TEAL/GREENISH**: Removed from design system to avoid color overload
   - **MATERIAL DESIGN GUIDELINES**:
     - **Elevation & Shadows**: Use Material elevation to create depth
       - Cards: `shadow-md` with `hover:shadow-lg` for hover states
       - Buttons: `shadow-md` for primary actions
       - Modals/Dropdowns: `shadow-lg` for floating elements
       - Use smooth `transition-all duration-200` for shadow changes
     - **Rounded Corners**: Material 3 style with generous rounding
       - Cards: `rounded-2xl` for main content cards
       - Buttons: `rounded-lg` for all buttons
       - Inputs: `rounded-lg` for form fields
       - Badges: `rounded-full` for pill-shaped labels
     - **Typography**: Bold and clear hierarchy
       - Page titles: `text-3xl font-bold`
       - Card titles: `text-xl font-semibold`
       - Section headers: `text-lg font-semibold`
       - Button text: `font-semibold`
       - Body text: `text-base` or `text-sm`
       - Labels: `text-xs font-medium uppercase tracking-wide`
     - **Spacing**: Generous white space
       - Card padding: `p-5` or `p-6`
       - Grid gaps: `gap-6` for card grids
       - Section spacing: `space-y-6` or `space-y-8`
       - Button padding: `px-4 py-2` or `px-4 py-2.5`
     - **Interactive Elements**:
       - All buttons must have hover states
       - Focus states: `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
       - Smooth transitions: `transition-all` or `transition-colors`
       - Disabled states: `disabled:opacity-50 disabled:cursor-not-allowed`
     - **NO GLOBAL BUTTON STYLES**: Never use global `button { }` CSS that overrides inline classes
       - All button styles must be explicit classes or inline Tailwind
       - This prevents unwanted blue gradients on all buttons
   - **CHROME DEVTOOLS MCP INTEGRATION**: See "Chrome DevTools MCP Integration" section above for complete tool reference. For UI building:
     - MUST capture screenshots after UI changes
     - MUST validate zero console errors before committing
     - MUST test responsive design across all breakpoints
     - MUST run performance traces for interactive components (target: <100ms)

9. **deployment-validator**
   - **ALWAYS USE FOR**: Validating deployed applications after deployment completes
   - **WITHOUT EXCEPTION**: After Vercel/staging/production deployment, after infrastructure fixes, after database migrations deploy, before promoting staging to production
   - **WHY CRITICAL**: Automates comprehensive post-deployment testing, catches deployment-specific issues, validates critical blockers are resolved
   - **NEVER SKIP**: Manual testing misses edge cases and deployment-specific errors
   - **CHROME DEVTOOLS MCP INTEGRATION**: See "Chrome DevTools MCP Integration" section above for complete tool reference. For deployment validation:
     - Navigate to all critical pages and capture verification screenshots
     - BLOCK deployment if console errors detected
     - Validate performance (p95 < 10s) and mobile responsiveness
     - Verify API health (no 500 errors, no broken endpoints)
     - Confirm DATABASE_URL and storage bucket configuration
     - Return summary report with pass/fail verdict

10. **ml-pipeline-architect**
   - **ALWAYS USE FOR**: Implementing machine learning pipelines, model training workflows, prediction systems, data preprocessing for ML features
   - **WITHOUT EXCEPTION**: All glucose prediction models (LSTM, transformers), personalized ML models per user, model training pipelines, batch prediction systems, ML inference optimization, model versioning/A/B testing, model retraining workflows
   - **WHY CRITICAL**: Ensures production-ready ML systems with proper medical safety guardrails, privacy-preserving per-user isolation, graceful degradation, and non-SaMD compliance
   - **NEVER SKIP**: ML features require specialized expertise in model training, inference optimization, medical data safety, and RLS enforcement
   - **KEY RESPONSIBILITIES**:
     - Design data preprocessing and feature engineering pipelines
     - Implement per-user model training with RLS enforcement
     - Optimize inference performance (target: p95 < 2s for predictions)
     - Handle model versioning, A/B testing, and retraining triggers
     - Ensure medical safety: predictions are informational only, never diagnosis/dosing/triage
     - Store model artifacts in Supabase Storage with proper RLS policies
     - Provide provenance: track which observations influenced predictions
     - Include medical disclaimers from `lib/copy.ts` refusal templates
   - **INTEGRATION WITH OTHER AGENTS**:
     - MUST invoke `database-architect` for MLModel schema and migrations
     - MUST invoke `supabase-rls-security` for model storage security
     - MUST invoke `medical-compliance-guardian` for prediction disclaimers
     - MUST invoke `api-contract-validator` for prediction endpoint contracts
     - MUST invoke `vitest-test-writer` for comprehensive ML test coverage

11. **external-api-integrator**
   - **ALWAYS USE FOR**: Integrating third-party APIs, managing API keys, implementing retry logic, handling rate limits, building service wrappers
   - **WITHOUT EXCEPTION**: All Google Cloud Vision API integrations (food recognition), Nutritionix API (nutrition database), CGM provider APIs (Dexcom, FreeStyle Libre), API client wrappers with error handling, rate limiting and backoff strategies, API key rotation and secrets management, external API testing and mocking
   - **WHY CRITICAL**: Ensures resilient, secure, performant external integrations with proper error handling, rate limiting, secrets management, and observability
   - **NEVER SKIP**: External API failures can cascade through the system; proper retry logic, circuit breakers, and graceful degradation are essential
   - **KEY RESPONSIBILITIES**:
     - Create dedicated service modules in `apps/web/src/lib/services/`
     - Implement TypeScript interfaces for all request/response shapes
     - Use environment variables for API keys (never hardcode)
     - Implement exponential backoff with jitter for retries (3-5 attempts)
     - Configure client-side rate limiting (use Bottleneck or p-limit)
     - Handle 429 (rate limit), 500-504 (server errors), network timeouts
     - Create mock implementations for all APIs in `tests/mocks/`
     - Enable easy testing with environment flags (`USE_MOCK_APIS=true`)
     - Sanitize logs: never log API keys, tokens, or sensitive user data
     - Validate environment variables at startup (fail fast if missing)
   - **CHROME DEVTOOLS MCP INTEGRATION**: See "Chrome DevTools MCP Integration" section above for complete tool reference. For API integration:
     - Validate external API calls during E2E tests
     - Test retry logic by simulating network failures
     - Verify rate limit handling and graceful error handling
     - Ensure no API keys or sensitive data leak in logs
   - **SPECIFIC API GUIDELINES**:
     - **Google Cloud Vision**: Label detection for food, safe search filtering, resize images before sending
     - **Nutritionix**: Natural language food parsing, cache common lookups, handle quota limits
     - **CGM Providers**: OAuth 2.0 flows, refresh token management, incremental data sync, webhook support

12. **analytics-architect**
   - **ALWAYS USE FOR**: Designing analytics systems, building dashboards, implementing metrics tracking, creating reporting features
   - **WITHOUT EXCEPTION**: All metabolic insights algorithms (glucose-meal correlation), timeline visualization queries, pattern detection (glucose spikes, trends), dashboard aggregations (daily summaries, weekly reports), analytics event tracking (non-PHI telemetry), admin dashboards for monitoring, data export features (CSV, PDF reports), optimizing complex analytical queries
   - **WHY CRITICAL**: Ensures privacy-first analytics (no PHI exposure), performance-optimized queries (p95 < 2s for dashboard loads), medically accurate insights, and user-centric visualizations
   - **NEVER SKIP**: Analytics queries can expose PHI if not properly designed; must validate privacy compliance and RLS enforcement
   - **KEY RESPONSIBILITIES**:
     - Design database-level aggregations (use Prisma `groupBy`, `aggregate`, `count`)
     - Implement time-series analysis (glucose trends, moving averages, pattern detection)
     - Create non-PHI telemetry schemas (AnalyticsEvent: feature usage, performance metrics)
     - Optimize queries with proper indexes (`ownerId`, `date`, `code` on Observation table)
     - Design dashboard visualizations (Recharts/Tremor: line charts, bar charts, stat cards)
     - Implement caching strategies (Next.js `revalidate` or Redis with appropriate TTLs)
     - Ensure RLS enforcement: all queries filter by `ownerId = auth.uid()`
     - Define medically accurate thresholds (glucose spikes >180 mg/dL, meal correlation windows)
     - Include medical disclaimers for all health-related insights
   - **CHROME DEVTOOLS MCP INTEGRATION**: See "Chrome DevTools MCP Integration" section above for complete tool reference. For analytics:
     - Validate dashboard load times (target: p95 < 2s)
     - Capture dashboard visualizations for documentation
     - Verify API endpoint performance and response sizes
     - Ensure zero errors in chart rendering
     - Test responsive design for mobile charts
   - **PRIVACY VALIDATION**:
     - AnalyticsEvent must NEVER contain: userId, patient names, raw medical values, identifiable data
     - Use aggregated metrics only in admin dashboards (counts, averages, percentiles)
     - Implement anonymization for debugging (hashed identifiers only)
   - **INTEGRATION WITH OTHER AGENTS**:
     - Consult `database-architect` for schema changes, index additions, migration design
     - Invoke `medical-compliance-guardian` to validate insights comply with non-SaMD requirements
     - Invoke `api-contract-validator` to ensure analytics API endpoints match spec
     - Invoke `vitest-test-writer` for query correctness, privacy compliance, edge case testing
     - Collaborate with `nextjs-ui-builder` for dashboard layout and chart selection

### How to Invoke Subagents

**IMMEDIATELY invoke the Task tool when a subagent is required:**

```typescript
// Example: Validate API endpoint
Task({
  subagent_type: "api-contract-validator",
  description: "Validate new upload endpoint",
  prompt: "Validate POST /api/uploads against CODEX_REFIT_PLAN.md spec. Check request/response shapes, auth, and flag deviations."
})

// Example: Review medical safety
Task({
  subagent_type: "medical-compliance-guardian",
  description: "Review chat endpoint safety",
  prompt: "Review /api/chat for non-SaMD compliance, citation requirements, and proper refusal templates."
})

// Example: Before deployment
Task({
  subagent_type: "database-architect",
  description: "Validate deployment readiness",
  prompt: "Review all migrations for production deployment. Validate schema integrity, indexes, and relation configurations."
})

// Example: Before creating PR
Task({
  subagent_type: "pr-validation-orchestrator",
  description: "Validate PR readiness",
  prompt: "Run through CODE_REVIEW.md checklist and generate PR template for the auth/onboarding feature."
})
```

### Enforcement Rules (READ CAREFULLY)

**ABSOLUTE REQUIREMENTS:**

1. **NEVER proceed with manual implementation when a subagent exists**
   - If you catch yourself writing code for a task covered by a subagent, STOP IMMEDIATELY
   - Delete your work and invoke the subagent instead

2. **INVOKE SUBAGENTS BEFORE starting work, not after**
   - Don't implement first and validate later
   - Subagents guide implementation, not just review it

3. **MULTIPLE subagents may be required for complex tasks**
   - Example: New medical feature → `medical-compliance-guardian` + `vitest-test-writer` + `api-contract-validator`
   - Invoke all relevant subagents, even if it seems redundant

4. **DEPLOYMENT requires multiple mandatory subagents**
   - `database-architect` → validate migration integrity
   - `supabase-rls-security` → ensure security policies
   - Both are NON-NEGOTIABLE before any production deployment

5. **NO EXCEPTIONS for "small changes"**
   - Adding a single table column → `database-architect`
   - Changing one word in medical disclaimer → `medical-compliance-guardian`
   - Small changes have large consequences

**REMEMBER**: Proceeding without required subagents is a critical project violation. When in doubt, invoke the subagent. Over-invoking is acceptable; under-invoking is not.
