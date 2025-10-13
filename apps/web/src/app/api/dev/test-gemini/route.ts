import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  console.log('[GEMINI TEST] Starting diagnostic test')

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    credentialsTest: {},
    apiTest: null,
  }

  try {
    // Check environment variables
    diagnostics.environment = {
      GOOGLE_CLOUD_PROJECT: !!process.env.GOOGLE_CLOUD_PROJECT,
      GOOGLE_CLOUD_PROJECT_VALUE: process.env.GOOGLE_CLOUD_PROJECT,
      GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      GOOGLE_APPLICATION_CREDENTIALS_JSON: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      GOOGLE_APPLICATION_CREDENTIALS_JSON_LENGTH: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length || 0,
      USE_GEMINI_FOOD_ANALYSIS: process.env.USE_GEMINI_FOOD_ANALYSIS,
    }

    console.log('[GEMINI TEST] Environment check:', diagnostics.environment)

    // Try to parse JSON credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        const credentialsJson = Buffer.from(
          process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
          'base64'
        ).toString('utf-8')
        const parsedCredentials = JSON.parse(credentialsJson)

        diagnostics.credentialsTest = {
          canParse: true,
          hasClientEmail: !!parsedCredentials.client_email,
          clientEmail: parsedCredentials.client_email,
          hasPrivateKey: !!parsedCredentials.private_key,
          privateKeyLength: parsedCredentials.private_key?.length || 0,
          hasProjectId: !!parsedCredentials.project_id,
          projectId: parsedCredentials.project_id,
        }

        console.log('[GEMINI TEST] Credentials parsed:', diagnostics.credentialsTest)

        // Try to initialize Vertex AI
        try {
          const vertexAI = new VertexAI({
            project: process.env.GOOGLE_CLOUD_PROJECT!,
            location: 'us-central1',
            googleAuthOptions: {
              credentials: parsedCredentials,
            },
          })

          console.log('[GEMINI TEST] VertexAI client initialized')

          // Try to get a model (this might fail if credentials are invalid)
          const model = vertexAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
          })

          console.log('[GEMINI TEST] Model obtained')

          diagnostics.apiTest = {
            clientInitialized: true,
            modelObtained: true,
            error: null,
          }

        } catch (apiError: any) {
          console.error('[GEMINI TEST] API initialization error:', apiError)
          diagnostics.apiTest = {
            clientInitialized: false,
            error: apiError.message,
            stack: apiError.stack,
          }
        }

      } catch (parseError: any) {
        console.error('[GEMINI TEST] Credentials parse error:', parseError)
        diagnostics.credentialsTest = {
          canParse: false,
          error: parseError.message,
        }
      }
    } else {
      diagnostics.credentialsTest = {
        error: 'GOOGLE_APPLICATION_CREDENTIALS_JSON not set',
      }
    }

    return NextResponse.json(diagnostics, { status: 200 })

  } catch (error: any) {
    console.error('[GEMINI TEST] Fatal error:', error)
    return NextResponse.json(
      {
        ...diagnostics,
        fatalError: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
