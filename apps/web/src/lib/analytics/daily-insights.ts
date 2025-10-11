// Daily Insights Generation Algorithm
// Generates daily summary insights and stores in MetabolicInsight table
// Pattern detection: glucose trends, meal frequency, spike count
// Privacy-first: All queries filter by personId (RLS enforcement)

import { PrismaClient } from "@prisma/client";
import { DailyInsightsData, MealSummary } from "./types";
import { METABOLIC_INSIGHTS_DISCLAIMER } from "../copy";
import { getGlucoseStats, getMealStats } from "./timeline-queries";
import { correlateMealsInRange } from "./glucose-correlation";

const prisma = new PrismaClient();

/**
 * Generate daily insights for a specific date
 * Stores result in MetabolicInsight table with insightType: "daily_summary"
 * Returns the generated insights data
 */
export async function generateDailyInsights(
  personId: string,
  date: Date
): Promise<DailyInsightsData> {
  // Calculate date boundaries (midnight to midnight)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get glucose statistics for the day
  const glucoseStats = await getGlucoseStats(personId, startOfDay, endOfDay);

  // Get meal statistics for the day
  const mealStats = await getMealStats(personId, startOfDay, endOfDay);

  // Get meal-glucose correlations
  const correlations = await correlateMealsInRange(
    personId,
    startOfDay,
    endOfDay
  );

  // Find best and worst meals (only high/medium confidence)
  const reliableCorrelations = correlations.filter(
    (c) => c.confidence === "high" || c.confidence === "medium"
  );

  let bestMeal: MealSummary | null = null;
  let worstMeal: MealSummary | null = null;

  if (reliableCorrelations.length > 0) {
    // Sort by glucose change
    const sorted = [...reliableCorrelations].sort(
      (a, b) => a.glucoseResponse.change - b.glucoseResponse.change
    );

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    bestMeal = {
      name: best.mealName,
      glucoseChange: best.glucoseResponse.change,
      mealType: best.mealType,
    };

    worstMeal = {
      name: worst.mealName,
      glucoseChange: worst.glucoseResponse.change,
      mealType: worst.mealType,
    };
  }

  // Build insights data
  const insightsData: DailyInsightsData = {
    avgGlucose: glucoseStats.avgGlucose,
    timeInRange: glucoseStats.timeInRange,
    spikeCount: glucoseStats.spikeCount,
    mealCount: mealStats.mealsByType,
    bestMeal,
    worstMeal,
  };

  // Store in MetabolicInsight table
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  // Check if insight already exists
  const existing = await prisma.metabolicInsight.findFirst({
    where: {
      personId,
      date: dateOnly,
      insightType: "daily_summary",
    },
  });

  if (existing) {
    // Update existing insight
    await prisma.metabolicInsight.update({
      where: {
        id: existing.id,
      },
      data: {
        insightData: insightsData as any, // JSON field
      },
    });
  } else {
    // Create new insight
    await prisma.metabolicInsight.create({
      data: {
        personId,
        date: dateOnly,
        insightType: "daily_summary",
        insightData: insightsData as any, // JSON field
      },
    });
  }

  return insightsData;
}

/**
 * Get stored daily insights for a specific date
 * Returns null if insights haven't been generated yet
 */
export async function getDailyInsights(
  personId: string,
  date: Date
): Promise<
  | (DailyInsightsData & { generatedAt: Date; disclaimer: string })
  | null
> {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const insight = await prisma.metabolicInsight.findFirst({
    where: {
      personId, // CRITICAL: RLS enforcement
      date: dateOnly,
      insightType: "daily_summary",
    },
    select: {
      insightData: true,
      createdAt: true,
    },
  });

  if (!insight) return null;

  return {
    ...(insight.insightData as unknown as DailyInsightsData),
    generatedAt: insight.createdAt,
    disclaimer: METABOLIC_INSIGHTS_DISCLAIMER,
  };
}

/**
 * Batch generate daily insights for a date range
 * Useful for backfilling insights after data import
 * Returns count of insights generated
 */
export async function batchGenerateDailyInsights(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const insights: DailyInsightsData[] = [];
  const currentDate = new Date(startDate);

  // Generate insights for each day in range
  while (currentDate <= endDate) {
    try {
      await generateDailyInsights(personId, new Date(currentDate));
      insights.push(await generateDailyInsights(personId, new Date(currentDate)));
    } catch (error) {
      console.error(
        `Failed to generate insights for ${currentDate.toISOString()}:`,
        error
      );
      // Continue to next day even if one fails
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return insights.length;
}

/**
 * Detect patterns in glucose trends over time
 * Returns personalized insights based on historical data
 */
export async function detectGlucosePatterns(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  patterns: Array<{
    type: string;
    description: string;
    confidence: "high" | "medium" | "low";
  }>;
  disclaimer: string;
}> {
  // Get all daily insights in range
  const insights = await prisma.metabolicInsight.findMany({
    where: {
      personId, // CRITICAL: RLS enforcement
      date: {
        gte: startDate,
        lte: endDate,
      },
      insightType: "daily_summary",
    },
    select: {
      insightData: true,
      date: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  const patterns: Array<{
    type: string;
    description: string;
    confidence: "high" | "medium" | "low";
  }> = [];

  if (insights.length < 7) {
    // Not enough data for pattern detection
    return {
      patterns: [
        {
          type: "insufficient_data",
          description: "Need at least 7 days of data for pattern detection",
          confidence: "low",
        },
      ],
      disclaimer: METABOLIC_INSIGHTS_DISCLAIMER,
    };
  }

  // Extract daily data
  // Use 'unknown' intermediate to safely cast from JsonValue to DailyInsightsData
  const dailyData = insights.map((i: any) => i.insightData as unknown as DailyInsightsData);

  // Pattern 1: Consistent high glucose (avg > 180 for 50%+ of days)
  const highGlucoseDays = dailyData.filter((d: any) => d.avgGlucose > 180).length;
  if (highGlucoseDays / dailyData.length > 0.5) {
    patterns.push({
      type: "high_glucose_trend",
      description: `Your average glucose was high (>180 mg/dL) on ${highGlucoseDays} of ${dailyData.length} days. Consider reviewing your diet with your doctor.`,
      confidence: "high",
    });
  }

  // Pattern 2: Low time in range (< 50% on average)
  const avgTimeInRange =
    dailyData.reduce((sum: number, d) => sum + d.timeInRange, 0) / dailyData.length;
  if (avgTimeInRange < 50) {
    patterns.push({
      type: "low_time_in_range",
      description: `Your average time in target range (70-180 mg/dL) was ${Math.round(avgTimeInRange)}%. Aim for at least 70% time in range.`,
      confidence: "high",
    });
  }

  // Pattern 3: Frequent spikes (avg > 3 spikes per day)
  const avgSpikes =
    dailyData.reduce((sum: number, d) => sum + d.spikeCount, 0) / dailyData.length;
  if (avgSpikes > 3) {
    patterns.push({
      type: "frequent_spikes",
      description: `You averaged ${Math.round(avgSpikes)} glucose spikes per day. Consider smaller, more frequent meals.`,
      confidence: "medium",
    });
  }

  // Pattern 4: Improving trend (last 3 days better than previous 3 days)
  if (dailyData.length >= 6) {
    const recent = dailyData.slice(-3);
    const previous = dailyData.slice(-6, -3);

    const recentAvg =
      recent.reduce((sum: number, d) => sum + d.avgGlucose, 0) / recent.length;
    const previousAvg =
      previous.reduce((sum: number, d) => sum + d.avgGlucose, 0) / previous.length;

    if (recentAvg < previousAvg - 10) {
      patterns.push({
        type: "improving_trend",
        description: `Great progress! Your average glucose improved by ${Math.round(previousAvg - recentAvg)} mg/dL in the last 3 days.`,
        confidence: "medium",
      });
    }
  }

  // Pattern 5: Meal consistency (eating regular meals)
  const avgMealsPerDay =
    dailyData.reduce(
      (sum, d) =>
        sum +
        d.mealCount.breakfast +
        d.mealCount.lunch +
        d.mealCount.dinner +
        d.mealCount.snack,
      0
    ) / dailyData.length;

  if (avgMealsPerDay >= 3 && avgMealsPerDay <= 5) {
    patterns.push({
      type: "consistent_meals",
      description: `You're eating ${Math.round(avgMealsPerDay)} meals per day on average. Consistent meal timing helps stabilize glucose.`,
      confidence: "medium",
    });
  }

  return {
    patterns,
    disclaimer: METABOLIC_INSIGHTS_DISCLAIMER,
  };
}
