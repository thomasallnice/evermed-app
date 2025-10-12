import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

/**
 * DEV ONLY: Test OpenAI Vision API connectivity
 *
 * GET /api/dev/test-openai?imageUrl=https://...
 *
 * Tests:
 * 1. OPENAI_API_KEY is set
 * 2. OpenAI client initialization
 * 3. Image URL accessibility
 * 4. Vision API response
 */
export async function GET(request: NextRequest) {
  try {
    // Check API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not set in environment variables',
        checks: {
          apiKey: false,
          client: false,
          imageAccess: false,
          visionAPI: false,
        }
      }, { status: 500 })
    }

    // Get test image URL from query params or use default
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('imageUrl') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Pretzel.jpg/640px-Pretzel.jpg'

    // Test OpenAI client initialization
    let openai: OpenAI
    try {
      openai = new OpenAI({ apiKey })
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize OpenAI client',
        details: err.message,
        checks: {
          apiKey: true,
          client: false,
          imageAccess: false,
          visionAPI: false,
        }
      }, { status: 500 })
    }

    // Test image URL accessibility
    let imageAccessible = false
    try {
      const imageResponse = await fetch(imageUrl, { method: 'HEAD' })
      imageAccessible = imageResponse.ok

      if (!imageAccessible) {
        return NextResponse.json({
          success: false,
          error: `Image URL not accessible: ${imageResponse.status} ${imageResponse.statusText}`,
          imageUrl,
          checks: {
            apiKey: true,
            client: true,
            imageAccess: false,
            visionAPI: false,
          }
        }, { status: 500 })
      }
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch image URL',
        details: err.message,
        imageUrl,
        checks: {
          apiKey: true,
          client: true,
          imageAccess: false,
          visionAPI: false,
        }
      }, { status: 500 })
    }

    // Test Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a food recognition assistant. Respond with JSON only.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What food is in this image? Respond with JSON: {"food": "name"}'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'low' // Use low detail for testing (cheaper)
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0,
    })

    const content = response.choices[0]?.message?.content || ''

    return NextResponse.json({
      success: true,
      message: 'All checks passed!',
      checks: {
        apiKey: true,
        client: true,
        imageAccess: true,
        visionAPI: true,
      },
      test: {
        imageUrl,
        model: 'gpt-4o',
        response: content,
        usage: response.usage,
      }
    })

  } catch (error: any) {
    console.error('[DEV] OpenAI test error:', error)

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: {
        name: error.name,
        code: error.code,
        status: error.status,
        type: error.type,
      },
      checks: {
        apiKey: !!process.env.OPENAI_API_KEY,
        client: true,
        imageAccess: true,
        visionAPI: false,
      }
    }, { status: 500 })
  }
}
