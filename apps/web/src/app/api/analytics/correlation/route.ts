import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing startDate or endDate parameter' },
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

    // Parse dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch food entries with glucose readings
    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        personId: person.id,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      include: {
        glucoseReadings: {
          where: {
            // Get glucose readings within 2 hours after meal
            timestamp: {
              gte: start,
              lte: end,
            },
          },
          orderBy: {
            timestamp: 'asc',
          },
        },
        ingredients: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Calculate meal impact scores
    const mealImpacts = foodEntries
      .map((entry) => {
        const relevantReadings = entry.glucoseReadings.filter((reading) => {
          const mealTime = entry.timestamp.getTime();
          const readingTime = reading.timestamp.getTime();
          const diffMinutes = (readingTime - mealTime) / 1000 / 60;
          return diffMinutes >= 0 && diffMinutes <= 120; // Within 2 hours after meal
        });

        if (relevantReadings.length === 0) {
          return null;
        }

        const peakGlucose = Math.max(...relevantReadings.map((r) => r.value));
        const avgGlucose = relevantReadings.reduce((sum, r) => sum + r.value, 0) / relevantReadings.length;
        const avgRise = avgGlucose - (relevantReadings[0]?.value || avgGlucose);

        let rating: 'good' | 'moderate' | 'poor';
        if (peakGlucose < 140 && avgRise < 30) {
          rating = 'good';
        } else if (peakGlucose < 180 && avgRise < 50) {
          rating = 'moderate';
        } else {
          rating = 'poor';
        }

        return {
          id: entry.id,
          name: entry.notes || entry.ingredients.map((i) => i.name).join(', ') || 'Meal',
          timestamp: entry.timestamp.toISOString(),
          peakGlucose: Math.round(peakGlucose),
          avgRise: Math.round(avgRise),
          rating,
        };
      })
      .filter((impact) => impact !== null);

    // Sort and separate best/worst meals
    const goodMeals = mealImpacts.filter((m) => m.rating === 'good').slice(0, 5);
    const poorMeals = mealImpacts.filter((m) => m.rating === 'poor').slice(0, 5);

    return NextResponse.json(
      {
        bestMeals: goodMeals,
        worstMeals: poorMeals,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error('Correlation error:', e);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
