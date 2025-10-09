#!/usr/bin/env node

/**
 * Investigate 500 error on staging /upload page
 */

const puppeteer = require('puppeteer');

const STAGING_URL = 'https://staging.evermed.ai';
const BYPASS_SECRET = '0ggTnEkxNX4vk7a11q8VfXkj9hG7ksKl';

async function investigate() {
  console.log('🔍 Investigating 500 error on /upload page...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set bypass header
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': BYPASS_SECRET
    });

    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Collect network requests
    const networkRequests = [];
    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers()
      });
    });

    // Navigate to upload page
    console.log(`📍 Navigating to ${STAGING_URL}/upload...\n`);

    try {
      await page.goto(`${STAGING_URL}/upload`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    } catch (e) {
      console.log(`⚠️ Navigation completed with errors: ${e.message}\n`);
    }

    // Wait a bit for all requests to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Analyze results
    console.log('=' .repeat(80));
    console.log('📊 INVESTIGATION RESULTS');
    console.log('='.repeat(80));

    // Find 500 errors
    const errors500 = networkRequests.filter(req => req.status === 500);

    if (errors500.length > 0) {
      console.log('\n🚨 500 ERRORS FOUND:');
      for (const req of errors500) {
        console.log(`\n❌ ${req.url}`);
        console.log(`   Status: ${req.status} ${req.statusText}`);

        // Try to get response body
        try {
          const response = await page.goto(req.url, { waitUntil: 'networkidle0' });
          const body = await response.text();
          console.log(`   Response body:`);
          console.log(`   ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}`);
        } catch (e) {
          console.log(`   Could not fetch response body: ${e.message}`);
        }
      }
    } else {
      console.log('\n✅ No 500 errors found');
    }

    // Console errors
    const consoleErrors = consoleMessages.filter(msg => msg.type === 'error');
    if (consoleErrors.length > 0) {
      console.log(`\n🐛 CONSOLE ERRORS (${consoleErrors.length} total):`);
      consoleErrors.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.text}`);
        if (err.location) {
          console.log(`   Location: ${err.location.url}:${err.location.lineNumber}`);
        }
      });
    } else {
      console.log('\n✅ No console errors');
    }

    // All requests summary
    console.log(`\n📡 NETWORK REQUESTS SUMMARY:`);
    console.log(`   Total requests: ${networkRequests.length}`);

    const statusCounts = {};
    networkRequests.forEach(req => {
      const statusGroup = Math.floor(req.status / 100);
      const key = `${statusGroup}xx`;
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === '2xx' ? '✅' : status === '5xx' ? '❌' : '⚠️';
      console.log(`   ${emoji} ${status}: ${count}`);
    });

    // Failed requests (4xx, 5xx)
    const failedRequests = networkRequests.filter(req => req.status >= 400);
    if (failedRequests.length > 0) {
      console.log(`\n❌ FAILED REQUESTS (${failedRequests.length} total):`);
      failedRequests.forEach(req => {
        console.log(`   ${req.status} ${req.url}`);
      });
    }

    console.log('\n' + '='.repeat(80));

  } finally {
    await browser.close();
  }
}

investigate().catch(error => {
  console.error('❌ Investigation failed:', error);
  process.exit(1);
});
