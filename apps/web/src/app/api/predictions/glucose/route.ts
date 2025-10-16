/**
 * POST /api/predictions/glucose
 *
 * Glucose Prediction API Endpoint
 *
 * Returns 1-2 hour glucose forecasts after a meal based on simple baseline model.
 *
 * MEDICAL SAFETY: This is NOT medical advice. Predictions are informational
 * only and should NOT be used for insulin dosing, diagnosis, or treatment.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { requireUserId } from '@/lib/auth';
import { GLUCOSE_PREDICTION_DISCLAIMER } from '@/lib/copy';

const prisma = new PrismaClient();

// Force dynamic rendering (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * Request body schema
 */
interface PredictionRequest {
  // Option 1: Reference existing meal
  mealId?: string;

  // Option 2: Inline meal data
  meal?: {
    calories: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
    fiberG: number;
    mealType: "breakfast" | "lunch" | "dinner" | "snack";
    timestamp: string; // ISO date string
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log('[PREDICTION API] Request received');
  try {
    // Step 1: Authentication
    const userId = await requireUserId(req);
    console.log(`[PREDICTION API] User ID: ${userId}`);

    // Step 2: Parse request body
    const body: PredictionRequest = await req.json();
    console.log('[PREDICTION API] Request body:', JSON.stringify(body, null, 2));

    // Step 3: Get Person record
    const person = await prisma.person.findFirst({
      where: { ownerId: userId },
    });

    if (!person) {
      console.error('[PREDICTION API] Person record not found');
      return NextResponse.json(
        { error: 'Person record not found' },
        { status: 404 }
      );
    }

    console.log(`[PREDICTION API] Person ID: ${person.id}`);

    // Step 4: Get meal data (either from mealId or inline)
    let mealData: {
      calories: number;
      carbsG: number;
      proteinG: number;
      fatG: number;
      fiberG: number;
      mealType: string;
      timestamp: Date;
    };

    if (body.mealId) {
      // Fetch existing meal
      const foodEntry = await prisma.foodEntry.findUnique({
        where: { id: body.mealId },
      });

      if (!foodEntry || foodEntry.personId !== person.id) {
        return NextResponse.json(
          { error: 'Meal not found' },
          { status: 404 }
        );
      }

      mealData = {
        calories: foodEntry.totalCalories,
        carbsG: foodEntry.totalCarbsG,
        proteinG: foodEntry.totalProteinG,
        fatG: foodEntry.totalFatG,
        fiberG: foodEntry.totalFiberG,
        mealType: foodEntry.mealType,
        timestamp: foodEntry.timestamp,
      };
    } else if (body.meal) {
      // Use inline meal data
      mealData = {
        ...body.meal,
        timestamp: new Date(body.meal.timestamp),
      };
    } else {
      return NextResponse.json(
        { error: 'Either mealId or meal data must be provided' },
        { status: 400 }
      );
    }

    console.log('[PREDICTION API] Meal data:', mealData);

    // Step 5: Get most recent glucose reading
    const recentGlucose = await prisma.glucoseReading.findFirst({
      where: {
        personId: person.id,
        timestamp: {
          lte: mealData.timestamp,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Use baseline glucose (110 mg/dL if no recent reading)
    const baselineGlucose = recentGlucose?.value || 110;
    console.log(`[PREDICTION API] Baseline glucose: ${baselineGlucose} mg/dL`);

    // Step 6: Generate mock prediction using simple formula
    const prediction = generateMockPrediction(baselineGlucose, mealData, person);

    console.log('[PREDICTION API] ✓ Prediction generated');

    return NextResponse.json(
      {
        predictions: prediction.points,
        baseline: baselineGlucose,
        peakValue: prediction.peak,
        peakTime: prediction.peakTime,
        confidenceRange: {
          lower: prediction.lowerBound,
          upper: prediction.upperBound,
        },
        model: 'baseline-v1.0',
        disclaimer: GLUCOSE_PREDICTION_DISCLAIMER,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[PREDICTION API] ❌ Error:', error);
    console.error('[PREDICTION API] Error message:', error?.message);
    console.error('[PREDICTION API] Error stack:', error?.stack);

    return NextResponse.json(
      {
        error: 'Prediction failed',
        message: error?.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock glucose prediction using simple baseline model
 *
 * Formula:
 * - Peak = baseline + (carbs * 3) - (fiber * 5) - (fat * 0.5)
 * - Peak occurs at 60-90 minutes after meal
 * - Confidence range: ±20%
 * - Returns to baseline after 2 hours
 */
function generateMockPrediction(
  baseline: number,
  meal: {
    carbsG: number;
    proteinG: number;
    fatG: number;
    fiberG: number;
    timestamp: Date;
  },
  person: any
) {
  // Simple glycemic response model
  const carbImpact = meal.carbsG * 3; // ~3 mg/dL per gram of carbs
  const fiberMitigation = meal.fiberG * 5; // Fiber reduces spike
  const fatDelay = meal.fatG * 0.5; // Fat slows absorption

  // Calculate peak glucose
  const peakIncrease = Math.max(0, carbImpact - fiberMitigation - fatDelay);
  const peakGlucose = Math.min(baseline + peakIncrease, 250); // Cap at 250 mg/dL

  // Peak occurs 60-90 minutes after meal (depending on fat content)
  const peakTimeMinutes = 60 + Math.min(meal.fatG * 0.5, 30);

  // Generate prediction curve (15-minute intervals for 2 hours)
  const points: { timestamp: string; value: number }[] = [];
  const intervals = [0, 15, 30, 45, 60, 75, 90, 105, 120];

  intervals.forEach((minutes) => {
    const timestamp = new Date(meal.timestamp.getTime() + minutes * 60 * 1000);

    let value: number;
    if (minutes === 0) {
      value = baseline;
    } else if (minutes <= peakTimeMinutes) {
      // Rising phase (sigmoid curve)
      const progress = minutes / peakTimeMinutes;
      value = baseline + peakIncrease * Math.sin((progress * Math.PI) / 2);
    } else {
      // Falling phase (exponential decay)
      const decay = (minutes - peakTimeMinutes) / (120 - peakTimeMinutes);
      value = peakGlucose - (peakGlucose - baseline) * decay;
    }

    points.push({
      timestamp: timestamp.toISOString(),
      value: Math.round(value * 10) / 10,
    });
  });

  // Calculate confidence bounds (±20%)
  const confidenceMargin = 0.2;
  const lowerBound = points.map((p) => ({
    timestamp: p.timestamp,
    value: Math.round(p.value * (1 - confidenceMargin) * 10) / 10,
  }));
  const upperBound = points.map((p) => ({
    timestamp: p.timestamp,
    value: Math.round(p.value * (1 + confidenceMargin) * 10) / 10,
  }));

  return {
    points,
    peak: Math.round(peakGlucose * 10) / 10,
    peakTime: new Date(meal.timestamp.getTime() + peakTimeMinutes * 60 * 1000).toISOString(),
    lowerBound,
    upperBound,
  };
}

/**
 * GET /api/predictions/glucose
 *
 * Get recent predictions for a user
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireUserId(req);

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

    // Get recent meals with predictions
    const recentMeals = await prisma.foodEntry.findMany({
      where: {
        personId: person.id,
        predictedGlucosePeak: { not: null },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 10,
      select: {
        id: true,
        timestamp: true,
        mealType: true,
        predictedGlucosePeak: true,
        actualGlucosePeak: true,
        totalCalories: true,
        totalCarbsG: true,
      },
    });

    return NextResponse.json({
      predictions: recentMeals,
      disclaimer: GLUCOSE_PREDICTION_DISCLAIMER,
    });
  } catch (error: any) {
    console.error('[PREDICTION API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
