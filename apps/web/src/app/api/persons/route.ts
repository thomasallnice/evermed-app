import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const persons = await prisma.person.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        givenName: true,
        familyName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ persons });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const { givenName, familyName, birthYear, sexAtBirth, locale } = body;

    const person = await prisma.person.create({
      data: {
        ownerId: userId,
        givenName: givenName || null,
        familyName: familyName || null,
        birthYear: birthYear ? parseInt(birthYear) : null,
        sexAtBirth: sexAtBirth || null,
        locale: locale || 'en-US'
      }
    });

    return NextResponse.json({ person });
  } catch (e: any) {
    if (e?.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'Unexpected' }, { status: 500 });
  }
}
