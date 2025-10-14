// apps/web/src/app/api/metabolic/cgm/dexcom/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createDexcomService } from '@/lib/services/dexcom';

/**
 * GET /api/metabolic/cgm/dexcom/callback
 *
 * OAuth callback endpoint for Dexcom authorization.
 * Exchanges authorization code for access/refresh tokens and stores connection.
 *
 * Query Parameters:
 *  - code: Authorization code from Dexcom
 *  - state: State parameter for CSRF validation (contains userId)
 *
 * Response: Redirects to dashboard with success/error message
 *
 * Medical Disclaimer: Glucose data from CGM devices is for informational purposes only.
 * This system does not provide medical advice, diagnosis, or treatment recommendations.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('[API] Dexcom OAuth error', { error });
      return NextResponse.redirect(
        new URL(
          `/dashboard/metabolic?error=${encodeURIComponent(`Dexcom authorization failed: ${error}`)}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: code and state' },
        { status: 400 }
      );
    }

    // Handle callback
    const dexcomService = createDexcomService();
    const personId = await dexcomService.handleCallback(code, state);

    console.log(`[API] Dexcom callback successful for person ${personId}`);

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard/metabolic?cgm_connected=true', request.url)
    );
  } catch (error) {
    console.error('[API] /api/metabolic/cgm/dexcom/callback error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.redirect(
      new URL(
        `/dashboard/metabolic?error=${encodeURIComponent('Failed to connect Dexcom account. Please try again.')}`,
        request.url
      )
    );
  }
}
