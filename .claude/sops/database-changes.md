# SOP: Database Schema Changes

**Version:** 1.0
**Last Updated:** 2025-10-08

---

## When to Use This SOP
- Adding/modifying tables, columns, or relations in Prisma schema
- Creating database migrations
- Deploying schema changes to staging/production
- Managing RLS policies or database triggers

---

## ⚠️ MANDATORY: Use database-architect Subagent

**NEVER make database changes manually. ALWAYS use the database-architect subagent.**

```typescript
Task({
  subagent_type: "database-architect",
  description: "Add user preferences table",
  prompt: "Add a new UserPreferences table with foreign key to Person. Include fields for theme, language, and notifications. Create migration and validate RLS compatibility."
})
```

---

## Standard Workflow

### 1. Plan the Change
**Before touching code:**
- [ ] Document what tables/columns need to change
- [ ] Identify foreign key relationships
- [ ] Consider RLS policy implications
- [ ] Check for existing migrations that might conflict

### 2. Update Prisma Schema
**File:** `db/schema.prisma`

**Example:**
```prisma
model UserPreferences {
  id        String   @id @default(uuid())
  personId  String
  theme     String   @default("light")
  language  String   @default("en")
  notifications Boolean @default(true)

  person    Person   @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@unique([personId])
}
```

**Checklist:**
- [ ] Both sides of relations defined
- [ ] Cascade behavior specified (`onDelete: Cascade`)
- [ ] Indexes on foreign keys
- [ ] Unique constraints where needed
- [ ] Default values for required fields

### 3. Create Migration

**Command:**
```bash
npm run prisma:migrate:dev
```

**This will:**
1. Prompt for migration name (use descriptive names: `add_user_preferences_table`)
2. Generate SQL migration file in `db/migrations/`
3. Apply migration to local database
4. Update Prisma Client

**Checklist:**
- [ ] Migration name is descriptive
- [ ] Review generated SQL before confirming
- [ ] Test migration on local database
- [ ] Verify Prisma Client regenerates correctly

### 4. Validate the Change

**Run these commands:**
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Type check
npm run typecheck

# Build
npm run build

# Run tests
npm run test
```

**Checklist:**
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] No new linting errors
- [ ] Build succeeds

### 5. Update RLS Policies (if needed)

**If adding new tables or changing access patterns:**

**Use Supabase CLI to preview changes:**
```bash
# Link to dev environment
supabase link --project-ref wukrnqifpgjwbqxpockm

# Check current policies
supabase db diff
```

**Apply RLS policies:**
1. Go to Supabase Dashboard → SQL Editor
2. Apply policies (see `db/policies.sql` for templates)

**OR use database-architect subagent for RLS policy generation.**

### 6. Test Locally

**Checklist:**
- [ ] Create test data
- [ ] Verify CRUD operations work
- [ ] Test cascade deletions
- [ ] Verify RLS policies enforce correct access
- [ ] Test edge cases (null values, duplicates, etc.)

### 7. Deploy to Staging

**Workflow:**
```bash
# Link to staging environment
supabase link --project-ref <staging-ref>

# Preview migration changes
supabase db diff

# Option A: Prisma migrations (schema-only changes)
npm run prisma:migrate:deploy

# Option B: Supabase push (when RLS/triggers involved)
supabase db push
```

**Checklist:**
- [ ] Preview changes with `supabase db diff`
- [ ] Backup database before applying (if production-critical)
- [ ] Apply migration
- [ ] Verify migration succeeded
- [ ] Test in staging environment
- [ ] Run smoke tests

### 8. Deploy to Production

**⚠️ CRITICAL: Always test in staging first!**

**Workflow:**
```bash
# Link to production environment
supabase link --project-ref <production-ref>

# BACKUP DATABASE FIRST
# (Use Supabase Dashboard → Database → Backups)

# Preview migration changes
supabase db diff

# Apply migration
npm run deploy:production
# OR
supabase db push
```

**Checklist:**
- [ ] Database backed up
- [ ] Migrations tested in staging
- [ ] Off-peak hours (if possible)
- [ ] Monitor Supabase logs during deployment
- [ ] Verify application still works after migration
- [ ] Rollback plan ready (restore from backup)

---

## Common Mistakes to Avoid

### ❌ MISTAKE: Forgetting cascade delete
```prisma
// BAD: No onDelete specified
document Document @relation(fields: [documentId], references: [id])
```

**Why bad:** Users can't delete documents when related records exist

**Fix:**
```prisma
// GOOD: Cascade specified
document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
```

---

### ❌ MISTAKE: Missing unique constraint
```prisma
// BAD: Person.ownerId not unique
model Person {
  ownerId String  // Multiple Person records per user possible!
}
```

**Why bad:** Data integrity violation, allows duplicate records

**Fix:**
```prisma
// GOOD: Unique constraint enforced
model Person {
  ownerId String @unique
}
```

---

### ❌ MISTAKE: Not defining both sides of relation
```prisma
// BAD: Only one side defined
model Person {
  documents Document[]
}
// No `person` field in Document model
```

**Why bad:** Prisma relation won't work properly

**Fix:**
```prisma
// GOOD: Both sides defined
model Person {
  documents Document[]
}

model Document {
  personId String
  person   Person @relation(fields: [personId], references: [id])
}
```

---

### ❌ MISTAKE: Deploying without testing locally
**Why bad:** Production migrations can corrupt data if untested

**Fix:** Always run migration locally and in staging before production

---

### ❌ MISTAKE: Using Prisma migrate deploy when RLS policies change
**Why bad:** `prisma migrate deploy` only runs schema changes, not RLS policies

**Fix:** Use `supabase db push` when RLS policies, triggers, or functions are involved

---

## Emergency Rollback

**If migration breaks production:**

1. **Restore from backup:**
   - Go to Supabase Dashboard → Database → Backups
   - Select backup from before migration
   - Click "Restore"

2. **OR create rollback migration:**
   ```bash
   # Create migration that reverses changes
   npm run prisma:migrate:dev
   # Name it: rollback_[original_migration_name]
   ```

3. **Verify application works after rollback**

4. **Document what went wrong in `.claude/memory/active-issues.md`**

---

## Supabase CLI Quick Reference

```bash
# Link to environment
supabase link --project-ref <ref>

# Preview schema changes
supabase db diff

# Pull remote schema to local
supabase db pull

# Push local migrations to remote
supabase db push

# Reset local database (destructive!)
supabase db reset

# Create branch database for testing
supabase db branch create test-migration

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

---

## When to Ask for Help

- [ ] Migration involves data transformation (not just schema change)
- [ ] Unsure about cascade behavior
- [ ] Dealing with large tables (>1M rows)
- [ ] Adding indexes to production (can lock tables)
- [ ] Complex RLS policy logic

**Action:** Invoke database-architect subagent or consult team lead.
