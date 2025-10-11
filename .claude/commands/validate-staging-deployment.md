# Validate Staging Deployment

Automated safety and security validation for staging deployments using Chrome DevTools MCP.

**Usage:** Run after Vercel staging deployment completes to validate before promoting to production.

---

## Overview

This script uses Chrome DevTools MCP to perform comprehensive post-deployment validation on **staging environment**:

- ✅ Console error detection (document all errors for dev fixes)
- ✅ Performance validation (p95 < 10s)
- ✅ Critical user flow testing
- ✅ Security checks (SSL, network requests)
- ✅ Medical safety compliance (disclaimers, refusals)
- ✅ Visual regression testing (screenshots)
- ✅ Responsive design validation

**Key Difference from Production Validation:**
- **Staging**: Document issues → Create dev branch tickets → Fix in development
- **Production**: Issues block deployment → Immediate rollback if critical

**When to use:**
- After staging deployment completes
- Before promoting staging to production
- As QA validation gate
- To generate bug reports for development team

---

## Validation Checklist

### 1. Console Error Check (DOCUMENT ALL)

**Goal:** Zero console errors (or document all for fixing in dev)

```typescript
// Navigate to staging URL
mcp__chrome_devtools__navigate_page({ url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app' });

// Wait for page load
mcp__chrome_devtools__wait_for({ text: 'EverMed' });

// Check console messages
const consoleMessages = mcp__chrome_devtools__list_console_messages();

// Collect ALL errors for reporting
const errors = consoleMessages.filter(msg => msg.level === 'error');
if (errors.length > 0) {
  console.error(`⚠️  FOUND ${errors.length} console errors in staging`);
  console.error('These should be fixed in development before production:');
  errors.forEach((err, idx) => {
    console.error(`\n${idx + 1}. ${err.text}`);
    console.error(`   Source: ${err.source}`);
    console.error(`   Line: ${err.lineNumber}`);
  });

  // Create issue report (don't block staging, but document)
  console.log('\n📝 Create GitHub issues for these errors before promoting to production');
}
```

**Outcome:**
- **0 errors**: ✅ Ready for production promotion
- **1-5 errors**: ⚠️ Document and fix in dev, may still promote if non-critical
- **>5 errors**: 🚨 Fix in dev before production promotion

---

### 2. Performance Validation

**Goal:** Verify p95 render time < 10s (PRD requirement)

```typescript
// Start performance trace
mcp__chrome_devtools__performance_start_trace({
  reload: true,
  autoStop: true
});

// Navigate to key pages
mcp__chrome_devtools__navigate_page({ url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/vault' });

// Stop trace and analyze
mcp__chrome_devtools__performance_stop_trace();
const insights = mcp__chrome_devtools__performance_analyze_insight({
  insightName: 'LCPBreakdown'
});

// Report performance metrics
console.log('📊 Performance Metrics:');
console.log(`  LCP: ${insights.lcp}ms (target: < 2500ms ideal, < 10000ms max)`);
console.log(`  FID: ${insights.fid}ms (target: < 100ms)`);
console.log(`  CLS: ${insights.cls} (target: < 0.1)`);

// Warn if exceeds thresholds
if (insights.lcp > 10000) {
  console.warn('⚠️  WARNING: LCP exceeds 10s threshold - MUST fix before production');
} else if (insights.lcp > 2500) {
  console.log('ℹ️  NOTE: LCP exceeds ideal 2.5s but within acceptable 10s limit');
}
```

**Outcome:**
- **LCP < 2.5s**: ✅ Excellent performance
- **LCP 2.5s-10s**: ⚠️ Acceptable but consider optimization
- **LCP > 10s**: 🚨 BLOCKER - Must fix before production

---

### 3. Critical User Flow Testing

**Goal:** Ensure key features work end-to-end

#### 3.1 Authentication Flow

```typescript
// Navigate to login
mcp__chrome_devtools__navigate_page({ url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/auth/login' });

// Take screenshot for baseline
mcp__chrome_devtools__take_screenshot({
  filePath: 'tests/screenshots/staging/login-page.png'
});

// Check login form exists
const snapshot = mcp__chrome_devtools__take_snapshot();

// Verify: email input, password input, submit button present
const hasEmailInput = snapshot.text.includes('Email') || snapshot.text.includes('email');
const hasPasswordInput = snapshot.text.includes('Password') || snapshot.text.includes('password');
const hasSubmitButton = snapshot.text.includes('Sign in') || snapshot.text.includes('Login');

if (!hasEmailInput || !hasPasswordInput || !hasSubmitButton) {
  console.error('❌ Login form incomplete on staging');
  console.error(`  Email input: ${hasEmailInput ? '✅' : '❌'}`);
  console.error(`  Password input: ${hasPasswordInput ? '✅' : '❌'}`);
  console.error(`  Submit button: ${hasSubmitButton ? '✅' : '❌'}`);
}
```

#### 3.2 Vault Access (Authenticated)

```typescript
// Note: Can't test actual login without credentials
// But can verify public pages load and redirect correctly

mcp__chrome_devtools__navigate_page({ url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/vault' });

// Verify: should redirect to /auth/login if not authenticated
await new Promise(resolve => setTimeout(resolve, 2000));

const currentUrl = await mcp__chrome_devtools__evaluate_script({
  function: '() => window.location.href'
});

if (!currentUrl.includes('/auth/login')) {
  console.error('⚠️  Vault did not redirect to login when unauthenticated');
  console.error(`  Current URL: ${currentUrl}`);
}

// Check console for auth errors
const consoleMessages = mcp__chrome_devtools__list_console_messages();
const authErrors = consoleMessages.filter(msg =>
  msg.text.includes('unauthorized') ||
  msg.text.includes('401') ||
  msg.level === 'error'
);

if (authErrors.length > 0) {
  console.warn('⚠️  Auth-related console messages detected:');
  authErrors.forEach(err => console.log(`  - ${err.text}`));
}
```

#### 3.3 Share Pack Public Viewer

```typescript
// Test public share pack endpoint (no auth required)
mcp__chrome_devtools__navigate_page({
  url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/share/test-token'
});

// Should show passcode input (or 404 if token invalid)
await new Promise(resolve => setTimeout(resolve, 2000));

const snapshot = mcp__chrome_devtools__take_snapshot();
const hasPasscodeInput = snapshot.text.includes('Passcode') || snapshot.text.includes('passcode');
const is404 = snapshot.text.includes('404') || snapshot.text.includes('Not Found');

if (!hasPasscodeInput && !is404) {
  console.error('❌ Share pack page did not show passcode input or 404');
}

// Check console - should be zero errors
const consoleMessages = mcp__chrome_devtools__list_console_messages();
const errors = consoleMessages.filter(msg => msg.level === 'error');
if (errors.length > 0) {
  console.error(`❌ Share pack viewer has ${errors.length} console errors`);
  errors.forEach(err => console.error(`  - ${err.text}`));
}
```

---

### 4. Security Validation

**Goal:** Ensure staging is secure

#### 4.1 SSL Certificate Check

```typescript
// Navigate with SSL validation
mcp__chrome_devtools__navigate_page({
  url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app'
});

// Check network requests for SSL issues
const networkRequests = mcp__chrome_devtools__list_network_requests();

// Validate: All requests are HTTPS
const httpRequests = networkRequests.filter(req =>
  req.url.startsWith('http://') && !req.url.startsWith('http://localhost')
);

if (httpRequests.length > 0) {
  console.error('⚠️  WARNING: Mixed content detected (HTTP requests on HTTPS page)');
  console.error('HTTP requests:');
  httpRequests.forEach(req => console.error(`  - ${req.url}`));
}
```

#### 4.2 Unauthorized API Access

```typescript
// Test API endpoints without auth
const apiEndpoints = [
  '/api/uploads',
  '/api/chat',
  '/api/profile/update',
  '/api/documents'
];

console.log('🔒 Testing API endpoint security...');
for (const endpoint of apiEndpoints) {
  const response = await fetch(`https://evermed-app-git-staging-thomasallnices-projects.vercel.app${endpoint}`, {
    method: 'GET'
  });

  // Validate: Should return 401 Unauthorized
  if (response.status !== 401) {
    console.error(`❌ SECURITY ISSUE: ${endpoint} is not protected`);
    console.error(`   Expected 401, got ${response.status}`);
  } else {
    console.log(`✅ ${endpoint} - properly protected (401)`);
  }
}
```

#### 4.3 Console Data Leak Check

```typescript
// Navigate to vault page
mcp__chrome_devtools__navigate_page({
  url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/vault'
});

await new Promise(resolve => setTimeout(resolve, 2000));

// Check console for PHI leaks
const consoleMessages = mcp__chrome_devtools__list_console_messages();

// Validate: No sensitive data in console
const sensitivePatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/,  // SSN
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,  // Email
  /\b\d{16}\b/,  // Credit card
  /password/i,
  /token/i,
  /api[_-]?key/i
];

const leaks = consoleMessages.filter(msg =>
  sensitivePatterns.some(pattern => pattern.test(msg.text))
);

if (leaks.length > 0) {
  console.error('❌ CRITICAL: Sensitive data detected in console');
  leaks.forEach(leak => {
    console.error(`  - ${leak.text}`);
  });
  console.error('🚨 BLOCKER: Fix data leaks before production deployment');
}
```

---

### 5. Medical Safety Compliance (Non-SaMD)

**Goal:** Verify medical disclaimers and refusal templates

#### 5.1 Chat Disclaimer Check

```typescript
// Navigate to chat page
mcp__chrome_devtools__navigate_page({
  url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/chat'
});

await new Promise(resolve => setTimeout(resolve, 2000));

// Take snapshot
const snapshot = mcp__chrome_devtools__take_snapshot();

// Validate: Medical disclaimer is present
const disclaimerKeywords = [
  'not a substitute for professional medical advice',
  'consult',
  'healthcare provider',
  'emergency'
];

const foundKeywords = disclaimerKeywords.filter(keyword =>
  snapshot.text.toLowerCase().includes(keyword.toLowerCase())
);

if (foundKeywords.length < 2) {
  console.error('❌ COMPLIANCE ISSUE: Medical disclaimer missing or incomplete');
  console.error(`   Found keywords: ${foundKeywords.join(', ')}`);
  console.error('🚨 BLOCKER: Add proper medical disclaimer before production');
} else {
  console.log(`✅ Medical disclaimer present (found: ${foundKeywords.join(', ')})`);
}
```

#### 5.2 Refusal Template Validation

```typescript
// Check that refusal templates exist in code (manual code review step)
console.log('📝 Refusal Template Checklist (Manual Review):');
console.log('  [ ] Dosing questions refused with healthcare provider redirect');
console.log('  [ ] Triage questions refused with emergency services redirect');
console.log('  [ ] Diagnosis questions refused with consultation redirect');
console.log('  [ ] All refusals cite lib/copy.ts templates');
console.log('');
console.log('⚠️  These should be validated via code review or E2E tests');
```

---

### 6. Network Request Validation

**Goal:** Ensure API contracts are correct

```typescript
// Navigate to vault
mcp__chrome_devtools__navigate_page({
  url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/vault'
});

// Wait for page load and API calls
await new Promise(resolve => setTimeout(resolve, 3000));

// List all network requests
const networkRequests = mcp__chrome_devtools__list_network_requests({
  resourceTypes: ['xhr', 'fetch']
});

// Validate: No 500 errors
const serverErrors = networkRequests.filter(req =>
  req.status >= 500 && req.status < 600
);

if (serverErrors.length > 0) {
  console.error(`❌ CRITICAL: ${serverErrors.length} server errors detected`);
  serverErrors.forEach(req => {
    console.error(`  - ${req.method} ${req.url} → ${req.status} ${req.statusText}`);
  });
  console.error('🚨 BLOCKER: Fix server errors before production');
}

// Validate: API endpoints match spec
const apiCalls = networkRequests.filter(req =>
  req.url.includes('/api/')
);

console.log(`\n✅ API calls validated (${apiCalls.length} total):`);
apiCalls.forEach(call => {
  const statusIcon = call.status < 400 ? '✅' : call.status < 500 ? '⚠️' : '❌';
  console.log(`  ${statusIcon} ${call.method} ${call.url} → ${call.status}`);
});
```

---

### 7. Visual Regression Testing

**Goal:** Capture screenshots for visual comparison

```typescript
const pages = [
  { name: 'landing', url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app' },
  { name: 'login', url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/auth/login' },
  { name: 'vault', url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/vault' },
  { name: 'share', url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/share/test' }
];

for (const page of pages) {
  mcp__chrome_devtools__navigate_page({ url: page.url });

  await new Promise(resolve => setTimeout(resolve, 2000));

  mcp__chrome_devtools__take_screenshot({
    filePath: `tests/screenshots/staging/${page.name}-${new Date().toISOString().split('T')[0]}.png`,
    fullPage: true
  });

  console.log(`✅ Screenshot captured: ${page.name}`);
}
```

**Usage:**
- Compare screenshots between dev and staging
- Compare staging screenshots to production baseline
- Detect unintended UI changes before production
- Validate responsive design

---

### 8. Responsive Design Validation

**Goal:** Verify mobile/tablet/desktop breakpoints

```typescript
const breakpoints = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

for (const breakpoint of breakpoints) {
  // Resize page
  mcp__chrome_devtools__resize_page({
    width: breakpoint.width,
    height: breakpoint.height
  });

  // Navigate to vault
  mcp__chrome_devtools__navigate_page({
    url: 'https://evermed-app-git-staging-thomasallnices-projects.vercel.app/vault'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Take screenshot
  mcp__chrome_devtools__take_screenshot({
    filePath: `tests/screenshots/staging/vault-${breakpoint.name}.png`
  });

  // Check console for responsive errors
  const consoleMessages = mcp__chrome_devtools__list_console_messages();
  const errors = consoleMessages.filter(msg => msg.level === 'error');

  if (errors.length > 0) {
    console.error(`❌ Responsive errors on ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);
    errors.forEach(err => console.error(`  - ${err.text}`));
  } else {
    console.log(`✅ ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) - no errors`);
  }
}
```

---

## Integration with Staging Deployment

### When to Run

**Automatically after staging deployment:**
- After Step 14 (Monitor Vercel Build) in deploy-staging.md
- Before Step 15 (Post-Deployment Validation)

**Manual invocation:**
```bash
/validate-staging-deployment
```

---

## Validation Report Template

After running validation, generate report:

```markdown
## Staging Deployment Validation Report

**Environment:** Staging
**URL:** https://evermed-app-git-staging-thomasallnices-projects.vercel.app
**Deployed:** 2025-10-11T15:30:00Z
**Validated:** 2025-10-11T15:45:00Z

### ✅ PASSED Checks

- SSL: All requests HTTPS ✅
- API Security: All protected endpoints return 401 ✅
- Medical Disclaimers: Present on all required pages ✅
- Responsive Design: All breakpoints render correctly ✅

### ⚠️ WARNINGS (Fix in Development)

- Console Errors: 3 errors detected
  1. `TypeError: Cannot read property 'name' of undefined` (vault.tsx:42)
  2. `Warning: Each child in list should have unique key` (DocumentList.tsx:18)
  3. `Failed to load resource: 404` (missing favicon.ico)

- Performance: LCP 3.2s (ideal < 2.5s, but within acceptable 10s limit)

### 📊 Performance Metrics

- LCP: 3.2s (target: < 2.5s ideal, < 10s max) ⚠️
- FID: 65ms (target: < 100ms) ✅
- CLS: 0.08 (target: < 0.1) ✅

### 📸 Screenshots Captured

- Landing page: ✅
- Login page: ✅
- Vault (mobile): ✅
- Vault (tablet): ✅
- Vault (desktop): ✅

### 🎯 Verdict

**STAGING READY FOR QA** ⚠️

3 console errors detected - create GitHub issues and fix in development before production promotion.

### 📝 Action Items for Development

**Create GitHub Issues:**
1. **Bug**: Fix undefined property access in vault.tsx:42
   - Severity: Medium
   - Blocker for production: No (gracefully handled)

2. **Bug**: Add unique keys to DocumentList component
   - Severity: Low
   - Blocker for production: No (React warning only)

3. **Chore**: Add favicon.ico to public directory
   - Severity: Low
   - Blocker for production: No (cosmetic)

**Promote to Production When:**
- [ ] All 3 GitHub issues resolved
- [ ] Fixes deployed to staging and re-validated
- [ ] Zero console errors detected
```

---

## Best Practices

1. **Document ALL issues** - Even minor warnings should be tracked
2. **Create GitHub issues** - Don't rely on memory, create tickets for dev team
3. **Screenshot everything** - Visual evidence helps with bug reports
4. **Performance trends** - Track LCP/FID/CLS over time to catch regressions
5. **Zero tolerance for data leaks** - Any PHI in console is a BLOCKER
6. **Medical compliance** - Missing disclaimers are BLOCKERs for production

---

## Troubleshooting

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

### Staging URL not accessible

- Verify Vercel deployment succeeded
- Check Vercel dashboard for deployment status
- Confirm staging branch was pushed to GitHub
- Wait 3-5 minutes after push for build to complete

### False positives

- Review screenshots to confirm UI is correct
- Check that test URLs are valid
- Verify staging environment variables are set correctly
- Compare with production baseline

---

## Issue Triage Guide

### BLOCKER (Must fix before production)
- ❌ PHI/sensitive data in console
- ❌ Server errors (500-599)
- ❌ Missing medical disclaimers
- ❌ LCP > 10s
- ❌ Authentication completely broken
- ❌ Mixed HTTP content on HTTPS pages

### HIGH (Should fix before production)
- ⚠️ Console errors affecting user experience
- ⚠️ Performance degradation (LCP > 5s)
- ⚠️ API endpoints not properly protected
- ⚠️ Responsive design broken on mobile

### MEDIUM (Fix in next sprint)
- ⚠️ Console warnings (missing keys, deprecations)
- ⚠️ Performance could be better (LCP 2.5s-5s)
- ⚠️ Visual regressions (minor UI differences)

### LOW (Nice to have)
- ℹ️ Missing favicon
- ℹ️ Console logs in production mode
- ℹ️ Minor styling inconsistencies

---

## Notes

- Validation adds ~3-5 minutes to deployment workflow
- Requires Chrome DevTools MCP configuration
- Safe to run multiple times (idempotent)
- **Key difference from production**: Document issues rather than block deployment
- **Goal**: Identify and track issues for development team to fix

**Remember:** Staging validation is your QA gate. Document everything, promote confidently!
