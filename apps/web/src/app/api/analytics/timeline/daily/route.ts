import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * Daily Timeline API - Glucose and Meal Timeline
 *
 * GET /api/analytics/timeline/daily?date=YYYY-MM-DD
 *
 * Fetches all glucose readings and meal entries for the specified day.
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

    // Get Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    // Parse date and create date range for the entire day
    const startOfDay = new Date(dateParam);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateParam);
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
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        timestamp: true,
        value: true,
      },
    });

    // Fetch food entries for the day
    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        personId: person.id,
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        timestamp: true,
        mealType: true,
        ingredients: {
          select: {
            name: true,
          },
        },
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
      type: entry.mealType,
      name: entry.ingredients.map((ing) => ing.name).join(', ') || 'Meal',
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
