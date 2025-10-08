# SOP: API Endpoint Development

**Version:** 1.0
**Last Updated:** 2025-10-08

---

## When to Use This SOP
- Creating new API routes
- Modifying existing API endpoints
- Changing request/response shapes
- Adding authentication to endpoints

---

## ⚠️ MANDATORY: Use api-contract-validator Subagent

**ALWAYS validate API changes with the api-contract-validator subagent.**

```typescript
Task({
  subagent_type: "api-contract-validator",
  description: "Validate new user preferences endpoint",
  prompt: "Validate POST /api/user/preferences endpoint against CODEX_REFIT_PLAN.md spec. Check request/response shapes, auth requirements, and error handling."
})
```

---

## API Route Standards

### File Location
```
apps/web/src/app/api/[endpoint]/route.ts
```

### Basic Template
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

// ⚠️ CRITICAL: Always add these exports for routes using requireUserId
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication
    const userId = await requireUserId(req);

    // 2. Input validation
    const param = req.nextUrl.searchParams.get('param');
    if (!param) {
      return NextResponse.json(
        { error: 'param is required' },
        { status: 400 }
      );
    }

    // 3. Business logic
    const data = await prisma.model.findMany({
      where: { ownerId: userId }
    });

    // 4. Success response
    return NextResponse.json({ data });

  } catch (error: any) {
    // 5. Error handling
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('[API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step-by-Step Workflow

### 1. Check API Specification

**Before writing code:**
- [ ] Read `docs/CODEX_REFIT_PLAN.md` for API contract
- [ ] Verify endpoint path and HTTP method
- [ ] Check required request/response shapes
- [ ] Identify authentication requirements

### 2. Create Route File

**Command:**
```bash
mkdir -p apps/web/src/app/api/[your-endpoint]
touch apps/web/src/app/api/[your-endpoint]/route.ts
```

### 3. Implement Endpoint

**Required exports (for authenticated routes):**
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Why:** Routes accessing `request.headers` (via `requireUserId`) must be marked as dynamic to prevent Next.js static prerendering.

### 4. Authentication

**For authenticated endpoints:**
```typescript
const userId = await requireUserId(req);
```

**For admin-only endpoints:**
```typescript
const userId = await requireUserId(req);
// Add admin check logic
const person = await prisma.person.findUnique({
  where: { ownerId: userId }
});
if (!person?.isAdmin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**For public endpoints:**
```typescript
// No auth required
// But still add: export const dynamic = 'force-dynamic' if needed
```

### 5. Input Validation

**Query parameters:**
```typescript
const id = req.nextUrl.searchParams.get('id');
if (!id) {
  return NextResponse.json({ error: 'id required' }, { status: 400 });
}
```

**Request body:**
```typescript
const body = await req.json();
const { field1, field2 } = body;

if (!field1 || !field2) {
  return NextResponse.json(
    { error: 'field1 and field2 are required' },
    { status: 400 }
  );
}
```

**Type safety:**
```typescript
// Define request/response types
interface CreateUserPreferencesRequest {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

interface CreateUserPreferencesResponse {
  id: string;
  preferences: CreateUserPreferencesRequest;
}

const body: CreateUserPreferencesRequest = await req.json();
```

### 6. Business Logic

**Use Prisma for database operations:**
```typescript
// Query with RLS (owner check)
const documents = await prisma.document.findMany({
  where: {
    ownerId: userId,  // ⚠️ CRITICAL: Always filter by owner
    // other filters...
  },
  include: {
    docChunks: true
  }
});
```

**Avoid N+1 queries:**
```typescript
// BAD: N+1 query
const documents = await prisma.document.findMany();
for (const doc of documents) {
  doc.chunks = await prisma.docChunk.findMany({ where: { documentId: doc.id } });
}

// GOOD: Single query with include
const documents = await prisma.document.findMany({
  include: { docChunks: true }
});
```

### 7. Response Format

**Success (200):**
```typescript
return NextResponse.json({
  data: result,
  meta: { count: result.length }
});
```

**Created (201):**
```typescript
return NextResponse.json({
  data: createdItem
}, { status: 201 });
```

**Bad Request (400):**
```typescript
return NextResponse.json({
  error: 'Validation failed',
  details: { field: 'error message' }
}, { status: 400 });
```

**Unauthorized (401):**
```typescript
return NextResponse.json({
  error: 'Unauthorized'
}, { status: 401 });
```

**Forbidden (403):**
```typescript
return NextResponse.json({
  error: 'Forbidden'
}, { status: 403 });
```

**Not Found (404):**
```typescript
return NextResponse.json({
  error: 'Resource not found'
}, { status: 404 });
```

**Internal Server Error (500):**
```typescript
return NextResponse.json({
  error: 'Internal server error'
}, { status: 500 });
```

### 8. Error Handling

**Structured error handling:**
```typescript
try {
  // Business logic
} catch (error: any) {
  // Log error for debugging
  console.error('[API Error]:', {
    endpoint: '/api/your-endpoint',
    error: error.message,
    stack: error.stack
  });

  // Return user-friendly error
  if (error.message === 'Unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generic server error (don't leak implementation details)
  return NextResponse.json({
    error: 'An unexpected error occurred'
  }, { status: 500 });
}
```

### 9. Testing

**Manual testing:**
```bash
# Start dev server
npm run dev

# Test with curl
curl -X GET http://localhost:3000/api/your-endpoint \
  -H "x-user-id: test-user-id"

curl -X POST http://localhost:3000/api/your-endpoint \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{"field": "value"}'
```

**Unit tests:**
```typescript
// tests/unit/api/your-endpoint.spec.ts
import { describe, it, expect } from 'vitest';
// ... test implementation
```

### 10. Validation

**Checklist:**
- [ ] Run `npm run typecheck` (no TypeScript errors)
- [ ] Run `npm run lint` (no linting errors)
- [ ] Run `npm run build` (build succeeds)
- [ ] Test endpoint manually
- [ ] Verify authentication works
- [ ] Test error cases (400, 401, 404, 500)
- [ ] Check response matches API spec

**Invoke api-contract-validator:**
```typescript
Task({
  subagent_type: "api-contract-validator",
  description: "Validate new endpoint",
  prompt: "Validate the new /api/your-endpoint implementation against CODEX_REFIT_PLAN.md"
})
```

---

## Common Mistakes to Avoid

### ❌ MISTAKE: Missing dynamic export
```typescript
// BAD: No dynamic export
import { requireUserId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = await requireUserId(req); // Accesses request.headers
  // ...
}
```

**Why bad:** Next.js will try to prerender at build time, causing "couldn't be rendered statically" error

**Fix:**
```typescript
// GOOD: Add dynamic export
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

---

### ❌ MISTAKE: Not filtering by owner
```typescript
// BAD: No owner filter (data leakage!)
const documents = await prisma.document.findMany();
```

**Why bad:** Returns all users' documents, massive security vulnerability

**Fix:**
```typescript
// GOOD: Filter by authenticated user
const userId = await requireUserId(req);
const documents = await prisma.document.findMany({
  where: { ownerId: userId }
});
```

---

### ❌ MISTAKE: Direct Prisma type imports
```typescript
// BAD: Direct type import from @prisma/client
import { Document } from '@prisma/client';
const docs: Document[] = await prisma.document.findMany();
```

**Why bad:** Vercel build fails (Prisma types not directly exportable)

**Fix:**
```typescript
// GOOD: Type inference
const docs = await prisma.document.findMany();
type DocumentType = (typeof docs)[number];
```

---

### ❌ MISTAKE: Not handling errors
```typescript
// BAD: No error handling
export async function GET(req: NextRequest) {
  const data = await prisma.model.findMany(); // Can throw!
  return NextResponse.json({ data });
}
```

**Why bad:** Unhandled errors crash the API

**Fix:**
```typescript
// GOOD: Wrapped in try/catch
export async function GET(req: NextRequest) {
  try {
    const data = await prisma.model.findMany();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[API Error]:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

---

### ❌ MISTAKE: Leaking error details to client
```typescript
// BAD: Exposes stack trace and implementation details
catch (error: any) {
  return NextResponse.json({ error: error.stack }, { status: 500 });
}
```

**Why bad:** Security vulnerability, leaks implementation details

**Fix:**
```typescript
// GOOD: Generic user-facing error
catch (error: any) {
  console.error('[API Error]:', error); // Log for debugging
  return NextResponse.json({
    error: 'An unexpected error occurred'
  }, { status: 500 });
}
```

---

## Medical Compliance (Non-SaMD)

**⚠️ For endpoints returning medical content:**

**ALWAYS use medical-compliance-guardian subagent:**
```typescript
Task({
  subagent_type: "medical-compliance-guardian",
  description: "Review medical content endpoint",
  prompt: "Review /api/chat endpoint for non-SaMD compliance, citation requirements, and refusal templates."
})
```

**Requirements:**
- [ ] No diagnosis, dosing, or triage advice
- [ ] All AI outputs include citations (provenance)
- [ ] Medical disclaimers included
- [ ] Refusal templates for prohibited requests

**See:** `apps/web/src/lib/copy.ts` for approved disclaimers

---

## Performance Considerations

### Database Query Optimization
```typescript
// Use select to limit fields
const documents = await prisma.document.findMany({
  where: { ownerId: userId },
  select: {
    id: true,
    title: true,
    createdAt: true
    // Don't fetch large binary data unless needed
  }
});
```

### Pagination
```typescript
// Add pagination for large datasets
const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
const limit = 20;

const documents = await prisma.document.findMany({
  where: { ownerId: userId },
  take: limit,
  skip: (page - 1) * limit
});
```

### Caching
```typescript
// Cache static data
export const revalidate = 3600; // Revalidate every hour
```

---

## Quick Reference

**Common imports:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';
```

**Required exports (for auth routes):**
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Error responses:**
- 400: Bad Request (validation failed)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (authenticated but not authorized)
- 404: Not Found
- 500: Internal Server Error

**Dev server:**
```bash
npm run dev
# http://localhost:3000
```
