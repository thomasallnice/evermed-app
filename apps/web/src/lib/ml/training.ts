/**
 * LSTM Model Training Pipeline
 *
 * This module provides the training workflow for glucose prediction models.
 *
 * SPRINT 4 NOTE: This is a framework/mock implementation demonstrating
 * the ML pipeline architecture. Full LSTM implementation with TensorFlow.js
 * requires additional dependencies and training infrastructure.
 *
 * Medical Safety: Models produce informational forecasts only.
 * NOT for diagnosis, dosing, or treatment decisions.
 */

import { PrismaClient } from "@prisma/client";
import { createTrainingDataset, validateFeatures } from "./feature-engineering";
import { saveModel } from "./model-storage";
import type {
  TrainingDataset,
  ModelPerformance,
  ModelMetadata,
} from "./types";

const prisma = new PrismaClient();

export interface TrainingConfig {
  modelType: "glucose-prediction";
  hyperparameters: {
    lstmUnits: number;
    lstmLayers: number;
    epochs: number;
    batchSize: number;
    learningRate: number;
  };
  validation: {
    earlyStoppingPatience: number;
    minImprovementThreshold: number;
  };
}

const DEFAULT_CONFIG: TrainingConfig = {
  modelType: "glucose-prediction",
  hyperparameters: {
    lstmUnits: 64,
    lstmLayers: 2,
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
  },
  validation: {
    earlyStoppingPatience: 10,
    minImprovementThreshold: 0.001,
  },
};

/**
 * Train a glucose prediction model for a specific user
 *
 * ARCHITECTURE:
 * - Input: [meal features, glucose history, time features, baseline]
 * - LSTM layers (2 layers, 64 units each)
 * - Dense output layer (2 outputs: glucose at +60min, +120min)
 * - Loss: Mean Squared Error
 * - Optimizer: Adam with learning rate 0.001
 *
 * @param personId - User ID
 * @param config - Training configuration
 * @returns Trained model metadata
 */
export async function trainGlucoseModel(
  personId: string,
  config: TrainingConfig = DEFAULT_CONFIG
): Promise<ModelMetadata> {
  console.log(`Starting model training for user ${personId}...`);

  // Step 1: Validate minimum data requirements
  const minDays = 7;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - minDays * 24 * 60 * 60 * 1000);

  const mealCount = await prisma.foodEntry.count({
    where: {
      personId,
      timestamp: { gte: startDate, lte: endDate },
    },
  });

  if (mealCount < 21) {
    // At least 3 meals/day for 7 days
    throw new Error(
      `Insufficient training data: ${mealCount} meals (minimum 21 required for 7 days)`
    );
  }

  console.log(`Training data: ${mealCount} meals from last 7 days`);

  // Step 2: Create training dataset
  const dataset = await createTrainingDataset(personId, startDate, endDate);

  if (dataset.examples.length < 20) {
    throw new Error(
      `Insufficient paired meal-glucose data: ${dataset.examples.length} examples (minimum 20 required)`
    );
  }

  console.log(
    `Created dataset: ${dataset.examples.length} examples with train/val/test split`
  );

  // Step 3: Validate features
  for (const example of dataset.examples.slice(0, 10)) {
    // Validate first 10 examples
    validateFeatures(example.features);
  }

  // Step 4: MOCK TRAINING - Framework demonstration
  // TODO: Implement full TensorFlow.js LSTM training
  // For now, create a mock model with baseline predictions
  console.log("Training LSTM model...");
  console.log(`Hyperparameters: ${JSON.stringify(config.hyperparameters)}`);

  const mockModel = await trainMockLSTM(dataset, config);

  // Step 5: Evaluate model on test set
  const performance = evaluateModel(mockModel, dataset);

  console.log(`Model performance: MAE=${performance.mae.toFixed(2)} mg/dL, RMSE=${performance.rmse.toFixed(2)} mg/dL, R²=${performance.r2.toFixed(3)}`);

  // Step 6: Determine version number (increment MINOR version)
  const latestModel = await prisma.personalModel.findFirst({
    where: { personId, modelType: config.modelType },
    orderBy: { version: "desc" },
  });

  let newVersion = "1.0.0";
  if (latestModel) {
    const [major, minor, patch] = latestModel.version.split(".").map(Number);
    newVersion = `${major}.${minor + 1}.0`; // Increment MINOR version
  }

  // Step 7: Create metadata
  const metadata: ModelMetadata = {
    version: newVersion,
    modelType: config.modelType,
    features: [
      "calories",
      "carbsG",
      "proteinG",
      "fatG",
      "fiberG",
      "mealType",
      "hourSin",
      "hourCos",
      "dayOfWeekSin",
      "dayOfWeekCos",
      "glucoseHistory12",
      "avgGlucose",
      "stdGlucose",
      "avgCarbsPerMeal",
    ],
    hyperparameters: config.hyperparameters,
    training: {
      dataRange: dataset.stats.dateRange,
      mealsCount: mealCount,
      trainedAt: new Date(),
    },
    performance,
  };

  // Step 8: Save model to Supabase Storage
  await saveModel(personId, config.modelType, newVersion, mockModel, metadata);

  console.log(`Model training complete: version ${newVersion}`);
  return metadata;
}

/**
 * MOCK LSTM Training (Framework demonstration)
 *
 * TODO: Replace with actual TensorFlow.js LSTM implementation:
 * - Build sequential model with LSTM layers
 * - Compile with Adam optimizer and MSE loss
 * - Fit with early stopping and validation monitoring
 * - Export model weights to JSON format
 *
 * Current implementation: Simple baseline predictor using averages
 */
async function trainMockLSTM(
  dataset: TrainingDataset,
  config: TrainingConfig
): Promise<any> {
  // Calculate baseline predictions from training data
  const trainExamples = dataset.split.trainIndices.map(
    (i) => dataset.examples[i]
  );

  const avg60Min =
    trainExamples.reduce((sum, ex) => sum + ex.target.glucoseAt60Min, 0) /
    trainExamples.length;

  const avg120Min =
    trainExamples.reduce((sum, ex) => sum + ex.target.glucoseAt120Min, 0) /
    trainExamples.length;

  // Mock model: stores baseline predictions
  // In production, this would be TensorFlow.js model weights
  const mockModel = {
    type: "baseline-predictor",
    config,
    baseline: {
      avg60Min,
      avg120Min,
    },
    trainedAt: new Date().toISOString(),
  };

  return mockModel;
}

/**
 * Evaluate model performance on test set
 *
 * @param model - Trained model
 * @param dataset - Training dataset with test split
 * @returns Performance metrics (MAE, RMSE, R²)
 */
export function evaluateModel(
  model: any,
  dataset: TrainingDataset
): ModelPerformance {
  const testExamples = dataset.split.testIndices.map(
    (i) => dataset.examples[i]
  );

  if (testExamples.length === 0) {
    throw new Error("No test examples available for evaluation");
  }

  const errors60Min: number[] = [];
  const errors120Min: number[] = [];
  const actuals60Min: number[] = [];
  const predictions60Min: number[] = [];

  for (const example of testExamples) {
    // Mock prediction using baseline
    const pred60Min = model.baseline.avg60Min;
    const pred120Min = model.baseline.avg120Min;

    const actual60Min = example.target.glucoseAt60Min;
    const actual120Min = example.target.glucoseAt120Min;

    errors60Min.push(Math.abs(actual60Min - pred60Min));
    errors120Min.push(Math.abs(actual120Min - pred120Min));
    actuals60Min.push(actual60Min);
    predictions60Min.push(pred60Min);
  }

  // Calculate MAE (average of both time points)
  const mae60 =
    errors60Min.reduce((sum, err) => sum + err, 0) / errors60Min.length;
  const mae120 =
    errors120Min.reduce((sum, err) => sum + err, 0) / errors120Min.length;
  const mae = (mae60 + mae120) / 2;

  // Calculate RMSE
  const mse60 =
    errors60Min.reduce((sum, err) => sum + err ** 2, 0) / errors60Min.length;
  const mse120 =
    errors120Min.reduce((sum, err) => sum + err ** 2, 0) / errors120Min.length;
  const rmse = Math.sqrt((mse60 + mse120) / 2);

  // Calculate R² (coefficient of determination)
  const meanActual60 =
    actuals60Min.reduce((sum, val) => sum + val, 0) / actuals60Min.length;
  const ssTotal =
    actuals60Min.reduce((sum, val) => sum + (val - meanActual60) ** 2, 0);
  const ssResidual =
    actuals60Min.reduce(
      (sum, val, i) => sum + (val - predictions60Min[i]) ** 2,
      0
    );
  const r2 = 1 - ssResidual / ssTotal;

  return {
    mae,
    rmse,
    r2,
    sampleSize: testExamples.length,
  };
}

/**
 * Run prediction using trained model
 *
 * TODO: Implement actual LSTM inference with TensorFlow.js
 * Current: Uses baseline predictions from mock model
 *
 * @param model - Trained model
 * @param features - Input feature vector
 * @returns Predicted glucose at 60 and 120 minutes
 */
export function predict(
  model: any,
  features: import("./types").FeatureVector
): { glucose60Min: number; glucose120Min: number } {
  // Validate features
  validateFeatures(features);

  // Mock prediction: Use baseline with small adjustments
  // In production, this would be model.predict(tensorFeatures)
  const carbsEffect = (features.meal.carbsG - 50) * 0.5; // Simple carb adjustment

  return {
    glucose60Min: model.baseline.avg60Min + carbsEffect,
    glucose120Min: model.baseline.avg120Min + carbsEffect * 0.7,
  };
}

/**
 * Check if model improvement is significant enough to deploy
 *
 * @param currentPerformance - Current model performance
 * @param newPerformance - New model performance
 * @param threshold - Minimum MAE improvement threshold (mg/dL)
 * @returns true if new model should be deployed
 */
export function shouldDeployNewModel(
  currentPerformance: ModelPerformance,
  newPerformance: ModelPerformance,
  threshold: number = 5
): boolean {
  const maeImprovement = currentPerformance.mae - newPerformance.mae;

  if (maeImprovement >= threshold) {
    console.log(
      `Significant improvement detected: ${maeImprovement.toFixed(2)} mg/dL MAE reduction`
    );
    return true;
  }

  console.log(
    `Insufficient improvement: ${maeImprovement.toFixed(2)} mg/dL (threshold: ${threshold} mg/dL)`
  );
  return false;
}
