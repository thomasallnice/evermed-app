import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * Daily Timeline API - Glucose and Meal Timeline
 *
 * GET /api/analytics/timeline/daily?date=YYYY-MM-DD
 *
 * NOTE: This endpoint is temporarily stubbed until metabolic insights migrations are run on staging.
 * The GlucoseReading and FoodEntry tables don't exist in the staging database yet.
 *
 * Once migrations are applied, this endpoint will:
 * - Fetch all glucose readings for the specified day
 * - Fetch all meal entries for the specified day
 * - Return formatted timeline data for visualization
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    // TODO: Re-enable after running metabolic insights migrations
    // See: db/migrations/20251010090000_add_metabolic_insights/migration.sql

    // Return placeholder data for staging deployment
    return NextResponse.json(
      {
        glucose: [],
        meals: [],
        message: 'Metabolic insights not yet available. Database migrations pending.',
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('Timeline daily error:', e);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
