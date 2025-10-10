#!/usr/bin/env node

/**
 * Investigate 404 errors on localhost:3000
 * This script identifies which specific resources are failing to load
 */

const puppeteer = require('puppeteer');

const URL = 'http://localhost:3000/auth/login';

async function investigate() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Track all network requests and responses
  const failedResources = [];

  page.on('response', (response) => {
    if (response.status() === 404) {
      failedResources.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    }
  });

  console.log('Navigating to:', URL);
  await page.goto(URL, { waitUntil: 'networkidle0' });

  console.log('\n404 Errors Found:');
  console.log('==================');

  if (failedResources.length === 0) {
    console.log('✅ No 404 errors detected!');
  } else {
    console.log(`❌ ${failedResources.length} resources failed to load:\n`);
    failedResources.forEach((resource, index) => {
      console.log(`${index + 1}. ${resource.url}`);
    });
  }

  await browser.close();
}

investigate().catch(console.error);
