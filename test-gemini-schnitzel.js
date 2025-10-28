#!/usr/bin/env node

/**
 * Direct test of Gemini food analysis with schnitzel image
 * Bypasses mobile app auth by using service role directly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.production
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

console.log('=== Gemini Food Analysis Direct Test ===\n');

async function testFoodAnalysis() {
  // 1. Create Supabase client with service role
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

  console.log('1. Reading test image...');
  const imagePath = '/tmp/schnitzel.jpg';
  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`   ✓ Image loaded (${imageBuffer.length} bytes)\n`);

  // 2. Upload to Supabase Storage
  console.log('2. Uploading to Supabase Storage...');
  const testFilePath = `test-${Date.now()}.jpg`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('food-photos')
    .upload(testFilePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('   ✗ Upload failed:', uploadError);
    process.exit(1);
  }

  console.log(`   ✓ Uploaded to: ${testFilePath}\n`);

  // 3. Get public URL
  const { data: urlData } = supabase.storage
    .from('food-photos')
    .getPublicUrl(testFilePath);

  console.log('3. Public URL:');
  console.log(`   ${urlData.publicUrl}\n`);

  // 4. Test the analysis function directly
  console.log('4. Running Gemini analysis...');
  console.log('   (This will take 5-30 seconds)\n');

  try {
    // Import the analysis function - need to use the actual path
    const analysisModule = require('./apps/web/src/lib/food-analysis-gemini.ts');
    const analyzeFoodPhotoGemini = analysisModule.analyzeFoodPhotoGemini;

    const result = await analyzeFoodPhotoGemini(urlData.publicUrl);

    console.log('   ✓ Analysis completed!\n');
    console.log('=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n=== TEST PASSED ===');

    // Cleanup
    console.log('\nCleaning up test file...');
    await supabase.storage.from('food-photos').remove([testFilePath]);
    console.log('   ✓ Test file deleted');

  } catch (error) {
    console.error('\n   ✗ Analysis failed:');
    console.error('   Error:', error.message);
    console.error('\n   Stack:', error.stack);
    console.log('\n=== TEST FAILED ===');

    // Cleanup even on failure
    console.log('\nCleaning up test file...');
    await supabase.storage.from('food-photos').remove([testFilePath]);

    process.exit(1);
  }
}

testFoodAnalysis().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
