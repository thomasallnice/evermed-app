#!/usr/bin/env node

/**
 * Deployment Validation Script with Vercel Protection Bypass
 *
 * Uses Vercel's Protection Bypass for Automation to validate deployment
 * Docs: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || 'https://evermed-app-git-refit-user-auth-32f4ab-thomasallnices-projects.vercel.app';
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '0ggTnEkxNX4vk7a11q8VfXkj9hG7ksKl';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tests', 'screenshots', 'deployment-verification', new Date().toISOString().replace(/[:.]/g, '-'));

// Create screenshot directory
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Pages to validate
const PAGES = [
  { path: '/auth/login', name: 'login' },
  { path: '/auth/onboarding', name: 'onboarding' },
  { path: '/', name: 'vault' },
  { path: '/upload', name: 'upload' },
  { path: '/profile', name: 'profile' },
  { path: '/chat', name: 'chat' },
  { path: '/packs', name: 'packs' }
];

// Viewports to test
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

// Results
const results = {
  timestamp: new Date().toISOString(),
  deploymentUrl: DEPLOYMENT_URL,
  bypassMethod: 'x-vercel-protection-bypass header',
  passed: 0,
  failed: 0,
  warnings: 0,
  consoleErrors: [],
  screenshots: [],
  performance: {},
  verdict: null,
  blockers: []
};

async function validateDeployment() {
  console.log('🚀 Starting Deployment Validation...\n');
  console.log(`📍 URL: ${DEPLOYMENT_URL}`);
  console.log(`🔐 Using bypass secret: ${BYPASS_SECRET.substring(0, 8)}...`);
  console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set bypass header for all requests
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': 'true' // Enable cookie for follow-up requests
    });

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.consoleErrors.push({
          page: page.url(),
          message: msg.text(),
          type: msg.type()
        });
      }
    });

    // Validate each page at each viewport
    for (const viewport of VIEWPORTS) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewport({ width: viewport.width, height: viewport.height });

      for (const pageInfo of PAGES) {
        const url = `${DEPLOYMENT_URL}${pageInfo.path}`;
        const screenshotName = `${pageInfo.name}-${viewport.name}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);

        try {
          console.log(`  ⏳ Testing ${pageInfo.path}...`);

          // Navigate with timeout
          await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });

          // Check if we're on Vercel auth page (bypass failed)
          const pageTitle = await page.title();
          const pageContent = await page.content();

          if (pageContent.includes('Log in to Vercel') || pageTitle.includes('Vercel')) {
            console.log(`  ❌ FAILED: Vercel auth page detected (bypass not working)`);
            results.failed++;
            results.blockers.push(`Bypass failed for ${pageInfo.path} - showing Vercel auth`);
          } else {
            console.log(`  ✅ PASSED: Application loaded`);
            results.passed++;
          }

          // Take screenshot
          await page.screenshot({ path: screenshotPath, fullPage: false });
          results.screenshots.push(screenshotPath);
          console.log(`  📸 Screenshot: ${screenshotName}`);

          // Performance metrics
          const performanceMetrics = await page.metrics();
          if (!results.performance[pageInfo.name]) {
            results.performance[pageInfo.name] = {};
          }
          results.performance[pageInfo.name][viewport.name] = performanceMetrics;

        } catch (error) {
          console.log(`  ❌ ERROR: ${error.message}`);
          results.failed++;
          results.blockers.push(`Error on ${pageInfo.path}: ${error.message}`);
        }
      }
    }

    // Check for console errors
    console.log('\n📋 Console Error Check:');
    if (results.consoleErrors.length === 0) {
      console.log('  ✅ No console errors found');
    } else {
      console.log(`  ❌ Found ${results.consoleErrors.length} console errors:`);
      results.consoleErrors.forEach((err, i) => {
        console.log(`    ${i + 1}. [${err.page}] ${err.message}`);
      });
      results.failed += results.consoleErrors.length;
    }

    // Generate verdict
    if (results.failed === 0 && results.consoleErrors.length === 0) {
      results.verdict = '✅ READY FOR PRODUCTION';
      console.log('\n✅ VERDICT: READY FOR PRODUCTION');
    } else {
      results.verdict = '❌ NOT READY - BLOCKERS FOUND';
      console.log('\n❌ VERDICT: NOT READY FOR PRODUCTION');
      console.log(`   Blockers: ${results.blockers.length}`);
    }

  } finally {
    await browser.close();
  }

  // Save report
  const reportPath = path.join(SCREENSHOT_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // Generate markdown report
  const markdownReport = generateMarkdownReport(results);
  const markdownPath = path.join(SCREENSHOT_DIR, 'VALIDATION_REPORT.md');
  fs.writeFileSync(markdownPath, markdownReport);

  console.log(`\n📄 Reports saved:`);
  console.log(`   JSON: ${reportPath}`);
  console.log(`   Markdown: ${markdownPath}`);
  console.log(`\n✨ Validation complete!\n`);

  // Exit with error code if failed
  process.exit(results.failed > 0 ? 1 : 0);
}

function generateMarkdownReport(results) {
  return `# Deployment Validation Report

**Date:** ${results.timestamp}
**Deployment URL:** ${results.deploymentUrl}
**Bypass Method:** ${results.bypassMethod}

## Summary
- ✅ Passed: ${results.passed}
- ❌ Failed: ${results.failed}
- ⚠️ Warnings: ${results.warnings}

## Console Errors
${results.consoleErrors.length === 0 ? '✅ NONE FOUND' : results.consoleErrors.map((err, i) => `${i + 1}. **${err.page}**: ${err.message}`).join('\n')}

## Screenshots
${results.screenshots.map(s => `- \`${path.basename(s)}\``).join('\n')}

## Performance Metrics
${Object.entries(results.performance).map(([page, viewports]) => {
  return `### ${page}\n${Object.entries(viewports).map(([vp, metrics]) => `- ${vp}: ${JSON.stringify(metrics, null, 2)}`).join('\n')}`;
}).join('\n\n')}

## VERDICT
**${results.verdict}**

${results.blockers.length > 0 ? `### Blockers:\n${results.blockers.map((b, i) => `${i + 1}. ${b}`).join('\n')}` : ''}
`;
}

// Run validation
validateDeployment().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
