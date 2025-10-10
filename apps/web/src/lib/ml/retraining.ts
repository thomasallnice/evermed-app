/**
 * Model Retraining Workflow
 *
 * Implements trigger-based retraining logic:
 * - Data-driven: Retrain after N new meals
 * - Time-driven: Retrain after T days
 * - Performance-driven: Retrain if accuracy drops
 * - Manual: User-requested retraining
 */

import { PrismaClient } from "@prisma/client";
import { trainGlucoseModel, evaluateModel, shouldDeployNewModel, type TrainingConfig } from "./training";
import { deployModel, getActiveModelVersion } from "./versioning";
import { loadModel } from "./model-storage";
import { createTrainingDataset } from "./feature-engineering";
import type { RetrainingTrigger } from "./types";

const prisma = new PrismaClient();

/**
 * Check if retraining is needed based on trigger conditions
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @returns RetrainingTrigger with decision and details
 */
export async function checkRetrainingNeeded(
  personId: string,
  modelType: string
): Promise<RetrainingTrigger> {
  // Get current active model
  const currentModel = await prisma.personalModel.findFirst({
    where: { personId, modelType, isActive: true },
  });

  if (!currentModel) {
    // No model exists - need initial training
    return {
      type: "manual",
      reason: "No existing model found - initial training required",
      shouldRetrain: true,
    };
  }

  // Check 1: Data-driven trigger (50+ new meals since last training)
  const newMealsCount = await prisma.foodEntry.count({
    where: {
      personId,
      timestamp: { gt: currentModel.trainedAt },
    },
  });

  if (newMealsCount >= 50) {
    return {
      type: "data-driven",
      reason: `${newMealsCount} new meals since last training (threshold: 50)`,
      shouldRetrain: true,
      details: { newMealsCount },
    };
  }

  // Check 2: Time-driven trigger (7+ days since last training)
  const daysSinceTraining = Math.floor(
    (Date.now() - currentModel.trainedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceTraining >= 7) {
    return {
      type: "time-driven",
      reason: `${daysSinceTraining} days since last training (threshold: 7 days)`,
      shouldRetrain: true,
      details: { daysSinceLastTraining: daysSinceTraining },
    };
  }

  // Check 3: Performance-driven trigger (MAE > 15 mg/dL)
  const currentMAE = currentModel.accuracyMae || 0;
  const targetMAE = 15; // mg/dL

  if (currentMAE > targetMAE) {
    return {
      type: "performance-driven",
      reason: `Current MAE (${currentMAE.toFixed(1)} mg/dL) exceeds target (${targetMAE} mg/dL)`,
      shouldRetrain: true,
      details: { currentMAE, targetMAE },
    };
  }

  // No retraining needed
  return {
    type: "manual",
    reason: "All conditions satisfied - no retraining needed",
    shouldRetrain: false,
    details: {
      newMealsCount,
      daysSinceLastTraining: daysSinceTraining,
      currentMAE,
    },
  };
}

/**
 * Retrain model for a user
 *
 * Workflow:
 * 1. Check if retraining is needed
 * 2. Train new model
 * 3. Evaluate on test set
 * 4. Compare to current model
 * 5. Deploy if performance improves
 * 6. Archive old model
 *
 * @param personId - User ID
 * @param modelType - Model type (default: 'glucose-prediction')
 * @param config - Training configuration (optional)
 * @returns Retraining result with status and metadata
 */
export async function retrainModel(
  personId: string,
  modelType: string = "glucose-prediction",
  config?: TrainingConfig
): Promise<{
  status: "deployed" | "rejected" | "skipped";
  reason: string;
  newVersion?: string;
  performance?: {
    mae: number;
    rmse: number;
    r2: number;
  };
}> {
  console.log(`Checking retraining triggers for user ${personId}...`);

  // Step 1: Check if retraining is needed
  const trigger = await checkRetrainingNeeded(personId, modelType);

  if (!trigger.shouldRetrain) {
    return {
      status: "skipped",
      reason: trigger.reason,
    };
  }

  console.log(`Retraining triggered: ${trigger.reason}`);

  // Step 2: Train new model
  let newModelMetadata;
  try {
    newModelMetadata = await trainGlucoseModel(personId, config);
  } catch (error) {
    console.error("Training failed:", error);
    return {
      status: "rejected",
      reason: `Training failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Step 3: Get current model for comparison
  const currentModel = await prisma.personalModel.findFirst({
    where: { personId, modelType, isActive: true },
  });

  if (!currentModel) {
    // No existing model - deploy new model immediately
    await deployModel(personId, modelType, newModelMetadata.version);
    return {
      status: "deployed",
      reason: "Initial model deployment (no previous model)",
      newVersion: newModelMetadata.version,
      performance: newModelMetadata.performance,
    };
  }

  // Step 4: Compare performance
  const currentPerformance = {
    mae: currentModel.accuracyMae || 999,
    rmse: currentModel.accuracyRmse || 999,
    r2: currentModel.accuracyR2 || 0,
    sampleSize: currentModel.trainingMealsCount,
  };

  const shouldDeploy = shouldDeployNewModel(
    currentPerformance,
    newModelMetadata.performance,
    5 // 5 mg/dL improvement threshold
  );

  if (shouldDeploy) {
    // Step 5: Deploy new model
    await deployModel(personId, modelType, newModelMetadata.version);

    console.log(`New model deployed: ${newModelMetadata.version}`);
    return {
      status: "deployed",
      reason: `Performance improved: MAE ${currentPerformance.mae.toFixed(1)} → ${newModelMetadata.performance.mae.toFixed(1)} mg/dL`,
      newVersion: newModelMetadata.version,
      performance: newModelMetadata.performance,
    };
  } else {
    // New model not better - keep old one active
    console.log(
      `New model not deployed: insufficient improvement (MAE ${newModelMetadata.performance.mae.toFixed(1)} mg/dL)`
    );
    return {
      status: "rejected",
      reason: "No significant performance improvement",
      newVersion: newModelMetadata.version,
      performance: newModelMetadata.performance,
    };
  }
}

/**
 * Schedule retraining for a user
 *
 * This would typically be called by a cron job or Cloud Run worker.
 * For Sprint 4, this is a framework function demonstrating the workflow.
 *
 * @param personId - User ID
 * @param schedule - Cron schedule (e.g., "0 0 * * 0" for weekly)
 */
export async function scheduleRetraining(
  personId: string,
  schedule: string
): Promise<void> {
  // TODO: Implement with Cloud Scheduler or Vercel Cron
  console.log(`Scheduled retraining for user ${personId}: ${schedule}`);

  // Store schedule in user preferences or separate scheduling table
  // This would trigger periodic checks via cron job
}

/**
 * Batch retrain models for all users who need it
 *
 * This function would be called by a scheduled job (e.g., daily cron).
 *
 * @param modelType - Model type to retrain
 * @returns Summary of retraining results
 */
export async function batchRetrainModels(
  modelType: string = "glucose-prediction"
): Promise<{
  total: number;
  deployed: number;
  rejected: number;
  skipped: number;
  errors: number;
}> {
  console.log("Starting batch retraining...");

  // Get all users with active models
  const users = await prisma.personalModel.findMany({
    where: { modelType, isActive: true },
    select: { personId: true },
    distinct: ["personId"],
  });

  const results = {
    total: users.length,
    deployed: 0,
    rejected: 0,
    skipped: 0,
    errors: 0,
  };

  for (const user of users) {
    try {
      const result = await retrainModel(user.personId, modelType);

      if (result.status === "deployed") {
        results.deployed++;
      } else if (result.status === "rejected") {
        results.rejected++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      console.error(`Retraining failed for user ${user.personId}:`, error);
      results.errors++;
    }
  }

  console.log("Batch retraining complete:", results);
  return results;
}
