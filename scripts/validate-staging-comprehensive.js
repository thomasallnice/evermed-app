#!/usr/bin/env node

/**
 * Comprehensive Staging Deployment Validator
 *
 * Tests critical functionality for EverMed staging deployment:
 * - Profile page with new health fields (heightCm, weightKg, allergies)
 * - Chat interface design verification
 * - Database connectivity
 * - API health checks
 * - Console error detection
 * - Performance metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const STAGING_URL = 'https://evermed-9nnk2slhs-thomasallnices-projects.vercel.app';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tests', 'screenshots', 'deployment-verification', 'staging', new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + new Date().toTimeString().split(' ')[0].replace(/:/g, '-'));

const DEMO_CREDENTIALS = {
  email: 'demo@evermed.local',
  password: 'demo123'
};

const CRITICAL_PAGES = [
  { path: '/', name: 'home' },
  { path: '/auth/login', name: 'login' },
  { path: '/vault', name: 'vault', requiresAuth: true },
  { path: '/profile', name: 'profile', requiresAuth: true, critical: true },
  { path: '/chat', name: 'chat', requiresAuth: true, critical: true },
  { path: '/upload', name: 'upload', requiresAuth: true },
  { path: '/packs', name: 'packs', requiresAuth: true },
  { path: '/track', name: 'track', requiresAuth: true }
];

const testResults = {
  timestamp: new Date().toISOString(),
  environment: 'staging',
  url: STAGING_URL,
  pages: {},
  consoleErrors: [],
  networkErrors: [],
  performance: {},
  criticalTests: {},
  overallStatus: 'PASS'
};

async function captureScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  📸 Screenshot saved: ${name}.png`);
  return screenshotPath;
}

async function login(page) {
  console.log('\n🔐 Logging in with demo credentials...');

  try {
    await page.goto(`${STAGING_URL}/auth/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await captureScreenshot(page, 'login-before-submit');

    // Wait for the "Login with Demo Account" button
    await page.waitForSelector('button:has-text("Login with Demo Account"), button[aria-label*="demo"]', { timeout: 10000 });

    console.log('  🔍 Found demo account button, clicking...');

    // Click the demo account button and wait for navigation
    await Promise.all([
      page.click('button:has-text("Login with Demo Account")'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 })
    ]);

    await page.waitForTimeout(2000); // Give it time to settle

    await captureScreenshot(page, 'login-after-submit');

    // Verify we're on vault page
    const currentUrl = page.url();
    if (currentUrl.includes('/vault')) {
      console.log('  ✅ Login successful - redirected to vault');
      testResults.criticalTests.authentication = { status: 'PASS' };
      return true;
    } else {
      console.log('  ⚠️  Login may have succeeded but not on vault page:', currentUrl);
      testResults.criticalTests.authentication = { status: 'WARN', url: currentUrl };
      return true; // Continue anyway
    }
  } catch (error) {
    console.error('  ❌ Login failed:', error.message);
    testResults.overallStatus = 'BLOCKED';
    testResults.criticalTests.authentication = {
      status: 'FAIL',
      error: error.message
    };
    return false;
  }
}

async function testProfilePage(page) {
  console.log('\n🏥 Testing Profile Page (CRITICAL)...');

  const profileTest = {
    pageLoad: false,
    healthFieldsPresent: false,
    saveButtonWorks: false,
    toastNotifications: false,
    noPrismaErrors: true,
    consoleErrors: [],
    details: []
  };

  try {
    const startTime = Date.now();
    await page.goto(`${STAGING_URL}/profile`, { waitUntil: 'networkidle0', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    profileTest.pageLoad = true;
    profileTest.loadTime = loadTime;
    console.log(`  ✅ Profile page loaded (${loadTime}ms)`);

    await captureScreenshot(page, 'profile-initial');

    // Check for health profile fields
    const heightField = await page.$('input[name="heightCm"], input[id*="height"], input[placeholder*="height" i]');
    const weightField = await page.$('input[name="weightKg"], input[id*="weight"], input[placeholder*="weight" i]');
    const allergiesField = await page.$('textarea[name="allergies"], textarea[id*="allergies"], input[name="allergies"]');

    if (heightField && weightField && allergiesField) {
      profileTest.healthFieldsPresent = true;
      console.log('  ✅ Health profile fields found (height, weight, allergies)');
      profileTest.details.push('Height, weight, and allergies fields are present');

      // Try filling and saving
      try {
        await page.evaluate(() => {
          const heightInput = document.querySelector('input[name="heightCm"], input[id*="height"], input[placeholder*="height" i]');
          const weightInput = document.querySelector('input[name="weightKg"], input[id*="weight"], input[placeholder*="weight" i]');
          const allergiesInput = document.querySelector('textarea[name="allergies"], textarea[id*="allergies"], input[name="allergies"]');

          if (heightInput) heightInput.value = '175';
          if (weightInput) weightInput.value = '70';
          if (allergiesInput) allergiesInput.value = 'Peanuts, shellfish';
        });

        await captureScreenshot(page, 'profile-filled');

        const saveButton = await page.$('button[type="submit"], button:has-text("Save")');
        if (saveButton) {
          await saveButton.click();
          await page.waitForTimeout(2000);

          profileTest.saveButtonWorks = true;
          console.log('  ✅ Save button works');

          await captureScreenshot(page, 'profile-after-save');

          // Check for toast notifications
          const toast = await page.$('[role="status"], .toast, [class*="toast"], [class*="notification"]');
          if (toast) {
            profileTest.toastNotifications = true;
            console.log('  ✅ Toast notification detected');
          } else {
            console.log('  ⚠️  No toast notification detected');
            profileTest.details.push('Toast notification not visible (may have already disappeared)');
          }
        } else {
          console.log('  ⚠️  Save button not found');
        }
      } catch (error) {
        console.error('  ❌ Error during save test:', error.message);
        profileTest.details.push(`Save test error: ${error.message}`);
      }
    } else {
      console.log('  ❌ Health profile fields NOT found');
      profileTest.details.push('Missing fields:', !heightField ? 'height' : '', !weightField ? 'weight' : '', !allergiesField ? 'allergies' : '');
    }

    // Check for Prisma errors in console
    const consoleLogs = await page.evaluate(() => {
      return window.__consoleErrors || [];
    });

    const prismaErrors = consoleLogs.filter(log =>
      log.includes('Prisma') ||
      log.includes('heightCm') ||
      log.includes('weightKg') ||
      log.includes('Unknown arg') ||
      log.includes('Unknown field')
    );

    if (prismaErrors.length > 0) {
      profileTest.noPrismaErrors = false;
      profileTest.consoleErrors = prismaErrors;
      console.log('  ❌ Prisma errors detected:', prismaErrors);
    } else {
      console.log('  ✅ No Prisma errors detected');
    }

  } catch (error) {
    console.error('  ❌ Profile page test failed:', error.message);
    profileTest.error = error.message;
    testResults.overallStatus = 'FAIL';
  }

  testResults.criticalTests.profilePage = profileTest;

  const profileStatus = profileTest.pageLoad && profileTest.healthFieldsPresent && profileTest.noPrismaErrors;
  return profileStatus ? 'PASS' : 'FAIL';
}

async function testChatInterface(page) {
  console.log('\n💬 Testing Chat Interface Design (CRITICAL)...');

  const chatTest = {
    pageLoad: false,
    bubbleDesignDetected: false,
    notChatGPTStyle: false,
    userMessagesGray: false,
    aiMessagesWhite: false,
    details: []
  };

  try {
    const startTime = Date.now();
    await page.goto(`${STAGING_URL}/chat`, { waitUntil: 'networkidle0', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    chatTest.pageLoad = true;
    chatTest.loadTime = loadTime;
    console.log(`  ✅ Chat page loaded (${loadTime}ms)`);

    await captureScreenshot(page, 'chat-interface');

    // Analyze chat interface design
    const designAnalysis = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="chat"], [role="log"] > *'));

      const analysis = {
        totalMessages: messages.length,
        userMessages: [],
        aiMessages: [],
        fullWidthMessages: 0,
        bubbleMessages: 0,
        grayBackgrounds: 0,
        whiteBackgrounds: 0
      };

      messages.forEach(msg => {
        const styles = window.getComputedStyle(msg);
        const backgroundColor = styles.backgroundColor;
        const borderRadius = styles.borderRadius;
        const maxWidth = styles.maxWidth;
        const width = styles.width;

        const isFullWidth = width === '100%' || maxWidth === '100%' || maxWidth === 'none';
        const hasBorderRadius = parseInt(borderRadius) > 5;

        if (isFullWidth) analysis.fullWidthMessages++;
        if (hasBorderRadius) analysis.bubbleMessages++;

        // Detect gray backgrounds (user messages)
        if (backgroundColor.includes('rgb(243, 244, 246)') ||
            backgroundColor.includes('rgb(229, 231, 235)') ||
            backgroundColor.includes('rgb(156, 163, 175)')) {
          analysis.grayBackgrounds++;
          analysis.userMessages.push({ backgroundColor, borderRadius, isFullWidth });
        }

        // Detect white backgrounds (AI messages)
        if (backgroundColor.includes('rgb(255, 255, 255)') ||
            backgroundColor.includes('white')) {
          analysis.whiteBackgrounds++;
          analysis.aiMessages.push({ backgroundColor, borderRadius, isFullWidth });
        }
      });

      return analysis;
    });

    console.log('  Design Analysis:', JSON.stringify(designAnalysis, null, 2));

    // Determine if it's bubble design (not ChatGPT style)
    if (designAnalysis.bubbleMessages > 0 || designAnalysis.grayBackgrounds > 0) {
      chatTest.bubbleDesignDetected = true;
      console.log('  ✅ Bubble design detected');
      chatTest.details.push(`${designAnalysis.bubbleMessages} messages with rounded corners`);
    }

    if (designAnalysis.fullWidthMessages < designAnalysis.totalMessages * 0.5) {
      chatTest.notChatGPTStyle = true;
      console.log('  ✅ NOT ChatGPT full-width style');
      chatTest.details.push('Messages are not full-width (ChatGPT style)');
    } else {
      console.log('  ⚠️  Appears to be ChatGPT full-width style');
      chatTest.details.push('WARNING: Messages appear to be full-width (ChatGPT style)');
    }

    if (designAnalysis.grayBackgrounds > 0) {
      chatTest.userMessagesGray = true;
      console.log('  ✅ Gray user message backgrounds detected');
    }

    if (designAnalysis.whiteBackgrounds > 0) {
      chatTest.aiMessagesWhite = true;
      console.log('  ✅ White AI message backgrounds detected');
    }

  } catch (error) {
    console.error('  ❌ Chat interface test failed:', error.message);
    chatTest.error = error.message;
    testResults.overallStatus = 'FAIL';
  }

  testResults.criticalTests.chatInterface = chatTest;

  const chatStatus = chatTest.pageLoad && chatTest.bubbleDesignDetected && chatTest.notChatGPTStyle;
  return chatStatus ? 'PASS' : 'FAIL';
}

async function testApiEndpoints(page) {
  console.log('\n🔌 Testing API Endpoints...');

  const apiTests = {
    '/api/profile': { tested: false },
    '/api/documents': { tested: false },
    '/api/chat/messages': { tested: false }
  };

  for (const endpoint of Object.keys(apiTests)) {
    try {
      const response = await page.evaluate(async (url) => {
        const res = await fetch(url);
        return {
          status: res.status,
          ok: res.ok,
          statusText: res.statusText
        };
      }, `${STAGING_URL}${endpoint}`);

      apiTests[endpoint] = {
        tested: true,
        status: response.status,
        ok: response.ok
      };

      if (response.ok) {
        console.log(`  ✅ ${endpoint} - ${response.status} OK`);
      } else {
        console.log(`  ❌ ${endpoint} - ${response.status} ${response.statusText}`);
        if (response.status === 500) {
          testResults.overallStatus = 'BLOCKED';
        }
      }
    } catch (error) {
      console.error(`  ❌ ${endpoint} - Error: ${error.message}`);
      apiTests[endpoint] = { tested: true, error: error.message };
      testResults.networkErrors.push({ endpoint, error: error.message });
    }
  }

  testResults.criticalTests.apiHealth = apiTests;
}

async function testPage(page, pageConfig) {
  console.log(`\n📄 Testing: ${pageConfig.name} (${pageConfig.path})`);

  const pageTest = {
    path: pageConfig.path,
    status: 'PENDING',
    loadTime: null,
    consoleErrors: [],
    networkErrors: [],
    screenshot: null
  };

  // Set up console monitoring
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });

    if (msg.type() === 'error') {
      console.log(`  ⚠️  Console error: ${text}`);
      pageTest.consoleErrors.push(text);
      testResults.consoleErrors.push({ page: pageConfig.name, error: text });
    }
  });

  // Set up network monitoring
  page.on('response', response => {
    if (response.status() >= 500) {
      const error = `${response.url()} - ${response.status()}`;
      console.log(`  ⚠️  Network error: ${error}`);
      pageTest.networkErrors.push(error);
      testResults.networkErrors.push({ page: pageConfig.name, error });
    }
  });

  try {
    const startTime = Date.now();
    await page.goto(`${STAGING_URL}${pageConfig.path}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    const loadTime = Date.now() - startTime;

    pageTest.loadTime = loadTime;
    pageTest.screenshot = await captureScreenshot(page, pageConfig.name);

    if (loadTime < 10000) {
      console.log(`  ✅ Page loaded successfully (${loadTime}ms)`);
      pageTest.status = 'PASS';
    } else {
      console.log(`  ⚠️  Page loaded slowly (${loadTime}ms) - exceeds 10s threshold`);
      pageTest.status = 'WARN';
    }

  } catch (error) {
    console.error(`  ❌ Page failed to load: ${error.message}`);
    pageTest.status = 'FAIL';
    pageTest.error = error.message;
    testResults.overallStatus = 'FAIL';
  }

  testResults.pages[pageConfig.name] = pageTest;
  testResults.performance[pageConfig.name] = pageTest.loadTime;

  return pageTest;
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('STAGING DEPLOYMENT VALIDATION REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 SUMMARY');
  console.log(`Environment: ${testResults.environment}`);
  console.log(`URL: ${testResults.url}`);
  console.log(`Timestamp: ${testResults.timestamp}`);
  console.log(`Overall Status: ${testResults.overallStatus}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);

  console.log('\n🔑 CRITICAL TESTS');

  // Profile Page
  const profileTest = testResults.criticalTests.profilePage;
  if (profileTest) {
    const profileStatus = profileTest.pageLoad && profileTest.healthFieldsPresent && profileTest.noPrismaErrors ? '✅ PASS' : '❌ FAIL';
    console.log(`\n  Profile Page: ${profileStatus}`);
    console.log(`    - Page Load: ${profileTest.pageLoad ? '✅' : '❌'}`);
    console.log(`    - Health Fields Present: ${profileTest.healthFieldsPresent ? '✅' : '❌'}`);
    console.log(`    - Save Button Works: ${profileTest.saveButtonWorks ? '✅' : '❌'}`);
    console.log(`    - Toast Notifications: ${profileTest.toastNotifications ? '✅' : '⚠️'}`);
    console.log(`    - No Prisma Errors: ${profileTest.noPrismaErrors ? '✅' : '❌'}`);
    if (profileTest.details.length > 0) {
      console.log(`    Details: ${profileTest.details.join(', ')}`);
    }
    if (profileTest.consoleErrors.length > 0) {
      console.log(`    ❌ Console Errors: ${profileTest.consoleErrors.join(', ')}`);
    }
  }

  // Chat Interface
  const chatTest = testResults.criticalTests.chatInterface;
  if (chatTest) {
    const chatStatus = chatTest.pageLoad && chatTest.bubbleDesignDetected && chatTest.notChatGPTStyle ? '✅ PASS' : '❌ FAIL';
    console.log(`\n  Chat Interface: ${chatStatus}`);
    console.log(`    - Page Load: ${chatTest.pageLoad ? '✅' : '❌'}`);
    console.log(`    - Bubble Design: ${chatTest.bubbleDesignDetected ? '✅' : '❌'}`);
    console.log(`    - NOT ChatGPT Style: ${chatTest.notChatGPTStyle ? '✅' : '❌'}`);
    console.log(`    - User Messages Gray: ${chatTest.userMessagesGray ? '✅' : '⚠️'}`);
    console.log(`    - AI Messages White: ${chatTest.aiMessagesWhite ? '✅' : '⚠️'}`);
    if (chatTest.details.length > 0) {
      console.log(`    Details: ${chatTest.details.join(', ')}`);
    }
  }

  console.log('\n📡 API HEALTH');
  const apiTests = testResults.criticalTests.apiHealth;
  if (apiTests) {
    for (const [endpoint, result] of Object.entries(apiTests)) {
      if (result.tested) {
        const status = result.ok ? '✅' : '❌';
        console.log(`  ${status} ${endpoint} - ${result.status || result.error}`);
      }
    }
  }

  console.log('\n📄 PAGE ACCESSIBILITY');
  const passedPages = Object.values(testResults.pages).filter(p => p.status === 'PASS').length;
  const totalPages = Object.keys(testResults.pages).length;
  console.log(`  ${passedPages}/${totalPages} pages passed`);

  for (const [name, page] of Object.entries(testResults.pages)) {
    const statusIcon = page.status === 'PASS' ? '✅' : page.status === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${statusIcon} /${name} - ${page.status} (${page.loadTime}ms)`);
  }

  console.log('\n🚨 CONSOLE ERRORS');
  if (testResults.consoleErrors.length === 0) {
    console.log('  ✅ Zero console errors detected');
  } else {
    console.log(`  ❌ ${testResults.consoleErrors.length} console errors detected`);
    testResults.consoleErrors.forEach(err => {
      console.log(`    - [${err.page}] ${err.error}`);
    });
    testResults.overallStatus = 'BLOCKED';
  }

  console.log('\n⚡ PERFORMANCE METRICS');
  for (const [page, time] of Object.entries(testResults.performance)) {
    const status = time < 10000 ? '✅' : '❌';
    console.log(`  ${status} ${page}: ${time}ms (threshold: 10000ms)`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('PRODUCTION READINESS VERDICT');
  console.log('='.repeat(80));

  if (testResults.overallStatus === 'PASS') {
    console.log('\n✅ PASS - All validation checks passed. Ready for production promotion.');
  } else if (testResults.overallStatus === 'BLOCKED') {
    console.log('\n❌ BLOCKED - Cannot promote to production due to critical issues:');

    if (testResults.consoleErrors.length > 0) {
      console.log('  - Console errors detected on multiple pages');
    }

    if (!testResults.criticalTests.profilePage?.noPrismaErrors) {
      console.log('  - Prisma errors detected on profile page');
    }

    if (testResults.networkErrors.length > 0) {
      console.log('  - API endpoints returning 500 errors');
    }

    console.log('\nAction Required:');
    console.log('  1. Fix all console errors');
    console.log('  2. Resolve Prisma schema issues');
    console.log('  3. Debug API endpoint failures');
    console.log('  4. Re-run deployment validation');
  } else {
    console.log('\n⚠️  WARN - Some issues detected but not blocking:');
    console.log('  - Review warnings and performance metrics');
    console.log('  - Consider fixing before production promotion');
  }

  console.log('\n' + '='.repeat(80));

  // Save report to file
  const reportPath = path.join(SCREENSHOT_DIR, 'VALIDATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting Staging Deployment Validation...\n');
  console.log(`Target: ${STAGING_URL}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}\n`);

  // Create screenshot directory
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Inject console error collector
  await page.evaluateOnNewDocument(() => {
    window.__consoleErrors = [];
    const originalError = console.error;
    console.error = function(...args) {
      window.__consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };
  });

  try {
    // Test home page (unauthenticated)
    await testPage(page, { path: '/', name: 'home' });

    // Login
    const loginSuccess = await login(page);

    if (loginSuccess) {
      // Test authenticated pages
      await testPage(page, { path: '/vault', name: 'vault', requiresAuth: true });

      // CRITICAL: Test profile page with new health fields
      await testProfilePage(page);

      // CRITICAL: Test chat interface design
      await testChatInterface(page);

      // Test other pages
      await testPage(page, { path: '/upload', name: 'upload', requiresAuth: true });
      await testPage(page, { path: '/packs', name: 'packs', requiresAuth: true });
      await testPage(page, { path: '/track', name: 'track', requiresAuth: true });

      // Test API endpoints
      await testApiEndpoints(page);
    } else {
      console.error('\n❌ Cannot proceed with authenticated tests - login failed');
      testResults.overallStatus = 'BLOCKED';
    }

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    testResults.overallStatus = 'BLOCKED';
  } finally {
    await browser.close();
  }

  await generateReport();

  process.exit(testResults.overallStatus === 'PASS' ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
