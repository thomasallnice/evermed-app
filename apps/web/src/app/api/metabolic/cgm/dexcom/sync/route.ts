// apps/web/src/app/api/metabolic/cgm/dexcom/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { createDexcomService } from '@/lib/services/dexcom';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/metabolic/cgm/dexcom/sync
 *
 * Manually trigger sync of glucose readings from Dexcom API.
 * Fetches readings since last sync (or last 7 days if first sync).
 *
 * Request Body (optional):
 *  - startDate: ISO 8601 timestamp (e.g., "2025-01-01T00:00:00Z")
 *  - endDate: ISO 8601 timestamp (e.g., "2025-01-02T00:00:00Z")
 *
 * Response: { readingsImported: number, lastSyncAt: string }
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

    // Get person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Parse request body (optional date range)
    let startDate: string | undefined;
    let endDate: string | undefined;

    try {
      const body = await request.json();
      startDate = body.startDate;
      endDate = body.endDate;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Sync glucose readings
    const dexcomService = createDexcomService();
    const result = await dexcomService.syncGlucoseReadings(person.id, startDate, endDate);

    console.log(`[API] Synced ${result.readingsImported} Dexcom readings for user ${userId}`);

    return NextResponse.json(
      {
        readingsImported: result.readingsImported,
        lastSyncAt: result.lastSyncAt,
        syncCursor: result.syncCursor,
        disclaimer:
          'Glucose data is for informational purposes only. Do not use for diagnosis or treatment decisions.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/metabolic/cgm/dexcom/sync error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to sync glucose readings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
