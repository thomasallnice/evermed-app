#!/usr/bin/env node

/**
 * Test authenticated document access flow
 * Tests that a logged-in user can access their documents
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const EMAIL = '1@1.com';
const PASSWORD = '11111111';

async function testAuthenticatedFlow() {
  console.log('🔐 Testing authenticated document access flow...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Collect network errors
  const networkErrors = [];
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('devtools') && !url.includes('404')) {
      networkErrors.push({ status, url: url.replace(BASE_URL, '') });
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

    // Step 2: Navigate to vault
    console.log('\n📍 Step 2: Navigating to vault...');
    await page.goto(`${BASE_URL}/vault`, { waitUntil: 'networkidle0' });
    console.log('   ✅ Vault loaded');

    // Step 3: Find a document link and navigate to it
    console.log('\n📍 Step 3: Finding document...');
    const documentLink = await page.$('a[href^="/doc/"]');

    if (!documentLink) {
      console.log('   ⚠️  No documents found in vault');
      console.log('   ℹ️  This is expected if no documents have been uploaded');
      await browser.close();
      return;
    }

    const docHref = await page.evaluate(el => el.getAttribute('href'), documentLink);
    console.log(`   ✅ Found document: ${docHref}`);

    // Step 4: Access document page
    console.log('\n📍 Step 4: Accessing document page...');
    await page.goto(`${BASE_URL}${docHref}`, { waitUntil: 'networkidle0', timeout: 15000 });

    // Wait a bit for API calls to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Check for errors
    console.log('\n📍 Step 5: Checking for errors...');

    const apiErrors = networkErrors.filter(e =>
      e.url.includes('/api/documents/') && (e.status === 500 || e.status === 401)
    );

    if (apiErrors.length === 0) {
      console.log('   ✅ No API errors - document loaded successfully!');
    } else {
      console.log('   ❌ API errors detected:');
      apiErrors.forEach(err => {
        console.log(`      ${err.status} ${err.url}`);
      });
    }

    if (consoleErrors.length === 0) {
      console.log('   ✅ No console errors');
    } else {
      console.log('   ⚠️  Console errors:');
      consoleErrors.slice(0, 5).forEach(err => {
        console.log(`      ${err}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    if (apiErrors.length === 0 && consoleErrors.length === 0) {
      console.log('🎉 SUCCESS - Authenticated flow works correctly!');
    } else {
      console.log('⚠️  Some issues detected - see details above');
    }
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testAuthenticatedFlow().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
