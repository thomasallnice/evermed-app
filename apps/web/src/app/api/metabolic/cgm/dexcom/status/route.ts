// apps/web/src/app/api/metabolic/cgm/dexcom/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { createDexcomService } from '@/lib/services/dexcom';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/metabolic/cgm/dexcom/status
 *
 * Get connection status for authenticated user's Dexcom account.
 *
 * Response: {
 *   connected: boolean,
 *   lastSyncAt: string | null,
 *   deviceId: string | null,
 *   error: string | null,
 *   provider: "dexcom"
 * }
 *
 * Medical Disclaimer: Glucose data from CGM devices is for informational purposes only.
 * This system does not provide medical advice, diagnosis, or treatment recommendations.
 */
export async function GET(request: NextRequest) {
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

    // Get connection status
    const dexcomService = createDexcomService();
    const status = await dexcomService.getConnectionStatus(person.id);

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('[API] /api/metabolic/cgm/dexcom/status error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to get connection status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
