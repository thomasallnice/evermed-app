import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/person/me
 * Returns the current user's Person record
 * Used by upload page to get personId for storage paths
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const person = await prisma.person.findFirst({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        givenName: true,
        familyName: true,
      },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(person, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
