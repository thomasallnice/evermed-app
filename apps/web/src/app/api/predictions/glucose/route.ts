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
 *
 * NOTE: This endpoint is temporarily stubbed until metabolic insights migrations are run on staging.
 * The FoodEntry, GlucoseReading, and MLModel tables don't exist in the staging database yet.
 */

import { NextRequest, NextResponse } from "next/server";

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
  try {
    // Step 1: Authentication
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: x-user-id header required" },
        { status: 401 }
      );
    }

    // TODO: Re-enable after running metabolic insights migrations
    // The FoodEntry, GlucoseReading, and MLModel tables don't exist in staging yet
    // See: db/migrations/20251010090000_add_metabolic_insights/migration.sql

    return NextResponse.json(
      {
        error: "ML predictions not yet available",
        message:
          "Database migrations pending. Glucose predictions will be enabled after metabolic insights migrations are applied.",
        disclaimer: "This is NOT medical advice. Predictions are informational only.",
      },
      { status: 503 } // Service Unavailable
    );
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

  // TODO: Re-enable after running metabolic insights migrations
  // The FoodEntry table doesn't exist in staging yet

  return NextResponse.json({
    predictions: [],
    disclaimer: "This is NOT medical advice. Predictions are informational only.",
    message: "Prediction history will be available after metabolic insights migrations.",
  });
}
