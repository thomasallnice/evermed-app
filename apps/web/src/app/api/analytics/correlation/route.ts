import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * Analytics Correlation API - Meal Impact Analysis
 *
 * GET /api/analytics/correlation?startDate=X&endDate=Y
 *
 * NOTE: This endpoint is temporarily stubbed until metabolic insights migrations are run on staging.
 * The FoodEntry and GlucoseReading tables don't exist in the staging database yet.
 *
 * Once migrations are applied, this endpoint will:
 * - Analyze correlation between meals and glucose responses
 * - Calculate peak glucose and average rise after meals
 * - Rate meals as good/moderate/poor based on glucose impact
 * - Return best and worst meals for the date range
 */
export async function GET(req: NextRequest) {
  console.log('[CORRELATION API] Request received')
  try {
    const userId = await requireUserId(req);
    console.log(`[CORRELATION API] User ID: ${userId}`)

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log(`[CORRELATION API] Date range: ${startDate} to ${endDate}`)

    if (!startDate || !endDate) {
      console.error('[CORRELATION API] Missing date parameters')
      return NextResponse.json(
        { error: 'Missing startDate or endDate parameter' },
        { status: 400 }
      );
    }

    // TODO: Re-enable after running metabolic insights migrations
    // See: db/migrations/20251010090000_add_metabolic_insights/migration.sql

    // Return placeholder data for staging deployment
    console.log('[CORRELATION API] ✓ Returning placeholder data (migrations pending)')
    return NextResponse.json(
      {
        bestMeals: [],
        worstMeals: [],
        message: 'Metabolic insights not yet available. Database migrations pending.',
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[CORRELATION API] ❌ Error:', e);
    console.error('[CORRELATION API] Error message:', e?.message);
    console.error('[CORRELATION API] Error stack:', e?.stack);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
