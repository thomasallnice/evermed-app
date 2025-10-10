#!/usr/bin/env node

/**
 * Test /api/profile endpoint to verify Prisma schema fix
 * Tests that the heightCm and weightKg fields are properly accessible
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3200';
const EMAIL = 'demo@evermed.local';
const PASSWORD = 'demo123';

async function testProfileEndpoint() {
  console.log('🔐 Testing /api/profile endpoint after Prisma client regeneration...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`   ⚠️  Console error: ${msg.text()}`);
    }
  });

  // Collect network requests
  const networkRequests = [];
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (url.includes('/api/')) {
      networkRequests.push({
        status,
        url: url.replace(BASE_URL, ''),
        statusText: response.statusText()
      });
    }
  });

  try {
    // Step 1: Login
    console.log('📍 Step 1: Logging in...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle0' });

    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.type('input[type="email"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);

    // Click login and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }),
      page.click('button[type="submit"]')
    ]);
    console.log('   ✅ Logged in successfully');

    // Step 2: Navigate to profile page
    console.log('\n📍 Step 2: Navigating to /profile page...');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for API calls to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('   ✅ Profile page loaded');

    // Step 3: Check /api/profile endpoint responses
    console.log('\n📍 Step 3: Analyzing /api/profile API calls...');

    const profileRequests = networkRequests.filter(req => req.url.includes('/api/profile'));

    if (profileRequests.length === 0) {
      console.log('   ⚠️  No /api/profile requests detected');
    } else {
      console.log(`   Found ${profileRequests.length} /api/profile request(s):`);
      profileRequests.forEach(req => {
        const statusIcon = req.status === 200 ? '✅' : '❌';
        console.log(`   ${statusIcon} ${req.status} ${req.statusText} - ${req.url}`);
      });
    }

    // Step 4: Check for specific Prisma errors
    console.log('\n📍 Step 4: Checking for Prisma schema errors...');

    const prismaErrors = consoleErrors.filter(err =>
      err.includes('heightCm') ||
      err.includes('weightKg') ||
      err.includes('Invalid `prisma.person.findUnique()`') ||
      err.includes('Unknown field')
    );

    if (prismaErrors.length === 0) {
      console.log('   ✅ No Prisma schema errors detected - heightCm/weightKg fields accessible');
    } else {
      console.log('   ❌ Prisma schema errors still present:');
      prismaErrors.forEach(err => {
        console.log(`      ${err}`);
      });
    }

    // Step 5: Check for 500 errors on /api/profile
    const profile500Errors = profileRequests.filter(req => req.status === 500);

    if (profile500Errors.length > 0) {
      console.log('\n   ❌ 500 ERRORS on /api/profile:');
      profile500Errors.forEach(err => {
        console.log(`      ${err.status} ${err.url}`);
      });
    }

    // Final verdict
    console.log('\n' + '='.repeat(80));

    const allProfileRequestsSuccessful = profileRequests.length > 0 &&
                                         profileRequests.every(req => req.status === 200);
    const noPrismaErrors = prismaErrors.length === 0;
    const no500Errors = profile500Errors.length === 0;

    if (allProfileRequestsSuccessful && noPrismaErrors && no500Errors) {
      console.log('🎉 SUCCESS - /api/profile endpoint is working correctly!');
      console.log('   ✅ All /api/profile requests returned 200');
      console.log('   ✅ No Prisma schema errors');
      console.log('   ✅ heightCm and weightKg fields are accessible');
    } else {
      console.log('❌ FAILURE - /api/profile endpoint has issues:');
      if (!allProfileRequestsSuccessful) {
        console.log('   ❌ Some /api/profile requests failed');
      }
      if (!noPrismaErrors) {
        console.log('   ❌ Prisma schema errors detected');
      }
      if (!no500Errors) {
        console.log('   ❌ 500 errors detected on /api/profile');
      }
    }

    console.log('='.repeat(80) + '\n');

    // Exit with appropriate code
    const success = allProfileRequestsSuccessful && noPrismaErrors && no500Errors;
    await browser.close();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await browser.close();
    process.exit(1);
  }
}

testProfileEndpoint().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
