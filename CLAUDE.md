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

### Share Packs
- Passcode-protected with scrypt hashing (`SHARE_LINK_PEPPER` + passcode)
- 7-day expiry, view logs, one-tap revoke
- Public viewer at `/share/[token]` after passcode verification
- Never exposes full vault, only selected items

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

## Deployment

### Vercel Configuration
- **Build command**: `npm run build` (at root)
- **Output directory**: `apps/web/.next`
- **Install command**: `npm install` (triggers `prisma generate` via postinstall)
- Set all required env vars in Vercel project settings

### Staging/Production
1. Deploy to Vercel with Supabase staging/prod project
2. Apply migrations: `npm run prisma:migrate:deploy`
3. Run smoke test: `./scripts/smoke-e2e.sh --auth`
4. Verify CI "Codex review QA" step passes
5. Monitor Supabase logs and Vercel analytics

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

**If you answered YES to any of the above, you MUST invoke the subagent. NO EXCEPTIONS.**

### Available Subagents (ALWAYS USE WHEN APPLICABLE)

1. **medical-compliance-guardian**
   - **ALWAYS USE FOR**: Any changes to AI outputs, medical data handling, or user-facing medical content
   - **WITHOUT EXCEPTION**: All chat endpoints, explain features, medical disclaimers, refusal templates
   - **WHY CRITICAL**: Ensures non-SaMD compliance, prevents diagnosis/dosing/triage violations
   - **NEVER SKIP**: Even "minor" text changes to medical content require review

2. **database-architect**
   - **ALWAYS USE FOR**: Database schema changes, Prisma migrations, relation modifications, deployment validation
   - **WITHOUT EXCEPTION**: All Prisma schema edits, new tables, foreign key changes, index additions
   - **WHY CRITICAL**: Prevents migration corruption, ensures relation integrity, validates RLS compatibility
   - **NEVER SKIP**: Even single-field additions can have cascading effects

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

7. **vitest-test-writer**
   - **ALWAYS USE FOR**: Adding features or fixing bugs that need test coverage
   - **WITHOUT EXCEPTION**: All new features, bug fixes, performance-critical code, medical safety features
   - **WHY CRITICAL**: Ensures comprehensive test coverage, validates safety requirements, prevents regressions
   - **NEVER SKIP**: Untested code is broken code

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
