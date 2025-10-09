#!/usr/bin/env node

/**
 * Comprehensive Local App Testing Script
 * Tests all critical pages and identifies issues
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function testApp() {
  console.log('🧪 Starting comprehensive local app testing...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    devtools: false
  });

  const issues = [];
  const successes = [];

  try {
    const page = await browser.newPage();

    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();

      consoleMessages.push({ type, text });

      if (type === 'error') {
        console.log(`   ❌ Console Error: ${text}`);
      }
    });

    // Collect network errors
    page.on('response', response => {
      const status = response.status();
      const url = response.url();

      if (status >= 400 && !url.includes('devtools')) {
        const shortUrl = url.replace(BASE_URL, '').replace(/^https?:\/\/[^/]+/, '');
        console.log(`   ⚠️  ${status} ${shortUrl}`);

        if (status >= 500) {
          issues.push(`${status} error on ${shortUrl}`);
        }
      }
    });

    // Test 1: Homepage
    console.log('📍 Test 1: Homepage (/)');
    try {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0', timeout: 10000 });
      const title = await page.title();
      console.log(`   ✅ Page loaded: "${title}"`);
      successes.push('Homepage loads');
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
      issues.push(`Homepage: ${e.message}`);
    }

    // Test 2: Auth pages
    const authPages = [
      { path: '/auth/login', name: 'Login' },
      { path: '/auth/signup', name: 'Signup' },
      { path: '/auth/onboarding', name: 'Onboarding' }
    ];

    for (const { path, name } of authPages) {
      console.log(`\n📍 Test: ${name} (${path})`);
      try {
        await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0', timeout: 10000 });
        console.log(`   ✅ Page loaded`);
        successes.push(`${name} page loads`);
      } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
        issues.push(`${name}: ${e.message}`);
      }
    }

    // Test 3: Main app pages (requires auth - will redirect)
    const appPages = [
      { path: '/vault', name: 'Vault' },
      { path: '/upload', name: 'Upload' },
      { path: '/profile', name: 'Profile' },
      { path: '/packs', name: 'Packs' },
      { path: '/chat', name: 'Chat' }
    ];

    console.log('\n📍 Testing app pages (may redirect to login)...');
    for (const { path, name } of appPages) {
      console.log(`\n   Testing: ${name} (${path})`);
      try {
        const response = await page.goto(`${BASE_URL}${path}`, {
          waitUntil: 'networkidle0',
          timeout: 10000
        });

        const finalUrl = page.url();
        const status = response.status();

        if (finalUrl.includes('/auth/login')) {
          console.log(`   ⚠️  Redirected to login (expected without auth)`);
          successes.push(`${name} redirects to login correctly`);
        } else if (status === 200) {
          console.log(`   ✅ Page loaded (authenticated)`);
          successes.push(`${name} page loads`);
        } else {
          console.log(`   ❌ Unexpected status: ${status}`);
          issues.push(`${name}: Status ${status}`);
        }
      } catch (e) {
        console.log(`   ❌ Failed: ${e.message}`);
        issues.push(`${name}: ${e.message}`);
      }
    }

    // Test 4: API Health Check
    console.log('\n📍 Test: API Health');
    try {
      const response = await page.goto(`${BASE_URL}/api/health`, {
        waitUntil: 'networkidle0',
        timeout: 10000
      });
      const status = response.status();

      if (status === 200) {
        const body = await response.json();
        console.log(`   ✅ API Health: ${JSON.stringify(body)}`);
        successes.push('API health check passes');
      } else {
        console.log(`   ❌ API Health returned ${status}`);
        issues.push(`API health: Status ${status}`);
      }
    } catch (e) {
      console.log(`   ❌ API Health failed: ${e.message}`);
      issues.push(`API health: ${e.message}`);
    }

    // Count console errors
    const errorCount = consoleMessages.filter(m => m.type === 'error').length;
    const warningCount = consoleMessages.filter(m => m.type === 'warning').length;

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Successes: ${successes.length}`);
    successes.forEach(s => console.log(`   • ${s}`));

    console.log(`\n❌ Issues Found: ${issues.length}`);
    issues.forEach(i => console.log(`   • ${i}`));

    console.log(`\n📝 Console Messages:`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}`);

    if (errorCount > 0) {
      console.log('\n🐛 Console Errors:');
      consoleMessages
        .filter(m => m.type === 'error')
        .slice(0, 10) // Show first 10
        .forEach(m => console.log(`   • ${m.text}`));
    }

    console.log('\n' + '='.repeat(80));

    if (issues.length === 0 && errorCount === 0) {
      console.log('🎉 ALL TESTS PASSED! No critical issues found.');
      console.log('✅ Local app is ready for deployment.');
    } else if (issues.length === 0 && errorCount > 0) {
      console.log('⚠️  No critical page issues, but console errors present.');
      console.log('   Review console errors before deploying.');
    } else {
      console.log('❌ ISSUES FOUND - Fix before deploying to staging!');
    }

    console.log('='.repeat(80) + '\n');

  } finally {
    await browser.close();
  }
}

testApp().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
