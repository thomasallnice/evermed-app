/**
 * ML Pipeline Types for Glucose Prediction
 *
 * This module defines TypeScript interfaces for the machine learning pipeline,
 * including feature vectors, training datasets, and model metadata.
 */

export interface MealFeatures {
  // Nutrition features
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  fiberG: number;

  // Meal context features
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  mealTypeOneHot: number[]; // [breakfast, lunch, dinner, snack]

  // Time features (cyclical encoding)
  hourOfDay: number; // 0-23
  hourSin: number; // sin(2π * hour / 24)
  hourCos: number; // cos(2π * hour / 24)
  dayOfWeek: number; // 0-6 (Monday=0)
  dayOfWeekSin: number; // sin(2π * dayOfWeek / 7)
  dayOfWeekCos: number; // cos(2π * dayOfWeek / 7)
}

export interface GlucoseHistoryFeatures {
  // Last 3 hours of glucose readings (12 values at 15-min intervals)
  values: number[]; // Array of 12 glucose values (mg/dL)
  timestamps: Date[]; // Corresponding timestamps
  mean: number; // Average glucose in window
  std: number; // Standard deviation
  trend: "rising" | "stable" | "falling"; // Simple trend classification
}

export interface UserBaselineFeatures {
  avgGlucose: number; // User's typical glucose level
  stdGlucose: number; // User's typical variance
  avgCarbsPerMeal: number; // Typical carb intake
}

export interface FeatureVector {
  meal: MealFeatures;
  glucoseHistory: GlucoseHistoryFeatures;
  baseline: UserBaselineFeatures;
}

export interface TrainingExample {
  features: FeatureVector;
  target: {
    glucoseAt60Min: number; // Glucose level 60 min after meal
    glucoseAt120Min: number; // Glucose level 120 min after meal
  };
  metadata: {
    foodEntryId: string;
    timestamp: Date;
  };
}

export interface TrainingDataset {
  examples: TrainingExample[];
  split: {
    trainIndices: number[];
    validationIndices: number[];
    testIndices: number[];
  };
  stats: {
    totalExamples: number;
    dateRange: { start: Date; end: Date };
    avgGlucosePeak: number;
  };
}

export interface ModelPerformance {
  mae: number; // Mean Absolute Error (mg/dL)
  rmse: number; // Root Mean Squared Error (mg/dL)
  r2: number; // R² coefficient of determination
  sampleSize: number; // Number of test examples
}

export interface ModelMetadata {
  version: string; // Semantic version (e.g., "1.0.0")
  modelType: "glucose-prediction";
  features: string[]; // List of feature names used
  hyperparameters: {
    lstmUnits: number;
    lstmLayers: number;
    epochs: number;
    batchSize: number;
    learningRate: number;
  };
  training: {
    dataRange: { start: Date; end: Date };
    mealsCount: number;
    trainedAt: Date;
  };
  performance: ModelPerformance;
}

export interface PredictionResult {
  predictions: Array<{
    time: "+60min" | "+120min";
    glucose: number; // Predicted glucose value (mg/dL)
    confidence: "high" | "medium" | "low";
    confidenceScore: number; // 0-1
  }>;
  provenance: {
    modelVersion: string;
    trainedOn: string; // ISO date
    dataPoints: number;
    lastUsed: string; // ISO date
  };
  disclaimer: string; // Medical disclaimer from copy.ts
}

export interface RetrainingTrigger {
  type: "data-driven" | "time-driven" | "performance-driven" | "manual";
  reason: string;
  shouldRetrain: boolean;
  details?: {
    newMealsCount?: number;
    daysSinceLastTraining?: number;
    currentMAE?: number;
    targetMAE?: number;
  };
}
