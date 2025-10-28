#!/usr/bin/env node

/**
 * Test the actual /api/metabolic/food endpoint with schnitzel image
 * This simulates what the mobile app does
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Load environment variables
const envPath = path.join(__dirname, '.env.production');
const envContent = fs.readFileSync(envPath, 'utf-8');

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    process.env[key] = value;
  }
});

console.log('=== Food Upload API Test ===\n');

async function testFoodUploadAPI() {
  // 1. Create a test user session using service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  console.log('1. Creating test user session...');

  // Try to get an existing user or create one for testing
  const testEmail = `test-${Date.now()}@carbly.test`;
  const testPassword = 'test-password-123';

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError && !signUpError.message.includes('already registered')) {
    console.error('   ✗ Failed to create test user:', signUpError);
    process.exit(1);
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error('   ✗ Failed to sign in:', signInError);
    process.exit(1);
  }

  const accessToken = signInData.session.access_token;
  const userId = signInData.user.id;
  console.log(`   ✓ Test user authenticated: ${userId}\n`);

  // 2. Read test image
  console.log('2. Reading test image...');
  const imagePath = '/tmp/schnitzel.jpg';
  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`   ✓ Image loaded (${imageBuffer.length} bytes)\n`);

  // 3. Call the API endpoint
  console.log('3. Uploading via API endpoint...');
  console.log('   URL: https://app.getcarbly.app/api/metabolic/food');

  const formData = new FormData();
  formData.append('photo', imageBuffer, {
    filename: 'schnitzel.jpg',
    contentType: 'image/jpeg',
  });
  formData.append('meal_type', 'lunch');
  formData.append('notes', 'Test schnitzel upload from diagnostic script');

  try {
    const response = await axios.post(
      'https://app.getcarbly.app/api/metabolic/food',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
        },
        timeout: 60000, // 60 second timeout
      }
    );

    console.log(`   ✓ API call succeeded (${response.status})\n`);
    console.log('=== API RESPONSE ===');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n=== API TEST PASSED ===');

    // 4. Wait a few seconds and check if analysis completed
    console.log('\n4. Waiting 10 seconds for analysis to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const entryId = response.data.id;
    const checkResponse = await axios.get(
      `https://app.getcarbly.app/api/metabolic/food/${entryId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    console.log('   Analysis status:', checkResponse.data.photos[0].analysis_status);
    console.log('   Ingredients:', checkResponse.data.ingredients?.length || 0);

    if (checkResponse.data.photos[0].analysis_status === 'completed') {
      console.log('\n   ✓ Analysis completed successfully!');
    } else if (checkResponse.data.photos[0].analysis_status === 'failed') {
      console.log('\n   ✗ Analysis failed');
    } else {
      console.log('\n   ⏳ Analysis still pending...');
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await axios.delete(
      `https://app.getcarbly.app/api/metabolic/food/${entryId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    console.log('   ✓ Test entry deleted');

  } catch (error) {
    console.error('\n   ✗ API call failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    console.log('\n=== API TEST FAILED ===');
    process.exit(1);
  }
}

testFoodUploadAPI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
