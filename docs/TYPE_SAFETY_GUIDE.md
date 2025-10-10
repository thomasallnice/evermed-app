# Type Safety Guide: Database Schema & TypeScript

## Overview

This guide ensures type safety between database schema and TypeScript code, preventing schema drift issues.

## ✅ DO: Use Prisma-Generated Types

**Always use Prisma-generated types instead of hardcoded interfaces:**

```typescript
// ✅ CORRECT: Use Prisma-generated types
import { Prisma } from '@prisma/client';

type SafeAnalyticsEvent = Prisma.AnalyticsEventGetPayload<{}>;
type SafePerson = Prisma.PersonGetPayload<{}>;
type SafeFoodEntry = Prisma.FoodEntryGetPayload<{
  include: { photos: true; ingredients: true }
}>;

// Use in functions
async function getEvents(): Promise<SafeAnalyticsEvent[]> {
  return await prisma.analyticsEvent.findMany();
}
```

**Why?** Prisma generates types from the ACTUAL database schema, not just the Prisma schema file. This catches drift at compile time.

## ❌ DON'T: Hardcode Type Definitions

```typescript
// ❌ WRONG: Hardcoded types drift from database
interface AnalyticsEvent {
  id: string;
  eventName: string;  // Field might not exist in DB!
  sessionId: string;  // Field might not exist in DB!
  metadata: any;
}
```

**Why not?** When database schema changes (e.g., `userId` → `sessionId`), hardcoded types don't update, causing runtime errors.

## Schema Compatibility Patterns

### Pattern 1: Schema Evolution Compatibility

When a schema changes (like AnalyticsEvent old → new), create compatibility helpers:

```typescript
import { Prisma } from '@prisma/client';

type AnalyticsEvent = Prisma.AnalyticsEventGetPayload<{}>;

// Compatibility helpers for old vs new schema
function getSessionId(event: AnalyticsEvent): string {
  return String((event as any).sessionId || (event as any).userId || '');
}

function getEventName(event: AnalyticsEvent): string {
  return String((event as any).eventName || (event as any).name || '');
}

function getMetadata(event: AnalyticsEvent): any {
  return (event as any).metadata || (event as any).meta || {};
}

// Use helpers in code
const events = await prisma.analyticsEvent.findMany();
events.forEach(e => {
  console.log(getSessionId(e), getEventName(e));
});
```

### Pattern 2: Table Existence Checking

For tables that may not exist yet (like metabolic insights):

```typescript
// Check if table exists before using
async function getFoodEntries() {
  try {
    // This will throw if table doesn't exist
    return await prisma.foodEntry.findMany();
  } catch (error) {
    if (error.code === 'P2021') {
      // Table doesn't exist - return empty or stub response
      return [];
    }
    throw error;
  }
}
```

### Pattern 3: API Endpoint Stubbing

For endpoints using non-existent tables, stub with clear messages:

```typescript
export async function GET(req: NextRequest) {
  if (!isTableReady('FoodEntry')) {
    return NextResponse.json({
      error: 'Feature not yet available',
      message: 'Database migrations pending. This endpoint will be enabled after migrations.',
    }, { status: 503 });
  }

  // Normal implementation
  const entries = await prisma.foodEntry.findMany();
  return NextResponse.json({ entries });
}
```

## Pre-Deployment Validation

### Always run before deploying:

```bash
# Validate migrations are applied
npm run validate:migrations

# Validate schema compatibility
npm run validate:schema

# Run all validations
npm run validate:all
```

### In CI/CD:

The `validate-schema` job runs automatically and will fail if:
- Pending migrations exist
- Hardcoded types are detected
- Schema drift is detected

## Migration Workflow

### 1. Create Migration Locally

```bash
# Make changes to db/schema.prisma
# Then generate migration
npm run prisma:migrate:dev
```

### 2. Update Code

```typescript
// Use Prisma-generated types (auto-updated)
import { Prisma } from '@prisma/client';
type MyType = Prisma.MyModelGetPayload<{}>;
```

### 3. Validate Locally

```bash
npm run validate:all
```

### 4. Apply to Staging

```bash
# Link to staging
supabase link --project-ref <staging-ref>

# Apply migrations
npm run prisma:migrate:deploy

# Verify
npm run validate:migrations
```

### 5. Deploy Code

```bash
git push origin main:staging
```

## Common Pitfalls

### Pitfall 1: Deploying Code Before Migrations

**Problem**: Code references new tables, but migrations not applied.

**Solution**: Always apply migrations BEFORE deploying code.

### Pitfall 2: Assuming Local Schema Matches Production

**Problem**: Local dev has full schema, staging/prod have partial schema.

**Solution**: Use validation scripts to check parity.

### Pitfall 3: Hardcoding Field Names

**Problem**: Direct property access breaks when schema changes.

**Solution**: Use compatibility helpers or Prisma-generated types.

## ESLint Rule (Future)

Add to `.eslintrc.js` to enforce this pattern:

```javascript
module.exports = {
  rules: {
    // Warn when creating hardcoded database type interfaces
    '@typescript-eslint/no-empty-interface': 'error',
    // Require Prisma import when using database types
    'no-restricted-imports': ['error', {
      patterns: ['!@prisma/client']
    }]
  }
};
```

## Monitoring

### Check for drift daily:

```bash
# Add to cron job or GitHub Action
npm run validate:schema
```

### Alert on validation failures:

Set up alerts for:
- Pending migrations in staging/production
- Schema validation failures
- Type safety violations

## Summary

✅ **DO**:
- Use `Prisma.GetPayload<{}>` for all database types
- Create compatibility helpers for schema evolution
- Validate before deploying
- Apply migrations before code deployment

❌ **DON'T**:
- Hardcode database type interfaces
- Deploy code before migrations
- Assume local schema matches production
- Skip validation scripts
