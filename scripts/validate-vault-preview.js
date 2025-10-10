#!/usr/bin/env node

/**
 * Vault Preview Validation Script
 *
 * Validates the DocumentPreview component on the vault page:
 * - Navigates to /vault after login
 * - Captures screenshots of document cards with previews
 * - Checks for console errors
 * - Validates image aspect ratios (16:9)
 * - Verifies icon fallbacks for PDFs and notes
 * - Checks network requests for signed URLs
 * - Measures performance metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOGIN_EMAIL = '1@1.com';
const LOGIN_PASSWORD = '11111111';
const SCREENSHOT_DIR = path.join(__dirname, '../tests/screenshots/deployment-verification/vault-preview-pictures');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

// Results tracking
const results = {
  timestamp: new Date().toISOString(),
  environment: BASE_URL,
  status: 'PASS',
  criticalIssues: 0,
  warnings: 0,
  screenshots: [],
  consoleErrors: [],
  networkErrors: [],
  performanceMetrics: {},
  validation: {
    previewRendering: { passed: false, issues: [] },
    aspectRatio: { passed: false, issues: [] },
    iconFallbacks: { passed: false, issues: [] },
    networkRequests: { passed: false, issues: [] },
    consoleErrors: { passed: false, issues: [] }
  }
};

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${TIMESTAMP}-${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  results.screenshots.push(screenshotPath);
  console.log(`✓ Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function login(page) {
  console.log('\n=== Login Process ===');

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Navigated to login page');

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', LOGIN_EMAIL);
    await page.type('input[type="password"]', LOGIN_PASSWORD);
    console.log('✓ Filled login credentials');

    await captureScreenshot(page, 'login-page');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
    ]);

    console.log('✓ Login successful');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    results.criticalIssues++;
    results.status = 'BLOCKED';
    return false;
  }
}

async function validateVaultPage(page) {
  console.log('\n=== Vault Page Validation ===');

  try {
    // Navigate to vault
    await page.goto(`${BASE_URL}/vault`, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Navigated to vault page');

    // Wait for content to load
    await page.waitForSelector('.bg-white.rounded-2xl', { timeout: 10000 });
    console.log('✓ Page content loaded');

    // Capture initial viewport
    await captureScreenshot(page, 'vault-page-initial');

    // Check for document cards
    const documentCards = await page.$$('.group.bg-white.rounded-2xl');
    console.log(`✓ Found ${documentCards.length} document cards`);

    if (documentCards.length === 0) {
      results.warnings++;
      results.validation.previewRendering.issues.push('No documents found in vault');
      console.log('⚠ No documents to validate preview rendering');
      return;
    }

    results.validation.previewRendering.passed = true;

    // Check each document card for preview rendering
    console.log('\n=== Document Preview Validation ===');

    for (let i = 0; i < Math.min(documentCards.length, 5); i++) {
      const card = documentCards[i];

      // Scroll card into view
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Allow images to load

      // Get document kind
      const kindElement = await card.$('.inline-flex.items-center.px-2\\.5');
      const kind = kindElement ? await page.evaluate(el => el.textContent.trim(), kindElement) : 'unknown';

      console.log(`\nDocument ${i + 1} (${kind}):`);

      // Check for preview container
      const previewContainer = await card.$('.aspect-video');
      if (!previewContainer) {
        results.validation.previewRendering.issues.push(`Document ${i + 1}: Missing preview container`);
        results.warnings++;
        console.log('  ✗ Missing preview container');
        continue;
      }

      console.log('  ✓ Preview container found');

      // Validate aspect ratio (16:9 = 1.777...)
      const dimensions = await page.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }, previewContainer);

      const aspectRatio = dimensions.width / dimensions.height;
      const expectedRatio = 16 / 9;
      const tolerance = 0.05;

      if (Math.abs(aspectRatio - expectedRatio) < tolerance) {
        console.log(`  ✓ Aspect ratio correct: ${aspectRatio.toFixed(3)} (expected: ${expectedRatio.toFixed(3)})`);
        results.validation.aspectRatio.passed = true;
      } else {
        results.validation.aspectRatio.issues.push(
          `Document ${i + 1}: Aspect ratio ${aspectRatio.toFixed(3)} differs from expected ${expectedRatio.toFixed(3)}`
        );
        results.warnings++;
        console.log(`  ⚠ Aspect ratio off: ${aspectRatio.toFixed(3)} (expected: ${expectedRatio.toFixed(3)})`);
      }

      // Check if it's an image or icon fallback
      const hasImage = await card.$('img');
      const hasIconFallback = await card.$('.aspect-video span[role="img"]');

      if (kind.toLowerCase() === 'image') {
        if (hasImage) {
          console.log('  ✓ Image preview rendered');

          // Check if image loaded successfully
          const imageLoaded = await page.evaluate(img => img.complete && img.naturalHeight !== 0, hasImage);
          if (imageLoaded) {
            console.log('  ✓ Image loaded successfully');
          } else {
            results.validation.previewRendering.issues.push(`Document ${i + 1}: Image failed to load`);
            results.warnings++;
            console.log('  ⚠ Image failed to load');
          }
        } else if (hasIconFallback) {
          console.log('  ℹ Icon fallback shown (image may have failed to load)');
          results.validation.iconFallbacks.passed = true;
        } else {
          results.validation.previewRendering.issues.push(`Document ${i + 1}: No preview or fallback found`);
          results.warnings++;
          console.log('  ✗ No preview or fallback found');
        }
      } else if (kind.toLowerCase() === 'pdf' || kind.toLowerCase() === 'note') {
        if (hasIconFallback) {
          console.log('  ✓ Icon fallback rendered correctly');
          results.validation.iconFallbacks.passed = true;

          // Get the emoji/icon
          const icon = await page.evaluate(el => el.textContent, hasIconFallback);
          console.log(`  ✓ Icon: ${icon}`);
        } else {
          results.validation.iconFallbacks.issues.push(`Document ${i + 1}: Missing icon fallback for ${kind}`);
          results.warnings++;
          console.log(`  ✗ Missing icon fallback for ${kind}`);
        }
      }

      // Capture screenshot of this card
      await captureScreenshot(page, `document-card-${i + 1}-${kind.toLowerCase()}`);
    }

    // Capture full page scroll
    await captureScreenshot(page, 'vault-page-full');

  } catch (error) {
    console.error('✗ Vault page validation failed:', error.message);
    results.criticalIssues++;
    results.status = 'BLOCKED';
    results.validation.previewRendering.issues.push(`Page validation error: ${error.message}`);
  }
}

async function checkConsoleErrors(consoleMessages) {
  console.log('\n=== Console Error Validation ===');

  const errors = consoleMessages.filter(msg => msg.type === 'error');
  const warnings = consoleMessages.filter(msg => msg.type === 'warning');

  if (errors.length > 0) {
    console.log(`✗ Found ${errors.length} console errors (BLOCKER)`);
    results.consoleErrors = errors.map(e => e.text);
    results.criticalIssues += errors.length;
    results.status = 'BLOCKED';
    results.validation.consoleErrors.passed = false;

    errors.forEach((error, idx) => {
      console.log(`  ${idx + 1}. ${error.text}`);
    });
  } else {
    console.log('✓ No console errors found');
    results.validation.consoleErrors.passed = true;
  }

  if (warnings.length > 0) {
    console.log(`⚠ Found ${warnings.length} console warnings`);
    results.warnings += warnings.length;
    warnings.slice(0, 5).forEach((warning, idx) => {
      console.log(`  ${idx + 1}. ${warning.text}`);
    });
  }
}

async function checkNetworkRequests(networkRequests) {
  console.log('\n=== Network Request Validation ===');

  // Filter for document API requests
  const documentApiRequests = networkRequests.filter(req =>
    req.url.includes('/api/documents/') && req.method === 'GET'
  );

  console.log(`Found ${documentApiRequests.length} document API requests`);

  const failedRequests = documentApiRequests.filter(req => req.status >= 400);

  if (failedRequests.length > 0) {
    console.log(`✗ Found ${failedRequests.length} failed API requests (BLOCKER)`);
    results.networkErrors = failedRequests.map(req => `${req.method} ${req.url} - ${req.status}`);
    results.criticalIssues += failedRequests.length;
    results.status = 'BLOCKED';
    results.validation.networkRequests.passed = false;

    failedRequests.forEach((req, idx) => {
      console.log(`  ${idx + 1}. ${req.method} ${req.url} - ${req.status}`);
    });
  } else if (documentApiRequests.length > 0) {
    console.log('✓ All document API requests successful');
    results.validation.networkRequests.passed = true;

    // Log sample successful requests
    documentApiRequests.slice(0, 3).forEach((req, idx) => {
      console.log(`  ${idx + 1}. ${req.method} ${req.url} - ${req.status}`);
    });
  } else {
    console.log('⚠ No document API requests detected (vault may be empty)');
    results.validation.networkRequests.passed = true;
  }
}

async function measurePerformance(page) {
  console.log('\n=== Performance Metrics ===');

  try {
    const metrics = await page.metrics();
    const performanceTimings = await page.evaluate(() => JSON.stringify(performance.getEntriesByType('navigation')[0]));
    const timings = JSON.parse(performanceTimings);

    const pageLoadTime = timings.loadEventEnd - timings.fetchStart;
    const domContentLoaded = timings.domContentLoadedEventEnd - timings.fetchStart;
    const firstPaint = timings.domInteractive - timings.fetchStart;

    results.performanceMetrics = {
      pageLoadTime: Math.round(pageLoadTime),
      domContentLoaded: Math.round(domContentLoaded),
      firstPaint: Math.round(firstPaint),
      jsHeapUsedSize: Math.round(metrics.JSHeapUsedSize / 1048576), // MB
      jsHeapTotalSize: Math.round(metrics.JSHeapTotalSize / 1048576), // MB
      nodes: metrics.Nodes,
      layoutCount: metrics.LayoutCount,
      scriptDuration: Math.round(metrics.ScriptDuration * 1000) // ms
    };

    console.log(`✓ Page Load Time: ${results.performanceMetrics.pageLoadTime}ms`);
    console.log(`✓ DOM Content Loaded: ${results.performanceMetrics.domContentLoaded}ms`);
    console.log(`✓ First Paint: ${results.performanceMetrics.firstPaint}ms`);
    console.log(`✓ JS Heap Used: ${results.performanceMetrics.jsHeapUsedSize}MB`);
    console.log(`✓ DOM Nodes: ${results.performanceMetrics.nodes}`);

    // Check against 10s threshold (per PRD NFR)
    const thresholdMs = 10000;
    if (pageLoadTime > thresholdMs) {
      console.log(`⚠ Page load time (${pageLoadTime}ms) exceeds ${thresholdMs}ms threshold`);
      results.warnings++;
    }

  } catch (error) {
    console.error('✗ Failed to collect performance metrics:', error.message);
    results.warnings++;
  }
}

async function generateReport() {
  console.log('\n=== Validation Report ===');

  const reportPath = path.join(SCREENSHOT_DIR, `${TIMESTAMP}-validation-report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`✓ Report saved: ${reportPath}`);

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Environment: ${results.environment}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Overall Status: ${results.status}`);
  console.log(`Critical Issues: ${results.criticalIssues}`);
  console.log(`Warnings: ${results.warnings}`);
  console.log(`Screenshots: ${results.screenshots.length}`);

  console.log('\n=== Validation Results ===');
  console.log(`Preview Rendering: ${results.validation.previewRendering.passed ? '✓ PASS' : '✗ FAIL'}`);
  if (results.validation.previewRendering.issues.length > 0) {
    results.validation.previewRendering.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log(`Aspect Ratio: ${results.validation.aspectRatio.passed ? '✓ PASS' : '✗ FAIL'}`);
  if (results.validation.aspectRatio.issues.length > 0) {
    results.validation.aspectRatio.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log(`Icon Fallbacks: ${results.validation.iconFallbacks.passed ? '✓ PASS' : '✗ FAIL'}`);
  if (results.validation.iconFallbacks.issues.length > 0) {
    results.validation.iconFallbacks.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log(`Network Requests: ${results.validation.networkRequests.passed ? '✓ PASS' : '✗ FAIL'}`);
  if (results.validation.networkRequests.issues.length > 0) {
    results.validation.networkRequests.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log(`Console Errors: ${results.validation.consoleErrors.passed ? '✓ PASS' : '✗ FAIL'}`);
  if (results.consoleErrors.length > 0) {
    results.consoleErrors.forEach(error => console.log(`  - ${error}`));
  }

  console.log('\n=== Production Readiness Verdict ===');
  if (results.status === 'BLOCKED') {
    console.log('❌ BLOCKED - Cannot promote to production');
    console.log('Action Required:');
    if (results.consoleErrors.length > 0) {
      console.log('  - Fix console errors');
    }
    if (results.networkErrors.length > 0) {
      console.log('  - Fix failed network requests');
    }
    if (results.criticalIssues > 0) {
      console.log(`  - Resolve ${results.criticalIssues} critical issues`);
    }
  } else if (results.warnings > 0) {
    console.log('⚠ PASS WITH WARNINGS - Review warnings before production');
  } else {
    console.log('✅ PASS - Ready for production');
  }

  return reportPath;
}

async function main() {
  console.log('===========================================');
  console.log('  Vault Preview Validation');
  console.log('===========================================');
  console.log(`Environment: ${BASE_URL}`);
  console.log(`Timestamp: ${TIMESTAMP}`);
  console.log('===========================================\n');

  // Ensure screenshot directory exists
  await ensureDir(SCREENSHOT_DIR);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Track console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Track network requests
  const networkRequests = [];
  page.on('response', response => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method()
    });
  });

  try {
    // Login
    const loginSuccess = await login(page);
    if (!loginSuccess) {
      console.error('\n✗ Validation aborted due to login failure');
      await browser.close();
      process.exit(1);
    }

    // Validate vault page
    await validateVaultPage(page);

    // Check console errors
    await checkConsoleErrors(consoleMessages);

    // Check network requests
    await checkNetworkRequests(networkRequests);

    // Measure performance
    await measurePerformance(page);

    // Generate report
    const reportPath = await generateReport();

    console.log(`\n✓ Validation complete. Report: ${reportPath}`);
    console.log(`✓ Screenshots: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('\n✗ Validation failed:', error);
    results.status = 'BLOCKED';
    results.criticalIssues++;
    await captureScreenshot(page, 'error-state');
    await generateReport();
    process.exit(1);
  } finally {
    await browser.close();
  }

  // Exit with appropriate code
  if (results.status === 'BLOCKED') {
    process.exit(1);
  } else if (results.warnings > 0) {
    process.exit(0); // Pass with warnings
  } else {
    process.exit(0); // Pass
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
