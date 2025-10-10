// Glucose-Meal Correlation Algorithm
// Detects glucose spikes after meals and calculates correlation with confidence scoring
// Privacy-first: All queries filter by personId (RLS enforcement)

import { PrismaClient } from "@prisma/client";
import {
  GlucoseMealCorrelation,
  ConfidenceLevel,
  GlucoseResponse,
} from "./types";
import { GLUCOSE_CORRELATION_DISCLAIMER } from "../copy";

const prisma = new PrismaClient();

// Constants for glucose spike detection
const SPIKE_THRESHOLD_ABSOLUTE = 180; // mg/dL
const SPIKE_THRESHOLD_RELATIVE = 50; // mg/dL increase
const MEAL_WINDOW_BEFORE_MINUTES = 30;
const MEAL_WINDOW_AFTER_MINUTES = 120;
const BASELINE_WINDOW_MINUTES = 30; // Time before meal to calculate baseline

/**
 * Calculate baseline glucose (average of readings 30 minutes before meal)
 */
async function calculateBaseline(
  personId: string,
  mealTimestamp: Date
): Promise<number | null> {
  const baselineStart = new Date(
    mealTimestamp.getTime() - BASELINE_WINDOW_MINUTES * 60 * 1000
  );

  const readings = await prisma.glucoseReading.findMany({
    where: {
      personId,
      timestamp: {
        gte: baselineStart,
        lt: mealTimestamp,
      },
    },
    select: {
      value: true,
    },
  });

  if (readings.length === 0) return null;

  const sum = readings.reduce((acc, r) => acc + r.value, 0);
  return sum / readings.length;
}

/**
 * Find peak glucose value and timing within 2 hours after meal
 */
async function findPeakGlucose(
  personId: string,
  mealTimestamp: Date
): Promise<{ peak: number; peakTime: Date } | null> {
  const windowEnd = new Date(
    mealTimestamp.getTime() + MEAL_WINDOW_AFTER_MINUTES * 60 * 1000
  );

  const readings = await prisma.glucoseReading.findMany({
    where: {
      personId,
      timestamp: {
        gte: mealTimestamp,
        lte: windowEnd,
      },
    },
    select: {
      value: true,
      timestamp: true,
    },
    orderBy: {
      value: "desc",
    },
    take: 1,
  });

  if (readings.length === 0) return null;

  return {
    peak: readings[0].value,
    peakTime: readings[0].timestamp,
  };
}

/**
 * Determine confidence level based on data availability
 * High: Both baseline and peak data available, multiple readings
 * Medium: Either baseline or peak missing, or few readings
 * Low: Very limited data
 */
async function calculateConfidence(
  personId: string,
  mealTimestamp: Date,
  hasBaseline: boolean,
  hasPeak: boolean
): Promise<ConfidenceLevel> {
  if (!hasBaseline || !hasPeak) return "low";

  const baselineStart = new Date(
    mealTimestamp.getTime() - BASELINE_WINDOW_MINUTES * 60 * 1000
  );
  const windowEnd = new Date(
    mealTimestamp.getTime() + MEAL_WINDOW_AFTER_MINUTES * 60 * 1000
  );

  const readingCount = await prisma.glucoseReading.count({
    where: {
      personId,
      timestamp: {
        gte: baselineStart,
        lte: windowEnd,
      },
    },
  });

  // High confidence: 10+ readings across the full window (avg 1 every 15 min)
  if (readingCount >= 10) return "high";
  // Medium confidence: 4-9 readings
  if (readingCount >= 4) return "medium";
  // Low confidence: < 4 readings
  return "low";
}

/**
 * Get meal name from ingredients (first 3 ingredients or "Mixed meal")
 */
function getMealName(ingredients: Array<{ name: string }>): string {
  if (ingredients.length === 0) return "Unnamed meal";
  if (ingredients.length === 1) return ingredients[0].name;
  if (ingredients.length === 2)
    return `${ingredients[0].name}, ${ingredients[1].name}`;
  return `${ingredients[0].name}, ${ingredients[1].name}, ${ingredients[2].name}`;
}

/**
 * Correlate a single meal with glucose response
 * Returns null if insufficient data
 */
export async function correlateMealWithGlucose(
  personId: string,
  mealId: string
): Promise<GlucoseMealCorrelation | null> {
  // Fetch meal with ingredients (RLS enforced via personId filter)
  const meal = await prisma.foodEntry.findFirst({
    where: {
      id: mealId,
      personId, // CRITICAL: RLS enforcement
    },
    select: {
      id: true,
      timestamp: true,
      mealType: true,
      totalCalories: true,
      ingredients: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!meal) return null;

  // Calculate baseline glucose
  const baseline = await calculateBaseline(personId, meal.timestamp);

  // Find peak glucose
  const peakData = await findPeakGlucose(personId, meal.timestamp);

  // If neither baseline nor peak available, cannot correlate
  if (!baseline && !peakData) return null;

  // Use baseline or fallback to 100 mg/dL (typical fasting glucose)
  const baselineValue = baseline ?? 100;
  const peakValue = peakData?.peak ?? baselineValue;
  const peakTime = peakData?.peakTime ?? meal.timestamp;

  const change = peakValue - baselineValue;
  const spiked =
    peakValue > SPIKE_THRESHOLD_ABSOLUTE ||
    change > SPIKE_THRESHOLD_RELATIVE;

  const glucoseResponse: GlucoseResponse = {
    baseline: Math.round(baselineValue * 10) / 10,
    peak: Math.round(peakValue * 10) / 10,
    peakTime: peakTime.toISOString(),
    change: Math.round(change * 10) / 10,
    spiked,
  };

  const confidence = await calculateConfidence(
    personId,
    meal.timestamp,
    !!baseline,
    !!peakData
  );

  return {
    mealId: meal.id,
    mealName: getMealName(meal.ingredients),
    mealType: meal.mealType,
    eatenAt: meal.timestamp.toISOString(),
    glucoseResponse,
    confidence,
  };
}

/**
 * Correlate all meals in a date range with glucose responses
 * Returns meals with correlation data, sorted by timestamp descending
 */
export async function correlateMealsInRange(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<GlucoseMealCorrelation[]> {
  // Fetch all meals in range (RLS enforced)
  const meals = await prisma.foodEntry.findMany({
    where: {
      personId, // CRITICAL: RLS enforcement
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      timestamp: "desc",
    },
  });

  // Correlate each meal with glucose response
  const correlations = await Promise.all(
    meals.map((meal) => correlateMealWithGlucose(personId, meal.id))
  );

  // Filter out nulls (meals with insufficient data)
  return correlations.filter(
    (c): c is GlucoseMealCorrelation => c !== null
  );
}

/**
 * Find best and worst meals for glucose control in a date range
 * Returns top 5 best (lowest glucose change) and top 5 worst (highest change)
 */
export async function findBestAndWorstMeals(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  best: GlucoseMealCorrelation[];
  worst: GlucoseMealCorrelation[];
  disclaimer: string;
}> {
  const correlations = await correlateMealsInRange(personId, startDate, endDate);

  // Filter to only high/medium confidence
  const reliableCorrelations = correlations.filter(
    (c) => c.confidence === "high" || c.confidence === "medium"
  );

  // Sort by glucose change (ascending for best, descending for worst)
  const sortedByChange = [...reliableCorrelations].sort(
    (a, b) => a.glucoseResponse.change - b.glucoseResponse.change
  );

  return {
    best: sortedByChange.slice(0, 5),
    worst: sortedByChange.slice(-5).reverse(),
    disclaimer: GLUCOSE_CORRELATION_DISCLAIMER,
  };
}

/**
 * Calculate average glucose response by meal type
 */
export async function averageGlucoseResponseByMealType(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<
  Record<
    string,
    {
      avgChange: number;
      spikeRate: number;
      count: number;
    }
  >
> {
  const correlations = await correlateMealsInRange(personId, startDate, endDate);

  // Group by meal type
  const grouped = correlations.reduce(
    (acc, c) => {
      if (!acc[c.mealType]) {
        acc[c.mealType] = [];
      }
      acc[c.mealType].push(c);
      return acc;
    },
    {} as Record<string, GlucoseMealCorrelation[]>
  );

  // Calculate averages
  const result: Record<
    string,
    { avgChange: number; spikeRate: number; count: number }
  > = {};

  for (const [mealType, meals] of Object.entries(grouped)) {
    const avgChange =
      meals.reduce((sum, m) => sum + m.glucoseResponse.change, 0) /
      meals.length;
    const spikeCount = meals.filter((m) => m.glucoseResponse.spiked).length;
    const spikeRate = spikeCount / meals.length;

    result[mealType] = {
      avgChange: Math.round(avgChange * 10) / 10,
      spikeRate: Math.round(spikeRate * 100) / 100,
      count: meals.length,
    };
  }

  return result;
}
