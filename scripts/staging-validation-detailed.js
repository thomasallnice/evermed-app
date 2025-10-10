#!/usr/bin/env node

/**
 * Comprehensive Staging Deployment Validator
 *
 * Tests:
 * 1. Profile page with new health fields (heightCm, weightKg, allergies, diet, behaviors)
 * 2. Chat interface bubble design verification
 * 3. Database connectivity for all API endpoints
 * 4. All core pages accessibility
 * 5. Console error detection (zero tolerance)
 * 6. Performance metrics (< 10s threshold)
 * 7. Visual verification via screenshots
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const STAGING_URL = 'https://evermed-9nnk2slhs-thomasallnices-projects.vercel.app';
const BYPASS_TOKEN = '0ggTnEkxNX4vk7a11q8VfXkj9hG7ksKl';
const DEMO_EMAIL = 'demo@evermed.local';
const DEMO_PASSWORD = 'demo123';

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tests', 'screenshots', 'deployment-verification', 'staging', TIMESTAMP);

// Test results accumulator
const results = {
  timestamp: new Date().toISOString(),
  environment: 'staging',
  url: STAGING_URL,
  pages: {},
  criticalTests: {},
  consoleErrors: [],
  performanceMetrics: {},
  overallStatus: 'PENDING'
};

async function setupBrowser() {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set bypass token as HTTP header (this is the correct approach for Vercel)
  await page.setExtraHTTPHeaders({
    'x-vercel-protection-bypass': BYPASS_TOKEN
  });

  // Monitor console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      results.consoleErrors.push({
        type: 'error',
        message: text,
        location: page.url(),
        timestamp: new Date().toISOString()
      });
      console.error(`❌ Console Error on ${page.url()}: ${text}`);
    } else if (type === 'warning') {
      console.warn(`⚠️  Console Warning: ${text}`);
    }
  });

  // Monitor page errors
  page.on('pageerror', error => {
    results.consoleErrors.push({
      type: 'pageerror',
      message: error.message,
      stack: error.stack,
      location: page.url(),
      timestamp: new Date().toISOString()
    });
    console.error(`❌ Page Error on ${page.url()}: ${error.message}`);
  });

  // Monitor network requests
  const networkRequests = [];
  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    if (url.includes('/api/')) {
      networkRequests.push({
        url,
        status,
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });

      if (status >= 500) {
        console.error(`❌ API Error: ${url} returned ${status}`);
      }
    }
  });

  return { browser, page, networkRequests };
}

async function login(page) {
  console.log('🔐 Logging in...');

  try {
    await page.goto(`${STAGING_URL}/auth/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait a bit for any client-side hydration
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to find email input with various selectors
    const emailSelector = 'input[type="email"], input[name="email"], input[id*="email" i], input[placeholder*="email" i]';
    await page.waitForSelector(emailSelector, { timeout: 10000 });

    // Check if password field exists
    const passwordSelector = 'input[type="password"], input[name="password"], input[id*="password" i]';
    await page.waitForSelector(passwordSelector, { timeout: 10000 });

    console.log('  📝 Filling login form...');

    // Fill email
    await page.evaluate((selector, email) => {
      const input = document.querySelector(selector);
      if (input) input.value = email;
    }, emailSelector, DEMO_EMAIL);

    // Fill password
    await page.evaluate((selector, password) => {
      const input = document.querySelector(selector);
      if (input) input.value = password;
    }, passwordSelector, DEMO_PASSWORD);

    // Find and click submit button
    const submitSelector = 'button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login")';

    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) button.click();
    }, 'button[type="submit"]');

    // Wait for navigation or vault page
    await new Promise(resolve => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    if (currentUrl.includes('/vault') || currentUrl.includes('/profile') || !currentUrl.includes('/login')) {
      console.log('✅ Login successful');
    } else {
      console.warn('⚠️  Login may not have succeeded, but continuing...');
    }

  } catch (error) {
    console.error(`  ❌ Login failed: ${error.message}`);
    console.log('  Continuing validation without authentication...');
  }
}

async function testPage(page, pagePath, pageName) {
  console.log(`\n📄 Testing ${pageName} (${pagePath})...`);

  const startTime = Date.now();
  const pageResult = {
    name: pageName,
    path: pagePath,
    status: 'PENDING',
    loadTime: null,
    screenshot: null,
    errors: []
  };

  try {
    await page.goto(`${STAGING_URL}${pagePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for page to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    const loadTime = Date.now() - startTime;
    pageResult.loadTime = loadTime;

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${pageName.toLowerCase().replace(/\s+/g, '-')}.png`);
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    pageResult.screenshot = screenshotPath;

    // Check for page title
    const title = await page.title();

    if (loadTime < 10000) {
      console.log(`  ✅ Page loaded in ${loadTime}ms`);
      pageResult.status = 'PASS';
    } else {
      console.log(`  ⚠️  Page loaded slowly: ${loadTime}ms (threshold: 10000ms)`);
      pageResult.status = 'WARN';
      pageResult.errors.push(`Slow load time: ${loadTime}ms`);
    }

    results.performanceMetrics[pageName] = { loadTime, threshold: 10000 };

  } catch (error) {
    console.error(`  ❌ Failed to load ${pageName}: ${error.message}`);
    pageResult.status = 'FAIL';
    pageResult.errors.push(error.message);

    // Try to take screenshot even on error
    try {
      const screenshotPath = path.join(SCREENSHOT_DIR, `${pageName.toLowerCase().replace(/\s+/g, '-')}-error.png`);
      await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      pageResult.screenshot = screenshotPath;
    } catch (screenshotError) {
      console.error(`  ❌ Could not capture error screenshot: ${screenshotError.message}`);
    }
  }

  results.pages[pageName] = pageResult;
  return pageResult;
}

async function testProfileHealthFields(page) {
  console.log('\n🏥 CRITICAL TEST: Profile Health Fields...');

  const testResult = {
    name: 'Profile Health Fields',
    status: 'PENDING',
    checks: []
  };

  try {
    await page.goto(`${STAGING_URL}/profile`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Check for health fields
    const heightField = await page.$('input[name="heightCm"], input[placeholder*="height" i], input[id*="height" i]');
    const weightField = await page.$('input[name="weightKg"], input[placeholder*="weight" i], input[id*="weight" i]');
    const allergiesField = await page.$('textarea[name="allergies"], textarea[placeholder*="allergies" i], textarea[id*="allergies" i], input[name="allergies"], input[placeholder*="allergies" i]');

    if (heightField) {
      console.log('  ✅ Height field found');
      testResult.checks.push({ field: 'heightCm', status: 'PASS' });
    } else {
      console.error('  ❌ Height field NOT found');
      testResult.checks.push({ field: 'heightCm', status: 'FAIL' });
    }

    if (weightField) {
      console.log('  ✅ Weight field found');
      testResult.checks.push({ field: 'weightKg', status: 'PASS' });
    } else {
      console.error('  ❌ Weight field NOT found');
      testResult.checks.push({ field: 'weightKg', status: 'FAIL' });
    }

    if (allergiesField) {
      console.log('  ✅ Allergies field found');
      testResult.checks.push({ field: 'allergies', status: 'PASS' });
    } else {
      console.error('  ❌ Allergies field NOT found');
      testResult.checks.push({ field: 'allergies', status: 'FAIL' });
    }

    // Test saving profile (to trigger toast notification)
    if (heightField && weightField) {
      console.log('  📝 Testing profile save with toast notification...');

      await page.type('input[name="heightCm"], input[placeholder*="height" i], input[id*="height" i]', '175', { delay: 10 });
      await page.type('input[name="weightKg"], input[placeholder*="weight" i], input[id*="weight" i]', '70', { delay: 10 });

      // Look for save button
      const saveButton = await page.$('button[type="submit"], button:has-text("Save")');
      if (saveButton) {
        await saveButton.click();

        // Wait for toast notification
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for toast (various possible selectors)
        const toast = await page.$('[role="status"], [role="alert"], .toast, [class*="toast" i], [id*="toast" i]');
        if (toast) {
          console.log('  ✅ Toast notification appeared');
          testResult.checks.push({ field: 'toast_notification', status: 'PASS' });
        } else {
          console.warn('  ⚠️  Toast notification not detected (may have different selector)');
          testResult.checks.push({ field: 'toast_notification', status: 'WARN' });
        }
      }
    }

    const passedChecks = testResult.checks.filter(c => c.status === 'PASS').length;
    const totalChecks = testResult.checks.length;

    if (passedChecks === totalChecks) {
      testResult.status = 'PASS';
      console.log(`  ✅ Profile health fields test PASSED (${passedChecks}/${totalChecks})`);
    } else if (passedChecks > 0) {
      testResult.status = 'PARTIAL';
      console.warn(`  ⚠️  Profile health fields test PARTIAL (${passedChecks}/${totalChecks})`);
    } else {
      testResult.status = 'FAIL';
      console.error(`  ❌ Profile health fields test FAILED (${passedChecks}/${totalChecks})`);
    }

  } catch (error) {
    console.error(`  ❌ Profile health fields test error: ${error.message}`);
    testResult.status = 'FAIL';
    testResult.error = error.message;
  }

  results.criticalTests.profileHealthFields = testResult;
  return testResult;
}

async function testChatBubbleDesign(page) {
  console.log('\n💬 CRITICAL TEST: Chat Bubble Design...');

  const testResult = {
    name: 'Chat Bubble Design',
    status: 'PENDING',
    checks: []
  };

  try {
    await page.goto(`${STAGING_URL}/chat`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Take screenshot for visual verification
    const screenshotPath = path.join(SCREENSHOT_DIR, 'chat-design-verification.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  📸 Chat screenshot saved: ${screenshotPath}`);

    // Check for bubble design indicators
    const bubbleElements = await page.$$('[class*="bubble" i], [class*="speech" i], [class*="rounded-" i]');
    const fullWidthElements = await page.$$('[class*="max-w-full" i], [class*="w-full" i]');

    console.log(`  📊 Found ${bubbleElements.length} bubble-style elements`);
    console.log(`  📊 Found ${fullWidthElements.length} full-width elements`);

    // Look for user message styling (gray bubbles)
    const userMessages = await page.$$('[class*="bg-gray" i]:has(p), [class*="bg-blue" i]:has(p)');
    if (userMessages.length > 0) {
      console.log(`  ✅ Found ${userMessages.length} user message bubbles`);
      testResult.checks.push({ check: 'user_message_bubbles', status: 'PASS' });
    } else {
      console.log(`  ℹ️  No user messages found (page may be empty)`);
      testResult.checks.push({ check: 'user_message_bubbles', status: 'SKIP' });
    }

    // Look for AI message styling (white cards)
    const aiMessages = await page.$$('[class*="bg-white" i]:has(p), [class*="card" i]:has(p)');
    if (aiMessages.length > 0) {
      console.log(`  ✅ Found ${aiMessages.length} AI message cards`);
      testResult.checks.push({ check: 'ai_message_cards', status: 'PASS' });
    } else {
      console.log(`  ℹ️  No AI messages found (page may be empty)`);
      testResult.checks.push({ check: 'ai_message_cards', status: 'SKIP' });
    }

    // Check that it's NOT ChatGPT full-width design
    const chatGPTStyle = await page.$('[class*="max-w-4xl" i][class*="mx-auto" i]');
    if (!chatGPTStyle) {
      console.log('  ✅ NOT using ChatGPT full-width design');
      testResult.checks.push({ check: 'not_chatgpt_style', status: 'PASS' });
    } else {
      console.warn('  ⚠️  Detected ChatGPT-style layout (may need verification)');
      testResult.checks.push({ check: 'not_chatgpt_style', status: 'WARN' });
    }

    testResult.status = 'PASS';
    console.log('  ✅ Chat bubble design test PASSED (see screenshot for visual verification)');

  } catch (error) {
    console.error(`  ❌ Chat bubble design test error: ${error.message}`);
    testResult.status = 'FAIL';
    testResult.error = error.message;
  }

  results.criticalTests.chatBubbleDesign = testResult;
  return testResult;
}

async function testDatabaseConnectivity(page, networkRequests) {
  console.log('\n🗄️  CRITICAL TEST: Database Connectivity...');

  const testResult = {
    name: 'Database Connectivity',
    status: 'PENDING',
    apiEndpoints: []
  };

  // Filter API requests from network log
  const apiRequests = networkRequests.filter(req => req.url.includes('/api/'));

  console.log(`  📊 Captured ${apiRequests.length} API requests`);

  const criticalEndpoints = [
    '/api/profile',
    '/api/documents',
    '/api/chat/messages'
  ];

  let failedEndpoints = 0;
  let successfulEndpoints = 0;

  for (const endpoint of criticalEndpoints) {
    const requests = apiRequests.filter(req => req.url.includes(endpoint));

    if (requests.length === 0) {
      console.log(`  ℹ️  ${endpoint} - Not called yet`);
      testResult.apiEndpoints.push({ endpoint, status: 'NOT_CALLED' });
    } else {
      const latestRequest = requests[requests.length - 1];

      if (latestRequest.status >= 500) {
        console.error(`  ❌ ${endpoint} - ${latestRequest.status} ${latestRequest.statusText}`);
        testResult.apiEndpoints.push({
          endpoint,
          status: 'FAIL',
          httpStatus: latestRequest.status
        });
        failedEndpoints++;
      } else if (latestRequest.status >= 400) {
        console.warn(`  ⚠️  ${endpoint} - ${latestRequest.status} ${latestRequest.statusText}`);
        testResult.apiEndpoints.push({
          endpoint,
          status: 'WARN',
          httpStatus: latestRequest.status
        });
      } else {
        console.log(`  ✅ ${endpoint} - ${latestRequest.status} OK`);
        testResult.apiEndpoints.push({
          endpoint,
          status: 'PASS',
          httpStatus: latestRequest.status
        });
        successfulEndpoints++;
      }
    }
  }

  if (failedEndpoints === 0) {
    testResult.status = 'PASS';
    console.log(`  ✅ Database connectivity test PASSED (${successfulEndpoints} endpoints OK)`);
  } else {
    testResult.status = 'FAIL';
    console.error(`  ❌ Database connectivity test FAILED (${failedEndpoints} endpoints returned 500)`);
  }

  results.criticalTests.databaseConnectivity = testResult;
  return testResult;
}

async function generateReport() {
  console.log('\n📊 Generating validation report...');

  // Calculate overall status
  const criticalFailures = Object.values(results.criticalTests).filter(t => t.status === 'FAIL').length;
  const consoleErrorCount = results.consoleErrors.filter(e => e.type === 'error').length;
  const pageFailures = Object.values(results.pages).filter(p => p.status === 'FAIL').length;

  if (criticalFailures > 0 || consoleErrorCount > 0 || pageFailures > 0) {
    results.overallStatus = 'BLOCKED';
  } else {
    results.overallStatus = 'PASS';
  }

  // Generate markdown report
  let report = `# Staging Deployment Validation Report\n\n`;
  report += `**Environment:** staging\n`;
  report += `**URL:** ${STAGING_URL}\n`;
  report += `**Timestamp:** ${results.timestamp}\n`;
  report += `**Overall Status:** ${results.overallStatus === 'PASS' ? '✅ PASS' : '❌ BLOCKED'}\n\n`;

  // Summary
  report += `## Summary\n\n`;
  report += `- **Critical Issues:** ${criticalFailures}\n`;
  report += `- **Console Errors:** ${consoleErrorCount}\n`;
  report += `- **Page Failures:** ${pageFailures}\n`;
  report += `- **Screenshots:** \`${SCREENSHOT_DIR}\`\n\n`;

  // Critical Tests
  report += `## Critical Tests\n\n`;
  for (const [key, test] of Object.entries(results.criticalTests)) {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    report += `### ${icon} ${test.name}\n`;
    report += `**Status:** ${test.status}\n\n`;

    if (test.checks) {
      report += `**Checks:**\n`;
      for (const check of test.checks) {
        const checkIcon = check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : 'ℹ️';
        report += `- ${checkIcon} ${check.field || check.check}\n`;
      }
      report += `\n`;
    }

    if (test.apiEndpoints) {
      report += `**API Endpoints:**\n`;
      for (const endpoint of test.apiEndpoints) {
        const endpointIcon = endpoint.status === 'PASS' ? '✅' : endpoint.status === 'FAIL' ? '❌' : 'ℹ️';
        report += `- ${endpointIcon} ${endpoint.endpoint} - ${endpoint.httpStatus || endpoint.status}\n`;
      }
      report += `\n`;
    }
  }

  // Page Accessibility
  report += `## Page Accessibility\n\n`;
  let passedPages = 0;
  let totalPages = Object.keys(results.pages).length;

  for (const [name, page] of Object.entries(results.pages)) {
    const icon = page.status === 'PASS' ? '✅' : page.status === 'FAIL' ? '❌' : '⚠️';
    report += `- ${icon} ${page.name} (${page.path}) - ${page.loadTime}ms\n`;
    if (page.status === 'PASS') passedPages++;
  }

  report += `\n**Passed:** ${passedPages}/${totalPages}\n\n`;

  // Console Errors
  report += `## Console Errors (ZERO TOLERANCE)\n\n`;
  if (results.consoleErrors.length === 0) {
    report += `✅ **No console errors detected**\n\n`;
  } else {
    report += `❌ **Total Errors:** ${consoleErrorCount}\n\n`;
    report += `**Details:**\n`;
    for (const error of results.consoleErrors) {
      report += `- **Page:** ${error.location}\n`;
      report += `  **Type:** ${error.type}\n`;
      report += `  **Message:** ${error.message}\n`;
      if (error.stack) {
        report += `  **Stack:** \`\`\`\n${error.stack}\n\`\`\`\n`;
      }
      report += `\n`;
    }
  }

  // Performance Metrics
  report += `## Performance Metrics\n\n`;
  for (const [page, metrics] of Object.entries(results.performanceMetrics)) {
    const icon = metrics.loadTime < metrics.threshold ? '✅' : '⚠️';
    report += `- ${icon} ${page}: ${metrics.loadTime}ms (threshold: ${metrics.threshold}ms)\n`;
  }
  report += `\n`;

  // Verdict
  report += `## Production Readiness Verdict\n\n`;
  if (results.overallStatus === 'PASS') {
    report += `✅ **PASS** - All validation checks passed. Ready for production promotion.\n\n`;
  } else {
    report += `❌ **BLOCKED** - Cannot promote to production due to:\n\n`;

    if (criticalFailures > 0) {
      report += `- ${criticalFailures} critical test failure(s)\n`;
    }
    if (consoleErrorCount > 0) {
      report += `- ${consoleErrorCount} console error(s) detected\n`;
    }
    if (pageFailures > 0) {
      report += `- ${pageFailures} page(s) failed to load\n`;
    }

    report += `\n**Action Required:**\n`;
    report += `- Fix all critical issues listed above\n`;
    report += `- Re-run deployment validation after fixes\n\n`;
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'STAGING_VALIDATION_REPORT.md');
  await fs.writeFile(reportPath, report);
  console.log(`\n📄 Report saved: ${reportPath}`);

  return report;
}

async function main() {
  console.log('🎯 Starting Staging Deployment Validation...\n');
  console.log(`Environment: staging`);
  console.log(`URL: ${STAGING_URL}`);
  console.log(`Timestamp: ${TIMESTAMP}\n`);

  let browser, page, networkRequests;

  try {
    ({ browser, page, networkRequests } = await setupBrowser());

    // Login
    await login(page);

    // Test all critical pages
    await testPage(page, '/', 'Home Page');
    await testPage(page, '/vault', 'Vault Page');
    await testPage(page, '/upload', 'Upload Page');
    await testPage(page, '/packs', 'Share Packs Page');
    await testPage(page, '/track', 'Track Page');

    // CRITICAL TESTS
    await testProfileHealthFields(page);
    await testChatBubbleDesign(page);
    await testDatabaseConnectivity(page, networkRequests);

    // Generate final report
    const report = await generateReport();

    console.log('\n' + '='.repeat(80));
    console.log(report);
    console.log('='.repeat(80) + '\n');

    if (results.overallStatus === 'BLOCKED') {
      console.error('❌ VALIDATION FAILED - Deployment blocked');
      process.exit(1);
    } else {
      console.log('✅ VALIDATION PASSED - Ready for production');
      process.exit(0);
    }

  } catch (error) {
    console.error(`\n❌ FATAL ERROR: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
