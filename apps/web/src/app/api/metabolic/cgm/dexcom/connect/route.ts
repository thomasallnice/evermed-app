// apps/web/src/app/api/metabolic/cgm/dexcom/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { createDexcomService } from '@/lib/services/dexcom';

/**
 * POST /api/metabolic/cgm/dexcom/connect
 *
 * Generate Dexcom OAuth authorization URL for user to connect their account.
 *
 * Request: None
 * Response: { authUrl: string }
 *
 * Medical Disclaimer: Glucose data from CGM devices is for informational purposes only.
 * This system does not provide medical advice, diagnosis, or treatment recommendations.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await requireUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate authorization URL
    const dexcomService = createDexcomService();
    const { authUrl } = await dexcomService.generateAuthUrl(userId);

    // State is embedded in the authUrl for CSRF protection
    // In production, consider storing state in secure session/cookie

    return NextResponse.json(
      {
        authUrl,
        disclaimer:
          'Glucose data is for informational purposes only. Do not use for diagnosis or treatment decisions.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/metabolic/cgm/dexcom/connect error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to generate authorization URL',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
