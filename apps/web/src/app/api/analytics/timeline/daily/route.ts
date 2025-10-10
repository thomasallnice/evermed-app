import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

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

    // Get person ID
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    // Parse date and create range for the selected day
    const selectedDate = new Date(dateParam);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch glucose readings for the day
    const glucoseReadings = await prisma.glucoseReading.findMany({
      where: {
        personId: person.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        timestamp: true,
        value: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Fetch meal entries for the day
    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        personId: person.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        timestamp: true,
        mealType: true,
        notes: true,
        ingredients: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Format glucose data
    const glucose = glucoseReadings.map((reading) => ({
      timestamp: reading.timestamp.toISOString(),
      value: reading.value,
    }));

    // Format meal data
    const meals = foodEntries.map((entry) => ({
      timestamp: entry.timestamp.toISOString(),
      name: entry.notes || entry.ingredients.map((i) => i.name).join(', ') || 'Meal',
      type: entry.mealType,
    }));

    return NextResponse.json(
      {
        glucose,
        meals,
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
