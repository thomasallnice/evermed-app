#!/usr/bin/env node

/**
 * Automated Deployment Validation Script
 *
 * Validates EverMed deployment using Puppeteer for comprehensive testing:
 * - Critical page accessibility
 * - Console error detection (ZERO TOLERANCE)
 * - Performance metrics (p95 < 10s requirement)
 * - Mobile responsiveness
 * - Network/API health
 * - Screenshot capture for visual verification
 *
 * Usage:
 *   node scripts/validate-deployment.js [deployment-url] [bypass-token]
 *
 * Example:
 *   node scripts/validate-deployment.js \
 *     https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app \
 *     0ggTnEkxNX4vk7a11q8VfXkj9hG7ksKl
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const DEPLOYMENT_URL = process.argv[2] || 'https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app';
const BYPASS_TOKEN = process.argv[3] || '0ggTnEkxNX4vk7a11q8VfXkj9hG7ksKl';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tests', 'screenshots', 'deployment-verification', TIMESTAMP);
const PERFORMANCE_THRESHOLD_MS = 10000; // 10s per PRD NFR requirements

// Critical pages to validate
const CRITICAL_PAGES = [
  { name: 'login', path: '/auth/login', description: 'Login page' },
  { name: 'onboarding', path: '/auth/onboarding', description: 'Onboarding wizard' },
  { name: 'vault', path: '/', description: 'Main vault/dashboard' },
  { name: 'upload', path: '/upload', description: 'Document upload page' },
  { name: 'profile', path: '/profile', description: 'User profile page' },
  { name: 'chat', path: '/chat', description: 'AI chat interface' },
  { name: 'packs', path: '/packs', description: 'Share packs management' },
];

// Viewport configurations for responsive testing
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2 },
  { name: 'tablet', width: 768, height: 1024, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1920, height: 1080, deviceScaleFactor: 1 },
];

// Validation results
const results = {
  timestamp: new Date().toISOString(),
  deploymentUrl: DEPLOYMENT_URL,
  bypassTokenUsed: true,
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
  },
  consoleErrors: [],
  performanceMetrics: {},
  screenshotPaths: [],
  mobileResponsiveness: {},
  apiHealth: {
    total500Errors: 0,
    brokenEndpoints: [],
    networkIssues: [],
  },
  criticalBlockers: {
    databaseUrl: 'UNKNOWN',
    storageBucket: 'UNKNOWN',
  },
  verdict: 'UNKNOWN',
  blockers: [],
};

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

console.log('🚀 EverMed Deployment Validation');
console.log('================================');
console.log(`Deployment URL: ${DEPLOYMENT_URL}`);
console.log(`Bypass Token: ${BYPASS_TOKEN ? 'ENABLED' : 'DISABLED'}`);
console.log(`Screenshot Directory: ${SCREENSHOT_DIR}`);
console.log('');

/**
 * Add bypass token to URL
 */
function addBypassToken(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}__prerender-bypass=${BYPASS_TOKEN}`;
}

/**
 * Capture screenshot with descriptive filename
 */
async function captureScreenshot(page, name, viewport = 'desktop') {
  const filename = `${name}-${viewport}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  results.screenshotPaths.push(filepath);
  console.log(`  📸 Screenshot saved: ${filename}`);
  return filepath;
}

/**
 * Validate a single page
 */
async function validatePage(browser, pageConfig, viewport) {
  const page = await browser.newPage();
  const pageName = pageConfig.name;
  const pageUrl = addBypassToken(`${DEPLOYMENT_URL}${pageConfig.path}`);

  console.log(`\n📄 Validating: ${pageConfig.description} (${viewport.name})`);
  console.log(`   URL: ${pageUrl}`);

  // Set viewport
  await page.setViewport(viewport);

  // Collect console messages
  const consoleMessages = [];
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push({ type, text, page: pageName });

    if (type === 'error' || type === 'warning') {
      console.log(`  ⚠️  Console ${type}: ${text}`);
    }
  });

  // Collect network requests
  const networkRequests = [];
  page.on('response', (response) => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
    });
  });

  try {
    // Start performance measurement
    const startTime = Date.now();

    // Navigate to page
    const response = await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const loadTime = Date.now() - startTime;

    // Check HTTP status
    if (!response.ok()) {
      console.log(`  ❌ HTTP Error: ${response.status()} ${response.statusText()}`);
      results.summary.failed++;
      results.blockers.push(`${pageName}: HTTP ${response.status()}`);
      await page.close();
      return;
    }

    // Capture screenshot
    await captureScreenshot(page, pageName, viewport.name);

    // Check for console errors (ZERO TOLERANCE)
    const errors = consoleMessages.filter((msg) => msg.type === 'error');
    if (errors.length > 0) {
      console.log(`  ❌ BLOCKER: ${errors.length} console error(s) detected`);
      errors.forEach((err) => {
        console.log(`     - ${err.text}`);
        results.consoleErrors.push({
          page: pageName,
          viewport: viewport.name,
          error: err.text,
        });
      });
      results.summary.failed++;
      results.blockers.push(`${pageName}: ${errors.length} console error(s)`);
    } else {
      console.log(`  ✅ Zero console errors`);
      results.summary.passed++;
    }

    // Check for warnings
    const warnings = consoleMessages.filter((msg) => msg.type === 'warning');
    if (warnings.length > 0) {
      console.log(`  ⚠️  ${warnings.length} console warning(s)`);
      results.summary.warnings += warnings.length;
    }

    // Check for specific critical errors
    const bucketNotFoundError = consoleMessages.some(
      (msg) => msg.text.includes('Bucket not found') || msg.text.includes('bucket not found')
    );
    if (bucketNotFoundError) {
      console.log(`  ❌ CRITICAL: "Bucket not found" error detected`);
      results.criticalBlockers.storageBucket = 'MISSING';
      results.blockers.push(`${pageName}: Storage bucket missing`);
    }

    const databaseError = consoleMessages.some(
      (msg) =>
        msg.text.includes('DATABASE_URL') ||
        msg.text.includes('Prisma') ||
        msg.text.includes('database connection')
    );
    if (databaseError) {
      console.log(`  ❌ CRITICAL: Database connection error detected`);
      results.criticalBlockers.databaseUrl = 'BROKEN';
      results.blockers.push(`${pageName}: Database connection issue`);
    }

    // Performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = window.performance.timing;
      const perfMetrics = window.performance.getEntriesByType('navigation')[0];
      return {
        loadTime: perfData.loadEventEnd - perfData.navigationStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        firstPaint: perfMetrics ? perfMetrics.responseStart : null,
      };
    });

    console.log(`  ⏱️  Load time: ${loadTime}ms`);
    results.performanceMetrics[pageName] = {
      ...performanceMetrics,
      measuredLoadTime: loadTime,
      viewport: viewport.name,
    };

    if (loadTime > PERFORMANCE_THRESHOLD_MS) {
      console.log(`  ⚠️  WARNING: Load time exceeds ${PERFORMANCE_THRESHOLD_MS}ms threshold`);
      results.summary.warnings++;
    }

    // Check for 500 errors in network requests
    const serverErrors = networkRequests.filter((req) => req.status >= 500);
    if (serverErrors.length > 0) {
      console.log(`  ❌ BLOCKER: ${serverErrors.length} 500-level error(s) detected`);
      serverErrors.forEach((err) => {
        console.log(`     - ${err.status} ${err.url}`);
        results.apiHealth.brokenEndpoints.push({
          page: pageName,
          status: err.status,
          url: err.url,
        });
      });
      results.apiHealth.total500Errors += serverErrors.length;
      results.blockers.push(`${pageName}: ${serverErrors.length} API 500 error(s)`);
    }

    // Mobile responsiveness checks
    if (viewport.name === 'mobile') {
      // Check if hamburger menu is visible
      const hamburgerVisible = await page.evaluate(() => {
        const menu = document.querySelector('[aria-label*="menu"]') ||
                     document.querySelector('button[class*="hamburger"]') ||
                     document.querySelector('button svg[class*="menu"]');
        return menu ? window.getComputedStyle(menu).display !== 'none' : false;
      });

      results.mobileResponsiveness[pageName] = {
        hamburgerMenuVisible: hamburgerVisible,
      };

      if (hamburgerVisible) {
        console.log(`  ✅ Mobile: Hamburger menu visible`);
      } else {
        console.log(`  ⚠️  Mobile: Hamburger menu not detected (may not be required on this page)`);
      }
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.summary.failed++;
    results.blockers.push(`${pageName}: ${error.message}`);
  } finally {
    await page.close();
  }
}

/**
 * Main validation workflow
 */
async function runValidation() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Validate each critical page at each viewport
    for (const viewport of VIEWPORTS) {
      console.log(`\n🔍 Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      for (const page of CRITICAL_PAGES) {
        await validatePage(browser, page, viewport);
      }
    }

    // Determine verdict
    if (results.blockers.length === 0 && results.consoleErrors.length === 0) {
      results.verdict = 'PASS - READY FOR PRODUCTION';
      results.criticalBlockers.databaseUrl = results.criticalBlockers.databaseUrl === 'BROKEN' ? 'BROKEN' : 'WORKING';
      results.criticalBlockers.storageBucket = results.criticalBlockers.storageBucket === 'MISSING' ? 'MISSING' : 'EXISTS';
    } else {
      results.verdict = 'BLOCKED - CANNOT PROMOTE TO PRODUCTION';
    }

    // Generate report
    generateReport();

  } finally {
    await browser.close();
  }
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   DEPLOYMENT VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Date: ${results.timestamp}`);
  console.log(`Deployment URL: ${results.deploymentUrl}`);
  console.log(`Bypass Token Used: ${results.bypassTokenUsed ? 'Yes' : 'No'}`);
  console.log('');
  console.log('SUMMARY');
  console.log('-------');
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log('');

  console.log('CONSOLE ERRORS (ZERO TOLERANCE)');
  console.log('--------------------------------');
  if (results.consoleErrors.length === 0) {
    console.log('✅ NONE FOUND - All pages passed console error check');
  } else {
    console.log(`❌ BLOCKER: ${results.consoleErrors.length} console error(s) detected:`);
    results.consoleErrors.forEach((err) => {
      console.log(`  - Page: ${err.page} (${err.viewport})`);
      console.log(`    Error: ${err.error}`);
    });
  }
  console.log('');

  console.log('PERFORMANCE METRICS');
  console.log('-------------------');
  Object.entries(results.performanceMetrics).forEach(([page, metrics]) => {
    const loadTime = metrics.measuredLoadTime;
    const status = loadTime < PERFORMANCE_THRESHOLD_MS ? '✅' : '⚠️';
    console.log(`${status} ${page} (${metrics.viewport}): ${loadTime}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);
  });
  console.log('');

  console.log('CRITICAL BLOCKER VERIFICATION');
  console.log('------------------------------');
  console.log(`DATABASE_URL: ${results.criticalBlockers.databaseUrl}`);
  console.log(`Storage Bucket: ${results.criticalBlockers.storageBucket}`);
  console.log('');

  console.log('SCREENSHOTS');
  console.log('-----------');
  console.log(`Total screenshots captured: ${results.screenshotPaths.length}`);
  console.log(`Screenshot directory: ${SCREENSHOT_DIR}`);
  console.log('');

  console.log('MOBILE RESPONSIVENESS');
  console.log('---------------------');
  if (Object.keys(results.mobileResponsiveness).length > 0) {
    Object.entries(results.mobileResponsiveness).forEach(([page, metrics]) => {
      console.log(`${page}: Hamburger menu ${metrics.hamburgerMenuVisible ? 'visible ✅' : 'not detected ⚠️'}`);
    });
  } else {
    console.log('No mobile-specific checks performed');
  }
  console.log('');

  console.log('API HEALTH');
  console.log('----------');
  console.log(`500 Errors: ${results.apiHealth.total500Errors}`);
  if (results.apiHealth.brokenEndpoints.length > 0) {
    console.log('Broken Endpoints:');
    results.apiHealth.brokenEndpoints.forEach((endpoint) => {
      console.log(`  - ${endpoint.page}: ${endpoint.status} ${endpoint.url}`);
    });
  } else {
    console.log('Broken Endpoints: NONE ✅');
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`VERDICT: ${results.verdict}`);
  console.log('═══════════════════════════════════════════════════════════');

  if (results.blockers.length > 0) {
    console.log('\nBLOCKERS (MUST BE RESOLVED):');
    results.blockers.forEach((blocker, i) => {
      console.log(`${i + 1}. ${blocker}`);
    });
  } else {
    console.log('\n✅ All validation checks passed. Deployment is ready for production.');
  }
  console.log('');

  // Save report to file
  const reportPath = path.join(SCREENSHOT_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Full report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(results.blockers.length > 0 ? 1 : 0);
}

// Run validation
runValidation().catch((error) => {
  console.error('❌ Validation failed with error:', error);
  process.exit(1);
});
