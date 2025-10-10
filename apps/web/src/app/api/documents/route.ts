import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    // Fetch all documents for the authenticated user, ordered by upload date (newest first)
    const documents = await prisma.document.findMany({
      where: {
        person: {
          ownerId: userId,
        },
      },
      select: {
        id: true,
        filename: true,
        kind: true,
        storagePath: true,
        uploadedAt: true,
        topic: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
