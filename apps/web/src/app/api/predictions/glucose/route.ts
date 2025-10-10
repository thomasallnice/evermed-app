/**
 * POST /api/predictions/glucose
 *
 * Glucose Prediction API Endpoint
 *
 * Returns 1-2 hour glucose forecasts after a meal based on user's
 * personalized LSTM model trained on meal and glucose history.
 *
 * MEDICAL SAFETY: This is NOT medical advice. Predictions are informational
 * only and should NOT be used for insulin dosing, diagnosis, or treatment.
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getOrLoadModel } from "@/lib/ml/model-storage";
import { predict } from "@/lib/ml/training";
import {
  extractMealFeatures,
  extractGlucoseHistory,
  calculateUserBaseline,
  validateFeatures,
} from "@/lib/ml/feature-engineering";
import { getActiveModelVersion } from "@/lib/ml/versioning";
import { GLUCOSE_PREDICTION_DISCLAIMER } from "@/lib/copy";
import type { PredictionResult } from "@/lib/ml/types";

const prisma = new PrismaClient();

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
  try {
    // Step 1: Authentication
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: x-user-id header required" },
        { status: 401 }
      );
    }

    // Step 2: Parse request body
    const body: PredictionRequest = await req.json();

    // Step 3: Get or create meal data
    let mealData;
    if (body.mealId) {
      // Load existing meal
      const meal = await prisma.foodEntry.findUnique({
        where: { id: body.mealId },
      });

      if (!meal || meal.personId !== userId) {
        return NextResponse.json(
          { error: "Meal not found or access denied" },
          { status: 404 }
        );
      }

      mealData = {
        totalCalories: meal.totalCalories,
        totalCarbsG: meal.totalCarbsG,
        totalProteinG: meal.totalProteinG,
        totalFatG: meal.totalFatG,
        totalFiberG: meal.totalFiberG,
        mealType: meal.mealType,
        timestamp: meal.timestamp,
      };
    } else if (body.meal) {
      // Use inline meal data
      mealData = {
        totalCalories: body.meal.calories,
        totalCarbsG: body.meal.carbsG,
        totalProteinG: body.meal.proteinG,
        totalFatG: body.meal.fatG,
        totalFiberG: body.meal.fiberG,
        mealType: body.meal.mealType,
        timestamp: new Date(body.meal.timestamp),
      };
    } else {
      return NextResponse.json(
        { error: "Either mealId or meal data required" },
        { status: 400 }
      );
    }

    // Step 4: Extract features
    const mealFeatures = extractMealFeatures(mealData);
    const glucoseHistory = await extractGlucoseHistory(
      userId,
      mealData.timestamp
    );
    const baseline = await calculateUserBaseline(userId);

    const featureVector = {
      meal: mealFeatures,
      glucoseHistory,
      baseline,
    };

    // Step 5: Validate features
    try {
      validateFeatures(featureVector);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid meal data",
          details: error instanceof Error ? error.message : "Validation failed",
        },
        { status: 400 }
      );
    }

    // Step 6: Load user's model
    const modelType = "glucose-prediction";
    let model;
    let modelMetadata;

    try {
      const loaded = await getOrLoadModel(userId, modelType);
      model = loaded.modelData;
      modelMetadata = loaded.metadata;
    } catch (error) {
      // No model found - user needs to train first
      return NextResponse.json(
        {
          error: "No trained model available",
          message:
            "You need at least 7 days of meal and glucose data to generate predictions. Please continue logging meals and glucose readings.",
        },
        { status: 404 }
      );
    }

    // Step 7: Run prediction
    const prediction = predict(model, featureVector);

    // Step 8: Determine confidence based on data quality
    const hasEnoughHistory = glucoseHistory.values.length === 12;
    const recentGlucoseStable = glucoseHistory.std < 30; // mg/dL

    const confidence60Min = hasEnoughHistory && recentGlucoseStable ? "high" : "medium";
    const confidence120Min = hasEnoughHistory && recentGlucoseStable ? "medium" : "low";

    // Step 9: Build response
    const result: PredictionResult = {
      predictions: [
        {
          time: "+60min",
          glucose: Math.round(prediction.glucose60Min),
          confidence: confidence60Min,
          confidenceScore: confidence60Min === "high" ? 0.85 : 0.65,
        },
        {
          time: "+120min",
          glucose: Math.round(prediction.glucose120Min),
          confidence: confidence120Min,
          confidenceScore: confidence120Min === "medium" ? 0.70 : 0.50,
        },
      ],
      provenance: {
        modelVersion: modelMetadata.version,
        trainedOn: modelMetadata.training.trainedAt.toISOString().split("T")[0],
        dataPoints: modelMetadata.training.mealsCount,
        lastUsed: new Date().toISOString(),
      },
      disclaimer: GLUCOSE_PREDICTION_DISCLAIMER,
    };

    // Step 10: Log prediction for monitoring (non-PHI)
    await prisma.analyticsEvent.create({
      data: {
        eventType: "feature_usage",
        eventName: "ml_prediction_generated",
        metadata: {
          modelVersion: modelMetadata.version,
          mealType: mealFeatures.mealType,
          confidence60Min,
          confidence120Min,
        },
        sessionId: null, // No session tracking for server-side API calls
      },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Prediction error:", error);

    return NextResponse.json(
      {
        error: "Prediction failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/predictions/glucose
 *
 * Get prediction history for a user (optional future feature)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized: x-user-id header required" },
      { status: 401 }
    );
  }

  // Fetch recent predictions from FoodEntry.predictedGlucosePeak
  const recentMeals = await prisma.foodEntry.findMany({
    where: {
      personId: userId,
      predictedGlucosePeak: { not: null },
    },
    orderBy: { timestamp: "desc" },
    take: 10,
    select: {
      id: true,
      timestamp: true,
      mealType: true,
      predictedGlucosePeak: true,
      actualGlucosePeak: true,
    },
  });

  return NextResponse.json({
    predictions: recentMeals.map((meal) => ({
      mealId: meal.id,
      timestamp: meal.timestamp,
      mealType: meal.mealType,
      predicted: meal.predictedGlucosePeak,
      actual: meal.actualGlucosePeak,
      accuracy:
        meal.actualGlucosePeak && meal.predictedGlucosePeak
          ? Math.abs(meal.actualGlucosePeak - meal.predictedGlucosePeak)
          : null,
    })),
    disclaimer: GLUCOSE_PREDICTION_DISCLAIMER,
  });
}
