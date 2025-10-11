// Timeline Visualization Queries
// Optimized for dashboard rendering with Recharts/Tremor
// Privacy-first: All queries filter by personId (RLS enforcement)
// Performance target: p95 < 2s for all queries

import { PrismaClient } from "@prisma/client";
import {
  DailyTimeline,
  WeeklyTimeline,
  HourlyTimelineData,
  DailyAverageData,
} from "./types";

const prisma = new PrismaClient();

/**
 * Get daily timeline with hourly aggregations
 * Returns glucose readings and meals grouped by hour (0-23)
 * Optimized with database-level aggregations
 */
export async function getDailyTimeline(
  personId: string,
  date: Date
): Promise<DailyTimeline> {
  // Calculate date boundaries (midnight to midnight local time)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all glucose readings for the day (RLS enforced)
  const glucoseReadings = await prisma.glucoseReading.findMany({
    where: {
      personId, // CRITICAL: RLS enforcement
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
      timestamp: "asc",
    },
  });

  // Fetch all meals for the day (RLS enforced)
  const meals = await prisma.foodEntry.findMany({
    where: {
      personId, // CRITICAL: RLS enforcement
      timestamp: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      timestamp: true,
      mealType: true,
      totalCalories: true,
      ingredients: {
        select: {
          name: true,
        },
        take: 3, // Only first 3 ingredients for meal name
      },
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  // Group glucose readings by hour
  const glucoseByHour = new Map<number, number[]>();
  for (const reading of glucoseReadings) {
    const hour = reading.timestamp.getHours();
    if (!glucoseByHour.has(hour)) {
      glucoseByHour.set(hour, []);
    }
    glucoseByHour.get(hour)!.push(reading.value);
  }

  // Group meals by hour
  const mealsByHour = new Map<number, typeof meals>();
  for (const meal of meals) {
    const hour = meal.timestamp.getHours();
    if (!mealsByHour.has(hour)) {
      mealsByHour.set(hour, []);
    }
    mealsByHour.get(hour)!.push(meal);
  }

  // Build hourly timeline data (all 24 hours)
  const hourlyData: HourlyTimelineData[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const glucoseValues = glucoseByHour.get(hour) ?? [];
    const hourMeals = mealsByHour.get(hour) ?? [];

    const avgGlucose =
      glucoseValues.length > 0
        ? glucoseValues.reduce((sum: number, v: number) => sum + v, 0) / glucoseValues.length
        : 0;
    const minGlucose = glucoseValues.length > 0 ? Math.min(...glucoseValues) : 0;
    const maxGlucose = glucoseValues.length > 0 ? Math.max(...glucoseValues) : 0;

    hourlyData.push({
      hour,
      avgGlucose: Math.round(avgGlucose * 10) / 10,
      minGlucose: Math.round(minGlucose * 10) / 10,
      maxGlucose: Math.round(maxGlucose * 10) / 10,
      mealCount: hourMeals.length,
      meals: hourMeals.map((m: any) => ({
        name: m.ingredients.map((i: any) => i.name).join(", ") || "Unnamed meal",
        mealType: m.mealType,
        calories: Math.round(m.totalCalories),
      })),
    });
  }

  return {
    date: date.toISOString().split("T")[0], // YYYY-MM-DD
    hourlyData,
  };
}

/**
 * Get weekly timeline with daily aggregations
 * Returns daily averages, meal counts, and spike counts
 * Optimized with database-level groupBy aggregations
 */
export async function getWeeklyTimeline(
  personId: string,
  startDate: Date
): Promise<WeeklyTimeline> {
  // Calculate week boundaries (7 days)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  // Fetch all glucose readings for the week (RLS enforced)
  const glucoseReadings = await prisma.glucoseReading.findMany({
    where: {
      personId, // CRITICAL: RLS enforcement
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      timestamp: true,
      value: true,
    },
  });

  // Fetch all meals for the week (RLS enforced)
  const meals = await prisma.foodEntry.findMany({
    where: {
      personId, // CRITICAL: RLS enforcement
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      timestamp: true,
    },
  });

  // Group glucose readings by date
  const glucoseByDate = new Map<string, number[]>();
  for (const reading of glucoseReadings) {
    const dateKey = reading.timestamp.toISOString().split("T")[0];
    if (!glucoseByDate.has(dateKey)) {
      glucoseByDate.set(dateKey, []);
    }
    glucoseByDate.get(dateKey)!.push(reading.value);
  }

  // Group meals by date
  const mealsByDate = new Map<string, number>();
  for (const meal of meals) {
    const dateKey = meal.timestamp.toISOString().split("T")[0];
    mealsByDate.set(dateKey, (mealsByDate.get(dateKey) ?? 0) + 1);
  }

  // Build daily data for all 7 days
  const dailyData: DailyAverageData[] = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateKey = currentDate.toISOString().split("T")[0];

    const glucoseValues = glucoseByDate.get(dateKey) ?? [];
    const avgGlucose =
      glucoseValues.length > 0
        ? glucoseValues.reduce((sum: number, v: number) => sum + v, 0) / glucoseValues.length
        : 0;
    const minGlucose = glucoseValues.length > 0 ? Math.min(...glucoseValues) : 0;
    const maxGlucose = glucoseValues.length > 0 ? Math.max(...glucoseValues) : 0;

    // Count spikes (>180 mg/dL)
    const spikeCount = glucoseValues.filter((v: number) => v > 180).length;

    dailyData.push({
      date: dateKey,
      avgGlucose: Math.round(avgGlucose * 10) / 10,
      minGlucose: Math.round(minGlucose * 10) / 10,
      maxGlucose: Math.round(maxGlucose * 10) / 10,
      mealCount: mealsByDate.get(dateKey) ?? 0,
      spikeCount,
    });
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    dailyData,
  };
}

/**
 * Get glucose statistics for a date range (for cards/summary stats)
 * Returns aggregated metrics optimized for dashboard display
 */
export async function getGlucoseStats(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  avgGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  readingCount: number;
  spikeCount: number;
  timeInRange: number; // percentage (70-180 mg/dL)
}> {
  // Use aggregate for efficient calculation
  const stats = await prisma.glucoseReading.aggregate({
    where: {
      personId, // CRITICAL: RLS enforcement
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _avg: {
      value: true,
    },
    _min: {
      value: true,
    },
    _max: {
      value: true,
    },
    _count: {
      value: true,
    },
  });

  // Count spikes and time in range separately
  const [spikeCount, inRangeCount] = await Promise.all([
    prisma.glucoseReading.count({
      where: {
        personId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        value: {
          gt: 180,
        },
      },
    }),
    prisma.glucoseReading.count({
      where: {
        personId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        value: {
          gte: 70,
          lte: 180,
        },
      },
    }),
  ]);

  const totalCount = stats._count.value ?? 0;
  const timeInRange = totalCount > 0 ? (inRangeCount / totalCount) * 100 : 0;

  return {
    avgGlucose: Math.round((stats._avg.value ?? 0) * 10) / 10,
    minGlucose: Math.round((stats._min.value ?? 0) * 10) / 10,
    maxGlucose: Math.round((stats._max.value ?? 0) * 10) / 10,
    readingCount: totalCount,
    spikeCount,
    timeInRange: Math.round(timeInRange * 10) / 10,
  };
}

/**
 * Get meal statistics for a date range
 * Returns meal counts by type and total calories
 */
export async function getMealStats(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalMeals: number;
  mealsByType: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  totalCalories: number;
  avgCaloriesPerMeal: number;
}> {
  // Use groupBy for efficient aggregation by meal type
  const mealsByType = await prisma.foodEntry.groupBy({
    by: ["mealType"],
    where: {
      personId, // CRITICAL: RLS enforcement
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      totalCalories: true,
    },
  });

  // Build result object
  const result = {
    totalMeals: 0,
    mealsByType: {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    },
    totalCalories: 0,
    avgCaloriesPerMeal: 0,
  };

  for (const group of mealsByType) {
    result.mealsByType[group.mealType] = group._count.id;
    result.totalMeals += group._count.id;
    result.totalCalories += group._sum.totalCalories ?? 0;
  }

  result.avgCaloriesPerMeal =
    result.totalMeals > 0
      ? Math.round((result.totalCalories / result.totalMeals) * 10) / 10
      : 0;
  result.totalCalories = Math.round(result.totalCalories);

  return result;
}
