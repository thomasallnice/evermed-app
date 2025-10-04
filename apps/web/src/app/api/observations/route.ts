import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

/**
 * GET /api/observations
 *
 * Returns a timeline of observations for a person, optionally filtered by lab code.
 *
 * Query parameters:
 * - personId (required): UUID of the person
 * - code (optional): specific lab code to filter by (e.g., "glucose", "HGB")
 *
 * Returns:
 * - 200: Array of observations ordered by effectiveAt DESC
 * - 400: Missing personId
 * - 403: User doesn't own the person
 * - 404: Person not found
 * - 500: Unexpected error
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const userId = await requireUserId(req);

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get('personId');
    const code = searchParams.get('code');

    if (!personId) {
      return NextResponse.json({ error: 'personId query parameter required' }, { status: 400 });
    }

    // Verify person exists and user owns it
    const person = await prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person) {
      return NextResponse.json({ error: 'person not found' }, { status: 404 });
    }

    if (person.ownerId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Build query filters
    const where: any = { personId };
    if (code) {
      where.code = code;
    }

    // Query observations with source document info
    const observations = await prisma.observation.findMany({
      where,
      include: {
        sourceDoc: {
          select: {
            id: true,
            filename: true,
            kind: true,
            topic: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: [
        { effectiveAt: 'desc' }, // Most recent first
        { id: 'desc' }, // Secondary sort for stability when effectiveAt is null
      ],
    });

    return NextResponse.json(observations);
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('[observations] Error:', e);
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
