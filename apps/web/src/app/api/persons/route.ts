import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || '';
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const persons = await prisma.person.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, givenName: true, familyName: true },
    });

    return NextResponse.json({ persons });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

