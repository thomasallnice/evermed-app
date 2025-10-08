# SOP: Testing & Quality Assurance

**Version:** 1.0
**Last Updated:** 2025-10-08

---

## When to Use This SOP
- Writing unit tests for new features
- Creating E2E tests
- Running smoke tests
- Performance testing
- Debugging test failures

---

## ⚠️ MANDATORY: Use vitest-test-writer Subagent

**For comprehensive test coverage, ALWAYS use vitest-test-writer subagent.**

```typescript
Task({
  subagent_type: "vitest-test-writer",
  description: "Create tests for user preferences API",
  prompt: "Create comprehensive unit tests for /api/user/preferences endpoint. Include auth tests, validation tests, error handling, and edge cases."
})
```

---

## Test Types

### 1. Unit Tests (Vitest)
**Location:** `tests/unit/`
**Purpose:** Test individual functions, API routes, utilities

**Run:**
```bash
npm run test
```

**Run specific test:**
```bash
npx vitest run tests/unit/your-test.spec.ts
```

### 2. Smoke Tests (Shell Script)
**Location:** `scripts/smoke-e2e.sh`
**Purpose:** Quick sanity check for full stack

**Run:**
```bash
./scripts/smoke-e2e.sh
./scripts/smoke-e2e.sh --auth  # With authentication
```

### 3. E2E Tests (Future: Chrome DevTools MCP)
**Purpose:** Test complete user flows in real browser

**Run:**
```bash
# TODO: Implement E2E suite using Chrome DevTools MCP
```

---

## Unit Testing Workflow

### 1. Create Test File

**Naming convention:**
```
tests/unit/[feature]/[component].spec.ts
```

**Example:**
```
tests/unit/api/user-preferences.spec.ts
```

### 2. Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle error case', () => {
    expect(() => {
      functionUnderTest(null);
    }).toThrow('Expected error message');
  });
});
```

### 3. Test Coverage Goals

**What to test:**
- [ ] Happy path (normal use case)
- [ ] Edge cases (empty input, null, undefined)
- [ ] Error cases (invalid input, server errors)
- [ ] Authentication (authenticated, unauthenticated, wrong user)
- [ ] Validation (required fields, format validation)
- [ ] Business logic (calculations, transformations)

**Example test structure:**
```typescript
describe('POST /api/user/preferences', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', () => {});
    it('should return 403 when accessing other user data', () => {});
    it('should succeed when authenticated', () => {});
  });

  describe('Validation', () => {
    it('should return 400 when theme is invalid', () => {});
    it('should return 400 when language is missing', () => {});
    it('should succeed with valid input', () => {});
  });

  describe('Business Logic', () => {
    it('should create preferences for new user', () => {});
    it('should update existing preferences', () => {});
    it('should apply default values', () => {});
  });

  describe('Error Handling', () => {
    it('should return 500 on database error', () => {});
  });
});
```

### 4. Database Tests

**Skip if database not available:**
```typescript
import { describe, it, expect } from 'vitest';

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

describe.skipIf(!SUPABASE_DB_URL)('Database Tests', () => {
  it('should query database', async () => {
    // Test that requires actual database
  });
});
```

**Why:** CI might not have database access, tests should gracefully skip

### 5. Mocking

**Mock Prisma Client:**
```typescript
import { vi } from 'vitest';

const mockPrisma = {
  document: {
    findMany: vi.fn(),
    create: vi.fn(),
  }
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma)
}));
```

**Mock external APIs:**
```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mocked' })
  })
);
```

---

## Smoke Testing

### What Smoke Tests Do
- Verify dev stack starts
- Test critical paths (upload → process → retrieve)
- Catch major regressions quickly

### Run Smoke Test

**Basic:**
```bash
./scripts/smoke-e2e.sh
```

**With authentication:**
```bash
./scripts/smoke-e2e.sh --auth
```

### When to Run
- [ ] After major changes
- [ ] Before creating PR
- [ ] After pulling changes from main
- [ ] Before deploying to staging/production

---

## E2E Testing (Future)

### Using Chrome DevTools MCP

**Planned workflow:**
```typescript
// 1. Start browser
mcp__chrome_devtools__new_page({ url: 'http://localhost:3000' });

// 2. Navigate and interact
mcp__chrome_devtools__navigate_page({ url: '/auth/signup' });
mcp__chrome_devtools__fill_form({
  selector: '#signup-form',
  fields: { email: 'test@example.com', password: 'Test123!' }
});
mcp__chrome_devtools__click({ selector: '#signup-button' });

// 3. Wait for result
mcp__chrome_devtools__wait_for({ selector: '#dashboard' });

// 4. Verify
const consoleMessages = mcp__chrome_devtools__list_console_messages();
expect(consoleMessages).not.toContainError();

// 5. Take screenshot
mcp__chrome_devtools__take_screenshot({ path: 'test-result.png' });
```

**Critical flows to test:**
1. **Authentication Flow**
   - Sign up → Email verification → Login → Dashboard

2. **Document Upload Flow**
   - Upload PDF → OCR processing → Explanation generation → View result

3. **Share Pack Flow**
   - Create pack → Add documents → Generate link → Access via passcode

4. **Mobile Responsive Flow**
   - Resize viewport → Test hamburger menu → Verify touch targets

---

## Performance Testing

### Using Chrome DevTools MCP

**Capture performance trace:**
```typescript
// 1. Start trace
mcp__chrome_devtools__performance_start_trace();

// 2. Perform actions
mcp__chrome_devtools__navigate_page({ url: '/vault' });
mcp__chrome_devtools__click({ selector: '#upload-button' });

// 3. Stop trace
mcp__chrome_devtools__performance_stop_trace();

// 4. Analyze
const insights = mcp__chrome_devtools__performance_analyze_insight();
```

**PRD Requirements:**
- p95 latency < 10s for document processing

**What to measure:**
- Page load time
- Time to interactive
- API response time
- Document processing time

**Performance testing workflow:**
1. Start devstack: `./scripts/devstack.sh`
2. Navigate to page under test
3. Start performance trace
4. Execute user flow
5. Stop trace and analyze
6. Document results in `.claude/memory/performance-baseline.md`

---

## Common Mistakes to Avoid

### ❌ MISTAKE: Not skipping database tests
```typescript
// BAD: Test will fail in CI without database
describe('Database Tests', () => {
  it('should query documents', async () => {
    const docs = await prisma.document.findMany();
  });
});
```

**Fix:**
```typescript
// GOOD: Skip if database not available
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

describe.skipIf(!SUPABASE_DB_URL)('Database Tests', () => {
  it('should query documents', async () => {
    const docs = await prisma.document.findMany();
  });
});
```

---

### ❌ MISTAKE: Hardcoding test data
```typescript
// BAD: Hardcoded user ID
it('should fetch user documents', async () => {
  const docs = await fetchDocuments('user-123');
});
```

**Fix:**
```typescript
// GOOD: Generate test data
it('should fetch user documents', async () => {
  const testUserId = crypto.randomUUID();
  const docs = await fetchDocuments(testUserId);
});
```

---

### ❌ MISTAKE: Tests depend on each other
```typescript
// BAD: Tests share state
let userId: string;

it('should create user', () => {
  userId = createUser(); // Sets global state
});

it('should fetch user', () => {
  fetchUser(userId); // Depends on previous test
});
```

**Fix:**
```typescript
// GOOD: Each test is independent
it('should create user', () => {
  const userId = createUser();
  expect(userId).toBeDefined();
});

it('should fetch user', () => {
  const userId = createUser(); // Create fresh data
  const user = fetchUser(userId);
  expect(user).toBeDefined();
});
```

---

### ❌ MISTAKE: Not cleaning up after tests
```typescript
// BAD: Leaves test data in database
it('should create document', async () => {
  await prisma.document.create({ data: testDoc });
  // No cleanup!
});
```

**Fix:**
```typescript
// GOOD: Cleanup after test
it('should create document', async () => {
  const doc = await prisma.document.create({ data: testDoc });

  // Cleanup
  await prisma.document.delete({ where: { id: doc.id } });
});
```

---

## Test Checklist

### Before Creating PR
- [ ] All unit tests pass: `npm run test`
- [ ] Smoke test passes: `./scripts/smoke-e2e.sh`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

### For New Features
- [ ] Unit tests written (happy path + error cases)
- [ ] vitest-test-writer subagent invoked
- [ ] Tests pass locally
- [ ] Test coverage documented

### For Bug Fixes
- [ ] Regression test added
- [ ] Test reproduces the bug (fails before fix)
- [ ] Test passes after fix
- [ ] Root cause documented

---

## Debugging Test Failures

### 1. Read the error message
```bash
npm run test

# Look for:
# - Which test failed
# - Actual vs expected values
# - Stack trace
```

### 2. Run specific test
```bash
npx vitest run tests/unit/failing-test.spec.ts
```

### 3. Add console.log debugging
```typescript
it('should do something', () => {
  console.log('Input:', input);
  const result = functionUnderTest(input);
  console.log('Result:', result);
  expect(result).toBe('expected');
});
```

### 4. Check for async issues
```typescript
// BAD: Missing await
it('should fetch data', () => {
  const data = fetchData(); // Returns Promise!
  expect(data).toBeDefined(); // Will fail
});

// GOOD: Await async operations
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### 5. Check environment variables
```bash
# Tests might need env vars
SUPABASE_DB_URL=... npm run test
```

---

## Quick Reference

**Run all tests:**
```bash
npm run test
```

**Run specific test:**
```bash
npx vitest run tests/unit/your-test.spec.ts
```

**Run smoke test:**
```bash
./scripts/smoke-e2e.sh
```

**Watch mode (re-run on changes):**
```bash
npx vitest watch
```

**Coverage report:**
```bash
npx vitest --coverage
```
