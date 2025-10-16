// apps/web/src/app/api/metabolic/cgm/dexcom/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { createDexcomService } from '@/lib/services/dexcom';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * DELETE /api/metabolic/cgm/dexcom/disconnect
 *
 * Disconnect Dexcom CGM account for authenticated user.
 * Removes stored tokens and connection record.
 *
 * Response: { success: boolean, message: string }
 *
 * Medical Disclaimer: Glucose data from CGM devices is for informational purposes only.
 * This system does not provide medical advice, diagnosis, or treatment recommendations.
 */
export async function DELETE(request: NextRequest) {
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

    // Disconnect Dexcom
    const dexcomService = createDexcomService();
    await dexcomService.disconnect(person.id);

    console.log(`[API] Disconnected Dexcom for user ${userId}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Dexcom account disconnected successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/metabolic/cgm/dexcom/disconnect error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to disconnect Dexcom account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
