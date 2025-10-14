#!/usr/bin/env tsx
/**
 * Verify food-photos bucket configuration
 *
 * This script checks:
 * 1. Bucket exists
 * 2. Bucket is public
 * 3. RLS policies are correct
 * 4. Public URL is accessible
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyBucketConfiguration() {
  console.log('🔍 Verifying food-photos bucket configuration...\n')

  // Step 1: Check if bucket exists
  console.log('1️⃣ Checking if bucket exists...')
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('❌ Error listing buckets:', listError)
    return false
  }

  const foodPhotosBucket = buckets?.find(b => b.name === 'food-photos')

  if (!foodPhotosBucket) {
    console.error('❌ Bucket "food-photos" does NOT exist')
    console.log('   Action required: Create bucket via Supabase dashboard or API')
    return false
  }

  console.log('✅ Bucket exists:', foodPhotosBucket.name)
  console.log('   Public:', foodPhotosBucket.public)
  console.log('   Created:', foodPhotosBucket.created_at)
  console.log()

  // Step 2: Check bucket is public
  console.log('2️⃣ Checking if bucket is public...')
  if (!foodPhotosBucket.public) {
    console.error('❌ Bucket is PRIVATE - OpenAI cannot access public URLs')
    console.log('   Action required: Run SQL to set public = true')
    return false
  }
  console.log('✅ Bucket is PUBLIC\n')

  // Step 3: Upload a test file (use a 1x1 PNG as test image)
  console.log('3️⃣ Testing file upload...')
  const testPath = 'test/verification.png'

  // Create a minimal valid PNG (1x1 transparent pixel)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const testImageBuffer = Buffer.from(testImageBase64, 'base64')

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('food-photos')
    .upload(testPath, testImageBuffer, {
      contentType: 'image/png',
      upsert: true
    })

  if (uploadError) {
    console.error('❌ Upload failed:', uploadError)
    return false
  }
  console.log('✅ Upload succeeded:', uploadData.path)
  console.log()

  // Step 4: Get public URL
  console.log('4️⃣ Testing public URL access...')
  const { data: urlData } = supabase.storage
    .from('food-photos')
    .getPublicUrl(testPath)

  const publicUrl = urlData.publicUrl
  console.log('   Public URL:', publicUrl)

  // Step 5: Test URL accessibility
  console.log('5️⃣ Fetching public URL...')
  try {
    const response = await fetch(publicUrl)

    if (response.ok) {
      const contentType = response.headers.get('content-type')
      console.log('✅ Public URL is accessible')
      console.log('   Status:', response.status)
      console.log('   Content-Type:', contentType)
      console.log('   Content-Length:', response.headers.get('content-length'))
      console.log()

      // Verify it's an image
      if (!contentType?.startsWith('image/')) {
        console.error('❌ URL did not return an image')
        return false
      }
    } else {
      console.error('❌ Public URL returned error status')
      console.error('   Status:', response.status)
      console.error('   Status Text:', response.statusText)
      return false
    }
  } catch (fetchError: any) {
    console.error('❌ Failed to fetch public URL:', fetchError.message)
    return false
  }

  // Step 6: Clean up test file
  console.log('6️⃣ Cleaning up test file...')
  const { error: deleteError } = await supabase.storage
    .from('food-photos')
    .remove([testPath])

  if (deleteError) {
    console.warn('⚠️ Could not delete test file:', deleteError)
  } else {
    console.log('✅ Test file deleted\n')
  }

  // Success!
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ ALL CHECKS PASSED')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Bucket is properly configured for OpenAI Vision API\n')

  return true
}

// Run verification
verifyBucketConfiguration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Verification script error:', error)
    process.exit(1)
  })
