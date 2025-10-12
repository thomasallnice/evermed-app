import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

/**
 * DEV ONLY: Comprehensive food upload diagnostics
 *
 * GET /api/dev/test-food-upload
 *
 * Tests all components of food upload flow:
 * 1. Environment variables
 * 2. Database connection
 * 3. Supabase Storage
 * 4. Gemini/OpenAI configuration
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, any> = {
    environment: {},
    database: {},
    storage: {},
    aiProvider: {},
  }

  try {
    // ==========================================
    // 1. Environment Variables Check
    // ==========================================
    checks.environment = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      USE_GEMINI: process.env.USE_GEMINI_FOOD_ANALYSIS === 'true',
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_CLOUD_PROJECT: !!process.env.GOOGLE_CLOUD_PROJECT,
      GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    }

    // Check for missing critical env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL not set',
        checks,
      }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY not set',
        checks,
      }, { status: 500 })
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'DATABASE_URL not set',
        checks,
      }, { status: 500 })
    }

    // ==========================================
    // 2. Database Connection Check
    // ==========================================
    try {
      const prisma = new PrismaClient()

      // Test query
      const personCount = await prisma.person.count()
      checks.database.connected = true
      checks.database.personCount = personCount

      await prisma.$disconnect()
    } catch (dbError: any) {
      checks.database.connected = false
      checks.database.error = dbError.message

      return NextResponse.json({
        success: false,
        error: `Database connection failed: ${dbError.message}`,
        checks,
      }, { status: 500 })
    }

    // ==========================================
    // 3. Supabase Storage Check
    // ==========================================
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )

      // Check if food-photos bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        checks.storage.bucketsAccessible = false
        checks.storage.error = listError.message
      } else {
        checks.storage.bucketsAccessible = true
        checks.storage.totalBuckets = buckets?.length || 0

        const foodPhotosBucket = buckets?.find(b => b.id === 'food-photos')
        checks.storage.foodPhotosBucketExists = !!foodPhotosBucket
        checks.storage.foodPhotosBucketPublic = foodPhotosBucket?.public || false

        if (!foodPhotosBucket) {
          return NextResponse.json({
            success: false,
            error: 'food-photos bucket does not exist',
            checks,
          }, { status: 500 })
        }
      }
    } catch (storageError: any) {
      checks.storage.error = storageError.message

      return NextResponse.json({
        success: false,
        error: `Supabase Storage check failed: ${storageError.message}`,
        checks,
      }, { status: 500 })
    }

    // ==========================================
    // 4. AI Provider Check
    // ==========================================
    const useGemini = process.env.USE_GEMINI_FOOD_ANALYSIS === 'true'
    checks.aiProvider.provider = useGemini ? 'gemini' : 'openai'

    if (useGemini) {
      // Check Gemini configuration
      checks.aiProvider.gemini = {
        configured: !!process.env.GOOGLE_CLOUD_PROJECT &&
                   (!!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
        project: !!process.env.GOOGLE_CLOUD_PROJECT,
        credentialsFile: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        credentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      }

      if (!checks.aiProvider.gemini.configured) {
        return NextResponse.json({
          success: false,
          error: 'Gemini not properly configured (missing GOOGLE_CLOUD_PROJECT or credentials)',
          checks,
        }, { status: 500 })
      }

      // Test if we can decode JSON credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          const decoded = Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString('utf-8')
          const parsed = JSON.parse(decoded)
          checks.aiProvider.gemini.credentialsJsonValid = true
          checks.aiProvider.gemini.serviceAccount = parsed.client_email
        } catch (err: any) {
          checks.aiProvider.gemini.credentialsJsonValid = false
          checks.aiProvider.gemini.credentialsJsonError = err.message

          return NextResponse.json({
            success: false,
            error: `Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: ${err.message}`,
            checks,
          }, { status: 500 })
        }
      }
    } else {
      // Check OpenAI configuration
      checks.aiProvider.openai = {
        configured: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'none',
      }

      if (!checks.aiProvider.openai.configured) {
        return NextResponse.json({
          success: false,
          error: 'OpenAI not configured (missing OPENAI_API_KEY)',
          checks,
        }, { status: 500 })
      }
    }

    // ==========================================
    // All Checks Passed
    // ==========================================
    return NextResponse.json({
      success: true,
      message: 'All food upload components are configured correctly',
      checks,
      nextSteps: [
        'Try uploading a food photo again',
        'If it still fails, check Vercel logs for runtime errors',
        'The error might be in the actual Gemini/OpenAI API call',
      ],
    })

  } catch (error: any) {
    console.error('[DEV] Food upload test error:', error)

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
      checks,
    }, { status: 500 })
  }
}
