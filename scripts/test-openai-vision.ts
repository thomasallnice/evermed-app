#!/usr/bin/env tsx
/**
 * Test OpenAI Vision API access to a food photo
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const openai = new OpenAI({ apiKey: openaiApiKey })

async function testOpenAIVision() {
  console.log('🧪 Testing OpenAI Vision API with food-photos bucket...\n')

  // Upload a test image (1x1 red pixel PNG for testing)
  console.log('1️⃣ Uploading test food photo...')
  const testPath = 'test/openai-test.png'

  // Create a slightly larger test PNG with some color (to be more realistic)
  // This is a 10x10 red square PNG
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8DwHwyYGIYHKBQCAEHOAgH4J8J3AAAAAElFTkSuQmCC'
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

  // Get public URL
  console.log('2️⃣ Generating public URL...')
  const { data: urlData } = supabase.storage
    .from('food-photos')
    .getPublicUrl(testPath)

  const publicUrl = urlData.publicUrl
  console.log('✅ Public URL:', publicUrl)
  console.log()

  // Test OpenAI Vision API access
  console.log('3️⃣ Testing OpenAI Vision API access...')
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What do you see in this image? Describe it briefly.'
            },
            {
              type: 'image_url',
              image_url: {
                url: publicUrl,
                detail: 'low' // Use low detail for test image
              }
            }
          ]
        }
      ],
      max_tokens: 100
    })

    const description = response.choices[0]?.message?.content
    console.log('✅ OpenAI Vision API successfully accessed the image!')
    console.log('   Response:', description)
    console.log()

    // Clean up
    console.log('4️⃣ Cleaning up test file...')
    const { error: deleteError } = await supabase.storage
      .from('food-photos')
      .remove([testPath])

    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError)
    } else {
      console.log('✅ Test file deleted\n')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ OPENAI VISION API TEST PASSED')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('The food photo analysis feature should now work!\n')

    return true
  } catch (error: any) {
    console.error('❌ OpenAI Vision API error:', error.message)
    console.error('   Status:', error.status)
    console.error('   Code:', error.code)

    if (error.code === 'invalid_image_url') {
      console.log('\n⚠️ Image URL is invalid or inaccessible to OpenAI')
      console.log('   This might indicate the bucket is still private or URL is malformed')
    }

    return false
  }
}

testOpenAIVision()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Script error:', error)
    process.exit(1)
  })
