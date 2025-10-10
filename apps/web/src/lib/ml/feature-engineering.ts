/**
 * Feature Engineering Pipeline for Glucose Prediction
 *
 * This module extracts and transforms raw meal and glucose data into
 * feature vectors suitable for LSTM model training and inference.
 *
 * Medical Safety: All features are informational only. No diagnosis or dosing.
 */

import { PrismaClient, MealType } from "@prisma/client";
import type {
  MealFeatures,
  GlucoseHistoryFeatures,
  UserBaselineFeatures,
  FeatureVector,
  TrainingExample,
  TrainingDataset,
} from "./types";

const prisma = new PrismaClient();

/**
 * Extract meal features from a FoodEntry
 *
 * @param foodEntry - FoodEntry with nutrition data
 * @returns MealFeatures object with nutrition and time features
 */
export function extractMealFeatures(foodEntry: {
  totalCalories: number;
  totalCarbsG: number;
  totalProteinG: number;
  totalFatG: number;
  totalFiberG: number;
  mealType: MealType;
  timestamp: Date;
}): MealFeatures {
  const timestamp = new Date(foodEntry.timestamp);
  const hourOfDay = timestamp.getHours();
  const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Cyclical encoding for time features (preserves circular nature)
  const hourSin = Math.sin((2 * Math.PI * hourOfDay) / 24);
  const hourCos = Math.cos((2 * Math.PI * hourOfDay) / 24);
  const dayOfWeekSin = Math.sin((2 * Math.PI * dayOfWeek) / 7);
  const dayOfWeekCos = Math.cos((2 * Math.PI * dayOfWeek) / 7);

  // One-hot encode meal type
  const mealTypeOneHot = [
    foodEntry.mealType === "breakfast" ? 1 : 0,
    foodEntry.mealType === "lunch" ? 1 : 0,
    foodEntry.mealType === "dinner" ? 1 : 0,
    foodEntry.mealType === "snack" ? 1 : 0,
  ];

  return {
    calories: foodEntry.totalCalories,
    carbsG: foodEntry.totalCarbsG,
    proteinG: foodEntry.totalProteinG,
    fatG: foodEntry.totalFatG,
    fiberG: foodEntry.totalFiberG,
    mealType: foodEntry.mealType,
    mealTypeOneHot,
    hourOfDay,
    hourSin,
    hourCos,
    dayOfWeek,
    dayOfWeekSin,
    dayOfWeekCos,
  };
}

/**
 * Extract glucose history features (last 3 hours before meal)
 *
 * Interpolates glucose readings to 15-minute intervals to create
 * a fixed-length time series suitable for LSTM input.
 *
 * @param personId - User ID
 * @param beforeTime - Timestamp of the meal
 * @param windowHours - Number of hours to look back (default: 3)
 * @returns GlucoseHistoryFeatures with 12 interpolated values
 */
export async function extractGlucoseHistory(
  personId: string,
  beforeTime: Date,
  windowHours: number = 3
): Promise<GlucoseHistoryFeatures> {
  const windowStart = new Date(beforeTime.getTime() - windowHours * 60 * 60 * 1000);

  // Fetch glucose readings in the window
  const readings = await prisma.glucoseReading.findMany({
    where: {
      personId,
      timestamp: {
        gte: windowStart,
        lt: beforeTime,
      },
    },
    orderBy: { timestamp: "asc" },
  });

  if (readings.length === 0) {
    // No glucose data available - return default values
    return {
      values: Array(12).fill(100), // Default to ~100 mg/dL (normal fasting glucose)
      timestamps: [],
      mean: 100,
      std: 0,
      trend: "stable",
    };
  }

  // Interpolate to 15-minute intervals (12 values for 3 hours)
  const intervalMinutes = 15;
  const numIntervals = (windowHours * 60) / intervalMinutes;
  const interpolatedValues: number[] = [];
  const interpolatedTimestamps: Date[] = [];

  for (let i = 0; i < numIntervals; i++) {
    const targetTime = new Date(
      windowStart.getTime() + i * intervalMinutes * 60 * 1000
    );
    interpolatedTimestamps.push(targetTime);

    // Find nearest readings before and after target time
    const beforeReading = readings
      .filter((r) => r.timestamp <= targetTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    const afterReading = readings
      .filter((r) => r.timestamp > targetTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];

    if (beforeReading && afterReading) {
      // Linear interpolation
      const timeDiff =
        afterReading.timestamp.getTime() - beforeReading.timestamp.getTime();
      const targetDiff =
        targetTime.getTime() - beforeReading.timestamp.getTime();
      const ratio = targetDiff / timeDiff;
      const interpolated =
        beforeReading.value + ratio * (afterReading.value - beforeReading.value);
      interpolatedValues.push(interpolated);
    } else if (beforeReading) {
      // Only before reading available - use it
      interpolatedValues.push(beforeReading.value);
    } else if (afterReading) {
      // Only after reading available - use it
      interpolatedValues.push(afterReading.value);
    } else {
      // No readings available - use default
      interpolatedValues.push(100);
    }
  }

  // Calculate statistics
  const mean =
    interpolatedValues.reduce((sum, val) => sum + val, 0) /
    interpolatedValues.length;
  const variance =
    interpolatedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    interpolatedValues.length;
  const std = Math.sqrt(variance);

  // Determine trend (simple: compare last value to first value)
  const firstValue = interpolatedValues[0];
  const lastValue = interpolatedValues[interpolatedValues.length - 1];
  let trend: "rising" | "stable" | "falling";
  if (lastValue > firstValue + 10) {
    trend = "rising";
  } else if (lastValue < firstValue - 10) {
    trend = "falling";
  } else {
    trend = "stable";
  }

  return {
    values: interpolatedValues,
    timestamps: interpolatedTimestamps,
    mean,
    std,
    trend,
  };
}

/**
 * Calculate user baseline features from historical data
 *
 * @param personId - User ID
 * @param windowDays - Number of days to look back (default: 30)
 * @returns UserBaselineFeatures
 */
export async function calculateUserBaseline(
  personId: string,
  windowDays: number = 30
): Promise<UserBaselineFeatures> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  // Fetch glucose readings
  const glucoseReadings = await prisma.glucoseReading.findMany({
    where: {
      personId,
      timestamp: { gte: windowStart },
    },
  });

  // Fetch meal entries
  const meals = await prisma.foodEntry.findMany({
    where: {
      personId,
      timestamp: { gte: windowStart },
    },
  });

  // Calculate glucose baseline
  let avgGlucose = 100; // Default
  let stdGlucose = 15; // Default
  if (glucoseReadings.length > 0) {
    avgGlucose =
      glucoseReadings.reduce((sum, r) => sum + r.value, 0) /
      glucoseReadings.length;
    const variance =
      glucoseReadings.reduce(
        (sum, r) => sum + Math.pow(r.value - avgGlucose, 2),
        0
      ) / glucoseReadings.length;
    stdGlucose = Math.sqrt(variance);
  }

  // Calculate average carbs per meal
  let avgCarbsPerMeal = 50; // Default
  if (meals.length > 0) {
    avgCarbsPerMeal =
      meals.reduce((sum, m) => sum + m.totalCarbsG, 0) / meals.length;
  }

  return {
    avgGlucose,
    stdGlucose,
    avgCarbsPerMeal,
  };
}

/**
 * Create a complete training dataset from user's historical data
 *
 * Pairs meal features with glucose outcomes (60 min and 120 min post-meal).
 * Only includes examples where glucose data is available.
 *
 * @param personId - User ID
 * @param startDate - Start of training data range
 * @param endDate - End of training data range
 * @returns TrainingDataset with train/validation/test splits
 */
export async function createTrainingDataset(
  personId: string,
  startDate: Date,
  endDate: Date
): Promise<TrainingDataset> {
  // Fetch meals in date range
  const meals = await prisma.foodEntry.findMany({
    where: {
      personId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { timestamp: "asc" },
  });

  // Calculate user baseline
  const baseline = await calculateUserBaseline(personId);

  // Build training examples
  const examples: TrainingExample[] = [];

  for (const meal of meals) {
    // Extract meal features
    const mealFeatures = extractMealFeatures(meal);

    // Extract glucose history before meal
    const glucoseHistory = await extractGlucoseHistory(
      personId,
      meal.timestamp
    );

    // Fetch glucose readings 60 min and 120 min after meal
    const mealTime = meal.timestamp;
    const time60Min = new Date(mealTime.getTime() + 60 * 60 * 1000);
    const time120Min = new Date(mealTime.getTime() + 120 * 60 * 1000);

    const glucose60Min = await prisma.glucoseReading.findFirst({
      where: {
        personId,
        timestamp: {
          gte: new Date(time60Min.getTime() - 15 * 60 * 1000), // ±15 min tolerance
          lte: new Date(time60Min.getTime() + 15 * 60 * 1000),
        },
      },
      orderBy: { timestamp: "asc" },
    });

    const glucose120Min = await prisma.glucoseReading.findFirst({
      where: {
        personId,
        timestamp: {
          gte: new Date(time120Min.getTime() - 15 * 60 * 1000), // ±15 min tolerance
          lte: new Date(time120Min.getTime() + 15 * 60 * 1000),
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Only include example if both glucose readings are available
    if (glucose60Min && glucose120Min) {
      examples.push({
        features: {
          meal: mealFeatures,
          glucoseHistory,
          baseline,
        },
        target: {
          glucoseAt60Min: glucose60Min.value,
          glucoseAt120Min: glucose120Min.value,
        },
        metadata: {
          foodEntryId: meal.id,
          timestamp: meal.timestamp,
        },
      });
    }
  }

  // Temporal split: 70% train, 15% validation, 15% test
  const totalExamples = examples.length;
  const trainSize = Math.floor(totalExamples * 0.7);
  const validationSize = Math.floor(totalExamples * 0.15);

  const trainIndices = Array.from({ length: trainSize }, (_, i) => i);
  const validationIndices = Array.from(
    { length: validationSize },
    (_, i) => trainSize + i
  );
  const testIndices = Array.from(
    { length: totalExamples - trainSize - validationSize },
    (_, i) => trainSize + validationSize + i
  );

  // Calculate statistics
  const avgGlucosePeak =
    examples.reduce((sum, ex) => sum + ex.target.glucoseAt60Min, 0) /
    totalExamples;

  return {
    examples,
    split: {
      trainIndices,
      validationIndices,
      testIndices,
    },
    stats: {
      totalExamples,
      dateRange: { start: startDate, end: endDate },
      avgGlucosePeak,
    },
  };
}

/**
 * Validate feature vector for medical data sanity
 *
 * Ensures features are within reasonable ranges to catch
 * corrupted or anomalous data.
 *
 * @param features - FeatureVector to validate
 * @throws Error if validation fails
 */
export function validateFeatures(features: FeatureVector): void {
  const { meal, glucoseHistory } = features;

  // Validate meal features
  if (meal.calories < 0 || meal.calories > 5000) {
    throw new Error(`Invalid calories: ${meal.calories}`);
  }
  if (meal.carbsG < 0 || meal.carbsG > 500) {
    throw new Error(`Invalid carbs: ${meal.carbsG}g`);
  }
  if (meal.proteinG < 0 || meal.proteinG > 500) {
    throw new Error(`Invalid protein: ${meal.proteinG}g`);
  }
  if (meal.fatG < 0 || meal.fatG > 500) {
    throw new Error(`Invalid fat: ${meal.fatG}g`);
  }

  // Validate glucose history
  if (glucoseHistory.values.length !== 12) {
    throw new Error(
      `Invalid glucose history length: ${glucoseHistory.values.length} (expected 12)`
    );
  }
  for (const value of glucoseHistory.values) {
    if (value < 20 || value > 600) {
      throw new Error(`Invalid glucose value: ${value} mg/dL`);
    }
  }
}
