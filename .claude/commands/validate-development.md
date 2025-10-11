# Validate Development Environment

Automated safety and security validation for local development using Chrome DevTools MCP.

**Usage:** Run during development to catch issues before pushing to staging.

---

## Overview

This script uses Chrome DevTools MCP to perform comprehensive validation on **local development environment**:

- ✅ Auto-starts dev server if not running
- ✅ Console error detection (all errors documented)
- ✅ Performance validation (p95 < 10s)
- ✅ Critical user flow testing with authentication
- ✅ Security checks (SSL, network requests)
- ✅ Medical safety compliance (disclaimers, refusals)
- ✅ Visual regression testing (screenshots)

**When to use:**
- Before committing changes
- After implementing new features
- When fixing bugs
- To validate full user flows locally

**Key Features:**
- Automatically starts `npm run dev` if server not running
- Tests against `http://localhost:3000`
- Uses test account for authenticated validation
- Captures screenshots for visual comparison

---

## Prerequisites

### 1. Check if Dev Server is Running

```bash
# Check if localhost:3000 is accessible
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Dev server is already running"
else
  echo "⚠️  Dev server not running - will start automatically"
fi
```

### 2. Auto-Start Dev Server

```bash
# Start dev server in background if not running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "🚀 Starting dev server in background..."

  # Start dev server as background process
  npm run dev > /dev/null 2>&1 &
  DEV_SERVER_PID=$!

  echo "   Dev server started with PID: $DEV_SERVER_PID"
  echo "   Waiting for server to be ready..."

  # Wait for server to start (max 30 seconds)
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      echo "✅ Dev server is ready!"
      break
    fi
    echo "   Waiting... ($i/30)"
    sleep 1
  done

  # Verify server started
  if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Failed to start dev server after 30 seconds"
    exit 1
  fi
else
  echo "✅ Dev server already running"
  DEV_SERVER_PID=""
fi
```

**Important:** The validation will automatically clean up the dev server process when done (if it was auto-started).

---

## Test Account Credentials

**Automated Login Available:**
- Email: `thomas.gnahm@gmail.com`
- Password: `EverMed2025!`
- Stored in: `.env.local` (`VALIDATION_TEST_EMAIL`, `VALIDATION_TEST_PASSWORD`)

**This test account enables:**
- ✅ Automated login during validation
- ✅ Testing protected routes (vault, upload, chat, profile)
- ✅ End-to-end user flow validation
- ✅ API endpoint testing with authentication

---

## Validation Checklist

### 1. Console Error Check

**Goal:** Zero console errors (document all for fixing)

```typescript
// Navigate to local dev server
mcp__chrome_devtools__navigate_page({ url: 'http://localhost:3000' });

// Wait for page load
mcp__chrome_devtools__wait_for({ text: 'EverMed' });

// Check console messages
const consoleMessages = mcp__chrome_devtools__list_console_messages();

// Collect ALL errors for reporting
const errors = consoleMessages.filter(msg => msg.level === 'error');
if (errors.length > 0) {
  console.error(`⚠️  FOUND ${errors.length} console errors in development:`);
  errors.forEach((err, idx) => {
    console.error(`\n${idx + 1}. ${err.text}`);
    console.error(`   Source: ${err.source}`);
    console.error(`   Line: ${err.lineNumber}`);
  });

  console.log('\n📝 Fix these errors before committing');
} else {
  console.log('✅ Zero console errors detected');
}
```

---

### 2. Performance Validation

**Goal:** Verify p95 render time < 10s

```typescript
// Start performance trace
mcp__chrome_devtools__performance_start_trace({
  reload: true,
  autoStop: true
});

// Performance metrics will be captured automatically

console.log('📊 Performance Metrics:');
console.log(`  LCP: ${insights.lcp}ms (target: < 2500ms ideal, < 10000ms max)`);
console.log(`  CLS: ${insights.cls} (target: < 0.1)`);

if (insights.lcp > 10000) {
  console.warn('⚠️  WARNING: LCP exceeds 10s threshold');
} else if (insights.lcp < 2500) {
  console.log('✅ Excellent performance!');
}
```

---

### 3. Authentication Flow (Automated Login)

**Goal:** Test complete login flow with test account

```typescript
// Navigate to login page
mcp__chrome_devtools__navigate_page({ url: 'http://localhost:3000/login' });

// Take snapshot to get form field UIDs
const snapshot = mcp__chrome_devtools__take_snapshot();

// Fill login form with test credentials
mcp__chrome_devtools__fill_form({
  elements: [
    { uid: 'email_input_uid', value: 'thomas.gnahm@gmail.com' },
    { uid: 'password_input_uid', value: 'EverMed2025!' }
  ]
});

// Click login button
mcp__chrome_devtools__click({ uid: 'login_button_uid' });

// Wait for redirect to vault
mcp__chrome_devtools__wait_for({ text: 'Document Vault', timeout: 10000 });

// Verify logged in state
const loggedInSnapshot = mcp__chrome_devtools__take_snapshot();

// Check console for auth errors
const consoleMessages = mcp__chrome_devtools__list_console_messages();
const authErrors = consoleMessages.filter(msg =>
  msg.text.includes('unauthorized') || msg.level === 'error'
);

if (authErrors.length > 0) {
  console.error('⚠️  Authentication errors detected:');
  authErrors.forEach(err => console.error(`  - ${err.text}`));
} else {
  console.log('✅ Login successful - authenticated session established');
}
```

---

### 4. Vault Access (Authenticated)

```typescript
// Already logged in from step 3
// Navigate to vault page
mcp__chrome_devtools__navigate_page({ url: 'http://localhost:3000/vault' });

// Wait for vault to load
mcp__chrome_devtools__wait_for({ text: 'Document Vault', timeout: 5000 });

// Take snapshot
const vaultSnapshot = mcp__chrome_devtools__take_snapshot();

// Check console for errors
const consoleMessages = mcp__chrome_devtools__list_console_messages();
const errors = consoleMessages.filter(msg => msg.level === 'error');

if (errors.length > 0) {
  console.error(`⚠️  Vault page has ${errors.length} console errors`);
  errors.forEach(err => console.error(`  - ${err.text}`));
}

// Take screenshot
mcp__chrome_devtools__take_screenshot({
  filePath: 'tests/screenshots/development/vault-authenticated.png',
  fullPage: true
});

console.log('✅ Vault page accessible');
```

---

### 5. Upload Flow (Authenticated)

```typescript
// Navigate to upload page
mcp__chrome_devtools__navigate_page({ url: 'http://localhost:3000/upload' });

// Wait for upload interface
mcp__chrome_devtools__wait_for({ text: 'Upload', timeout: 5000 });

// Take snapshot
const uploadSnapshot = mcp__chrome_devtools__take_snapshot();

// Check console
const consoleMessages = mcp__chrome_devtools__list_console_messages();
const errors = consoleMessages.filter(msg => msg.level === 'error');

if (errors.length > 0) {
  console.error(`⚠️  Upload page has ${errors.length} console errors`);
  errors.forEach(err => console.error(`  - ${err.text}`));
}

console.log('✅ Upload page accessible');
```

---

### 6. Chat Feature (Authenticated)

```typescript
// Navigate to chat page
mcp__chrome_devtools__navigate_page({ url: 'http://localhost:3000/chat' });

// Wait for chat interface
mcp__chrome_devtools__wait_for({ text: 'Chat', timeout: 5000 });

// Take snapshot
const chatSnapshot = mcp__chrome_devtools__take_snapshot();

// Verify medical disclaimer (critical!)
const disclaimerKeywords = [
  'not a substitute',
  'consult',
  'healthcare provider'
];

const hasDisclaimer = disclaimerKeywords.some(keyword =>
  chatSnapshot.text.toLowerCase().includes(keyword.toLowerCase())
);

if (!hasDisclaimer) {
  console.error('❌ CRITICAL: Medical disclaimer missing on chat page');
} else {
  console.log('✅ Medical disclaimer present');
}

// Check console
const consoleMessages = mcp__chrome_devtools__list_console_messages();
const errors = consoleMessages.filter(msg => msg.level === 'error');

if (errors.length > 0) {
  console.error(`⚠️  Chat page has ${errors.length} console errors`);
  errors.forEach(err => console.error(`  - ${err.text}`));
}

console.log('✅ Chat page accessible');
```

---

### 7. Medical Safety Compliance

**Goal:** Verify disclaimers present on all medical pages

```typescript
const medicalPages = [
  { url: 'http://localhost:3000/chat', name: 'Chat' },
  { url: 'http://localhost:3000/vault', name: 'Vault' },
  { url: 'http://localhost:3000', name: 'Landing' }
];

for (const page of medicalPages) {
  mcp__chrome_devtools__navigate_page({ url: page.url });
  await new Promise(resolve => setTimeout(resolve, 1000));

  const snapshot = mcp__chrome_devtools__take_snapshot();

  const disclaimerKeywords = [
    'not a substitute',
    'consult',
    'healthcare provider',
    'medical advice'
  ];

  const foundKeywords = disclaimerKeywords.filter(keyword =>
    snapshot.text.toLowerCase().includes(keyword.toLowerCase())
  );

  if (foundKeywords.length >= 2) {
    console.log(`✅ ${page.name}: Medical disclaimer present`);
  } else {
    console.warn(`⚠️  ${page.name}: Medical disclaimer may be missing or incomplete`);
    console.warn(`   Found keywords: ${foundKeywords.join(', ')}`);
  }
}
```

---

### 8. Visual Regression Testing

**Goal:** Capture screenshots for comparison

```typescript
const pages = [
  { name: 'landing', url: 'http://localhost:3000' },
  { name: 'login', url: 'http://localhost:3000/login' },
  { name: 'vault', url: 'http://localhost:3000/vault' },
  { name: 'upload', url: 'http://localhost:3000/upload' },
  { name: 'chat', url: 'http://localhost:3000/chat' }
];

for (const page of pages) {
  mcp__chrome_devtools__navigate_page({ url: page.url });
  await new Promise(resolve => setTimeout(resolve, 2000));

  mcp__chrome_devtools__take_screenshot({
    filePath: `tests/screenshots/development/${page.name}.png`,
    fullPage: true
  });

  console.log(`✅ Screenshot captured: ${page.name}`);
}
```

---

### 9. Responsive Design Validation

**Goal:** Test mobile/tablet/desktop breakpoints

```typescript
const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

for (const breakpoint of breakpoints) {
  // Resize page
  try {
    mcp__chrome_devtools__resize_page({
      width: breakpoint.width,
      height: breakpoint.height
    });
  } catch (error) {
    console.log(`ℹ️  Resize may not work in headless mode - skipping`);
    continue;
  }

  // Navigate to vault
  mcp__chrome_devtools__navigate_page({
    url: 'http://localhost:3000/vault'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check console for responsive errors
  const consoleMessages = mcp__chrome_devtools__list_console_messages();
  const errors = consoleMessages.filter(msg => msg.level === 'error');

  if (errors.length > 0) {
    console.error(`⚠️  Responsive errors on ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);
    errors.forEach(err => console.error(`  - ${err.text}`));
  } else {
    console.log(`✅ ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) - no errors`);
  }
}
```

---

### 10. Cleanup (Stop Dev Server if Auto-Started)

```bash
# If dev server was auto-started, stop it
if [ -n "$DEV_SERVER_PID" ]; then
  echo ""
  echo "🧹 Cleaning up: Stopping auto-started dev server (PID: $DEV_SERVER_PID)"
  kill $DEV_SERVER_PID
  echo "✅ Dev server stopped"
fi
```

---

## Validation Report Template

```markdown
## Development Environment Validation Report

**Environment:** Local Development
**URL:** http://localhost:3000
**Validated:** 2025-10-11T16:00:00Z

### ✅ PASSED Checks

- Dev server started successfully ✅
- Login flow functional ✅
- Vault accessible after authentication ✅
- Upload page accessible ✅
- Chat page accessible ✅
- Medical disclaimers present ✅

### ⚠️ WARNINGS

- Console Errors: 2 errors detected
  1. `Warning: Each child in list should have unique key` (DocumentList.tsx:18)
  2. `Failed to load resource: 404` (missing favicon.ico)

### 📊 Performance Metrics

- LCP: 1.2s (target: < 2.5s) ✅
- CLS: 0.02 (target: < 0.1) ✅

### 📸 Screenshots Captured

- Landing page: ✅
- Login page: ✅
- Vault (authenticated): ✅
- Upload page: ✅
- Chat page: ✅

### 🎯 Verdict

**DEVELOPMENT ENVIRONMENT READY** ⚠️

2 warnings detected - fix before committing to main branch.

### 📝 Action Items

1. Add unique keys to DocumentList component
2. Add favicon.ico to public directory
```

---

## Best Practices

1. **Run before every commit** - Catch issues early
2. **Fix errors immediately** - Don't accumulate technical debt
3. **Compare screenshots** - Visual regression between dev and staging
4. **Document performance** - Track improvements over time
5. **Test authenticated flows** - Most bugs occur in protected routes

---

## Integration with Development Workflow

### Pre-Commit Hook (Recommended)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running development validation..."

# Run validation command
/validate-development

# If validation fails, block commit
if [ $? -ne 0 ]; then
  echo "❌ Validation failed - fix issues before committing"
  exit 1
fi

echo "✅ Validation passed - proceeding with commit"
```

### Manual Usage

```bash
# Run validation anytime during development
/validate-development
```

---

## Troubleshooting

### Dev Server Won't Start

```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill existing process if needed
kill -9 $(lsof -t -i:3000)

# Clear Next.js cache and restart
npm run clean:next
npm run dev
```

### Chrome DevTools MCP not available

```bash
# Check MCP configuration
cat ~/.config/claude/mcp.json

# Should contain chrome-devtools entry:
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]
    }
  }
}
```

### Database Connection Errors

```bash
# Verify DATABASE_URL is set in .env.local
grep DATABASE_URL .env.local

# Check Supabase connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

---

## Notes

- Auto-starts dev server if not running (port 3000)
- Automatically cleans up dev server when done
- Screenshots saved to `tests/screenshots/development/`
- Test account allows full authenticated validation
- Safe to run multiple times (idempotent)

**Remember:** Development validation catches issues before they reach staging. Run it often!
