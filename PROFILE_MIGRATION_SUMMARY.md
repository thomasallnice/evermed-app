# Profile Health Data Migration - Summary

## Status: ✅ Database Migration Complete | ⏳ Frontend Integration Pending

**Date:** October 9, 2025
**Database:** DEV (wukrnqifpgjwbqxpockm)
**Migration:** `20251009000000_add_health_profile_to_person`

---

## What Was Done

### 1. Schema Design ✅

**Added to Person Model:**
- `heightCm` (Float) - FHIR Observation (vital signs)
- `weightKg` (Float) - FHIR Observation (vital signs)
- `allergies` (String[]) - FHIR AllergyIntolerance
- `diet` (String[]) - FHIR NutritionOrder preferences
- `behaviors` (String[]) - FHIR Observation (smoking, exercise)
- `updatedAt` (DateTime) - Auto-updated timestamp

**Files Modified:**
- `/db/schema.prisma` - Added health profile fields to Person model

**Why This Approach:**
- ✅ Single-table access (no joins) for fast profile loading
- ✅ RLS policies already exist for Person table
- ✅ FHIR-aligned for medical compliance
- ✅ PostgreSQL arrays for diet/allergies/behaviors
- ✅ No time-series complexity (can add later if needed)

### 2. Database Migration ✅

**Created Migration:**
- Location: `/db/migrations/20251009000000_add_health_profile_to_person/migration.sql`
- Applied to: DEV database (wukrnqifpgjwbqxpockm)
- Status: ✅ Successfully applied and marked in `_prisma_migrations`

**SQL Operations:**
```sql
-- Added 6 new columns to Person table
ALTER TABLE "Person" ADD COLUMN "heightCm" DOUBLE PRECISION;
ALTER TABLE "Person" ADD COLUMN "weightKg" DOUBLE PRECISION;
ALTER TABLE "Person" ADD COLUMN "allergies" TEXT[] DEFAULT '{}';
ALTER TABLE "Person" ADD COLUMN "diet" TEXT[] DEFAULT '{}';
ALTER TABLE "Person" ADD COLUMN "behaviors" TEXT[] DEFAULT '{}';
ALTER TABLE "Person" ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Added auto-update trigger for updatedAt
CREATE TRIGGER person_updated_at_trigger BEFORE UPDATE ON "Person"...

-- Added index for performance
CREATE INDEX "Person_updatedAt_idx" ON "Person"("updatedAt");
```

**Prisma Client:**
- ✅ Regenerated with `npm run prisma:generate`
- ✅ New fields available in TypeScript types

### 3. API Implementation ✅

**Created:** `/apps/web/src/app/api/profile/route.ts`

**Endpoints:**

**GET /api/profile**
- Returns user's complete profile (account + health data)
- Calculates BMI from height/weight (not stored)
- Calculates age from birthYear
- RLS enforced via Prisma (ownerId = auth.uid())

**PATCH /api/profile**
- Updates health profile fields
- Validates height (0-300 cm), weight (0-500 kg), birthYear (1900-current)
- Handles array fields (diet, allergies, behaviors)
- Updates auth.user_metadata.name if provided
- Returns recalculated BMI

**Security:**
- ✅ Authentication required (Supabase session)
- ✅ RLS enforced (users can only access their own profile)
- ✅ Input validation on all numeric fields
- ✅ Array fields filtered for safety

### 4. Documentation ✅

**Created:** `/docs/PROFILE_HEALTH_DATA_IMPLEMENTATION.md`

Comprehensive guide including:
- Design rationale (why Option D was chosen)
- FHIR alignment mappings
- Migration details
- API contract specification
- Frontend integration guide
- Testing checklist
- Deployment steps (DEV/Staging/Prod)
- Rollback plan
- Performance analysis
- Security review

---

## What Needs To Be Done Next

### 1. Frontend Integration (REQUIRED)

**File to Update:** `/apps/web/src/app/profile/page.tsx`

**Changes Required:**

1. **Replace data fetching (line 47):**
```typescript
// ❌ OLD - 404 error
const { data: row } = await supabase.from('user_graph').select('profile')...

// ✅ NEW - use API
const response = await fetch('/api/profile')
const profileData = await response.json()
```

2. **Replace save function (line 56-101):**
```typescript
// ❌ OLD - tries to use non-existent tables
await supabase.from('user_graph').upsert(...)
await supabase.from('user_metrics').insert(...)

// ✅ NEW - use API
const response = await fetch('/api/profile', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    heightCm: profile.height_cm,
    weightKg: profile.weight_kg,
    diet: profile.diet,      // Already array
    allergies: profile.allergies,
    behaviors: profile.behaviors
  })
})
```

3. **Remove CSV parsing logic (lines 64-75):**
```typescript
// ❌ REMOVE - API handles arrays directly
if (typeof (normalized as any)._dietCsv === 'string') {
  normalized.diet = (normalized as any)._dietCsv.split(',')...
}

// ✅ NEW - convert CSV input to array before sending
const dietArray = dietCsv.split(',').map(s => s.trim()).filter(Boolean)
body: JSON.stringify({ diet: dietArray })
```

4. **Update state management:**
```typescript
// Profile now matches API response shape
type Profile = {
  id: string
  heightCm?: number
  weightKg?: number
  bmi?: number  // Calculated by API
  diet?: string[]
  allergies?: string[]
  behaviors?: string[]
}
```

**See detailed guide in:** `/docs/PROFILE_HEALTH_DATA_IMPLEMENTATION.md` (Section "Frontend Integration Guide")

### 2. Testing (REQUIRED)

**API Tests:**
- [ ] Test GET /api/profile with authenticated user
- [ ] Test GET /api/profile returns 401 for unauthenticated
- [ ] Test PATCH /api/profile validates height range
- [ ] Test PATCH /api/profile validates weight range
- [ ] Test PATCH /api/profile handles array fields
- [ ] Test RLS prevents cross-user access

**Frontend Tests:**
- [ ] Profile page loads without 404 errors
- [ ] Health profile fields save correctly
- [ ] BMI calculates and displays
- [ ] Array fields (diet, allergies, behaviors) work
- [ ] Error messages display for validation failures

**Create test file:** `/tests/unit/api-profile.spec.ts`

### 3. Staging Deployment (REQUIRED BEFORE PRODUCTION)

**Steps:**
```bash
# 1. Link to staging Supabase
supabase link --project-ref <staging-ref>

# 2. Apply migration
npx prisma db execute --file db/migrations/20251009000000_add_health_profile_to_person/migration.sql --schema db/schema.prisma

# 3. Mark as applied
npx prisma migrate resolve --applied 20251009000000_add_health_profile_to_person --schema db/schema.prisma

# 4. Deploy to Vercel staging
# (Vercel auto-deploys on push to staging branch)

# 5. Run validation
./scripts/validate-staging.js
```

### 4. Production Deployment (AFTER STAGING VALIDATED)

**Steps:**
```bash
# 1. Create backup
# (Supabase auto-backups, but verify)

# 2. Link to production Supabase
supabase link --project-ref <prod-ref>

# 3. Preview migration
supabase db diff

# 4. Apply migration (during low-traffic window)
npx prisma db execute --file db/migrations/20251009000000_add_health_profile_to_person/migration.sql

# 5. Mark as applied
npx prisma migrate resolve --applied 20251009000000_add_health_profile_to_person

# 6. Deploy to Vercel production
# (Merge to main branch)

# 7. Run smoke test
./scripts/smoke-e2e.sh --auth

# 8. Monitor Sentry/logs
```

---

## Key Design Decisions

### 1. Why Enhanced Person Model (vs Separate Table)?
- **Performance**: Profile data accessed frequently - single-table lookup is faster
- **Simplicity**: RLS policies already exist for Person table
- **Medical Safety**: Allergies at top level for quick access during AI chat flows

### 2. Why PostgreSQL Arrays (vs JSON)?
- **Type Safety**: Prisma enforces `String[]` type
- **Indexing**: Can create GIN indexes on arrays if needed
- **Querying**: Can use `@>` operator to find specific allergies
- **FHIR Alignment**: Array structure matches FHIR CodeableConcept patterns

### 3. Why Calculate BMI (vs Store)?
- **Data Consistency**: BMI auto-recalculates when height/weight change
- **No Stale Data**: Always accurate based on current values
- **Minimal CPU Cost**: Simple calculation (weight / (height/100)^2)

### 4. Why No Time-Series Table?
- **MVP Scope**: Profile page only needs current values
- **Complexity**: Time-series adds storage, queries, and UI complexity
- **Future-Proof**: Can add HealthMetric table later without breaking changes

---

## Files Reference

### Created Files ✅
- `/db/migrations/20251009000000_add_health_profile_to_person/migration.sql`
- `/apps/web/src/app/api/profile/route.ts`
- `/docs/PROFILE_HEALTH_DATA_IMPLEMENTATION.md`
- `/PROFILE_MIGRATION_SUMMARY.md` (this file)

### Modified Files ✅
- `/db/schema.prisma` - Added health profile fields to Person model

### Files Needing Updates ⏳
- `/apps/web/src/app/profile/page.tsx` - Replace legacy Supabase calls with API

### Optional Files (Future)
- `/tests/unit/api-profile.spec.ts` - API endpoint tests
- `/tests/e2e/profile-page.spec.ts` - E2E profile page tests

---

## RLS Security

**No new policies required!** Existing Person table policies automatically protect health data:

```sql
-- Already exists in db/policies.sql
CREATE POLICY person_owner_select ON "Person"
  FOR SELECT USING (ownerId = auth.uid());

CREATE POLICY person_owner_mod ON "Person"
  FOR ALL USING (ownerId = auth.uid())
  WITH CHECK (ownerId = auth.uid());
```

**What This Means:**
- ✅ Users can only read their own health profile
- ✅ Users can only update their own health profile
- ✅ Multi-tenant isolation enforced at database level
- ✅ No risk of cross-user data leakage

---

## Quick Start Commands

### Test API Locally
```bash
# Start dev server
npm run dev

# Test GET endpoint (need to be logged in)
curl http://localhost:3000/api/profile

# Test PATCH endpoint
curl -X PATCH http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "heightCm": 175,
    "weightKg": 70,
    "diet": ["vegetarian"],
    "allergies": ["peanuts"],
    "behaviors": ["exercise"]
  }'
```

### Apply Migration to Staging
```bash
supabase link --project-ref <staging-ref>
npx prisma db execute --file db/migrations/20251009000000_add_health_profile_to_person/migration.sql --schema db/schema.prisma
npx prisma migrate resolve --applied 20251009000000_add_health_profile_to_person --schema db/schema.prisma
```

### Rollback (if needed)
```bash
# SQL rollback
npx prisma db execute --file db/migrations/20251009000000_add_health_profile_to_person/rollback.sql --schema db/schema.prisma

# Mark as rolled back
npx prisma migrate resolve --rolled-back 20251009000000_add_health_profile_to_person --schema db/schema.prisma
```

---

## Questions?

**Detailed Documentation:** `/docs/PROFILE_HEALTH_DATA_IMPLEMENTATION.md`

**Schema Reference:** `/db/schema.prisma` (lines 13-34)

**API Reference:** `/apps/web/src/app/api/profile/route.ts`

**Migration SQL:** `/db/migrations/20251009000000_add_health_profile_to_person/migration.sql`

**Frontend Guide:** `/docs/PROFILE_HEALTH_DATA_IMPLEMENTATION.md` (Section "Frontend Integration Guide")

---

## Next Immediate Actions

1. ✅ ~~Create migration~~ DONE
2. ✅ ~~Apply to DEV database~~ DONE
3. ✅ ~~Create API route~~ DONE
4. ⏳ **Update profile page component** (NEXT STEP)
5. ⏳ Test locally
6. ⏳ Deploy to staging
7. ⏳ Validate staging
8. ⏳ Deploy to production

**Ready to proceed with frontend integration!**
