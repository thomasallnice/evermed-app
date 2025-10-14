#!/usr/bin/env tsx
/**
 * Test OpenAI Vision API with an existing food photo from database
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const openai = new OpenAI({ apiKey: openaiApiKey })

async function testExistingPhoto() {
  console.log('🧪 Testing with existing food photo from database...\n')

  try {
    // Get the most recent food photo
    const photo = await prisma.foodPhoto.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        foodEntry: true
      }
    })

    if (!photo) {
      console.log('ℹ️ No existing food photos found in database')
      console.log('   Upload a food photo through the app first, or create a synthetic test\n')
      return false
    }

    console.log('1️⃣ Found existing photo:')
    console.log('   ID:', photo.id)
    console.log('   Storage Path:', photo.storagePath)
    console.log('   Analysis Status:', photo.analysisStatus)
    console.log('   Created:', photo.createdAt)
    console.log()

    // Get public URL
    console.log('2️⃣ Generating public URL...')
    const { data: urlData } = supabase.storage
      .from('food-photos')
      .getPublicUrl(photo.storagePath)

    const publicUrl = urlData.publicUrl
    console.log('✅ Public URL:', publicUrl)
    console.log()

    // Verify URL is accessible
    console.log('3️⃣ Verifying URL is accessible...')
    const fetchResponse = await fetch(publicUrl)
    if (!fetchResponse.ok) {
      console.error('❌ URL is not accessible')
      console.error('   Status:', fetchResponse.status)
      return false
    }
    console.log('✅ URL is accessible')
    console.log('   Content-Type:', fetchResponse.headers.get('content-type'))
    console.log('   Content-Length:', fetchResponse.headers.get('content-length'))
    console.log()

    // Test OpenAI Vision API
    console.log('4️⃣ Testing OpenAI Vision API...')
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What food items do you see in this image? List them briefly.'
            },
            {
              type: 'image_url',
              image_url: {
                url: publicUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 200
    })

    const description = response.choices[0]?.message?.content
    console.log('✅ OpenAI Vision API SUCCESS!')
    console.log('   Response:', description)
    console.log()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ ALL TESTS PASSED')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Food photo analysis is now working correctly!\n')

    return true
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.code === 'invalid_image_url') {
      console.error('   Code: invalid_image_url')
      console.error('   This means OpenAI cannot download the image from the URL')
    } else if (error.code === 'image_parse_error') {
      console.error('   Code: image_parse_error')
      console.error('   This means the image format is invalid or corrupted')
    }
    return false
  } finally {
    await prisma.$disconnect()
  }
}

testExistingPhoto()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Script error:', error)
    process.exit(1)
  })
