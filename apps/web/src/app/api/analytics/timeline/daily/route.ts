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
  console.log('[TIMELINE API] Request received')
  try {
    const userId = await requireUserId(req);
    console.log(`[TIMELINE API] User ID: ${userId}`)

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    console.log(`[TIMELINE API] Date parameter: ${dateParam}`)

    if (!dateParam) {
      console.error('[TIMELINE API] Missing date parameter')
      return NextResponse.json(
        { error: 'Missing date parameter' },
        { status: 400 }
      );
    }

    // Get Person record
    console.log('[TIMELINE API] Fetching person record...')
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      console.error('[TIMELINE API] Person record not found')
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    console.log(`[TIMELINE API] Person ID: ${person.id}`)

    // Parse date and create date range for the entire day
    const startOfDay = new Date(dateParam);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateParam);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`[TIMELINE API] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`)

    // Fetch glucose readings for the day
    console.log('[TIMELINE API] Fetching glucose readings...')
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

    console.log(`[TIMELINE API] Found ${glucoseReadings.length} glucose readings`)

    // Fetch food entries for the day
    console.log('[TIMELINE API] Fetching food entries...')
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

    console.log(`[TIMELINE API] Found ${foodEntries.length} food entries`)

    // Format glucose data
    console.log('[TIMELINE API] Formatting response data...')
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

    console.log(`[TIMELINE API] ✓ Success! Returning ${glucose.length} glucose readings and ${meals.length} meals`)

    return NextResponse.json(
      {
        glucose,
        meals,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('[TIMELINE API] ❌ Error:', e);
    console.error('[TIMELINE API] Error message:', e?.message);
    console.error('[TIMELINE API] Error stack:', e?.stack);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
