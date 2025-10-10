/**
 * Model Versioning and A/B Testing Framework
 *
 * Manages model versions, deployments, and A/B testing for gradual rollouts.
 * Implements semantic versioning and canary deployment patterns.
 */

import { PrismaClient } from "@prisma/client";
import { invalidateCache } from "./model-storage";
import type { ModelMetadata } from "./types";

const prisma = new PrismaClient();

/**
 * Deploy a model version as active
 *
 * Sets isActive=true for the specified version and deactivates all other versions.
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @param version - Version to deploy
 */
export async function deployModel(
  personId: string,
  modelType: string,
  version: string
): Promise<void> {
  // Deactivate all existing versions
  await prisma.personalModel.updateMany({
    where: { personId, modelType },
    data: { isActive: false },
  });

  // Activate the specified version
  await prisma.personalModel.update({
    where: {
      personId_modelType_version: {
        personId,
        modelType,
        version,
      },
    },
    data: { isActive: true },
  });

  // Invalidate cache to force reload
  invalidateCache(personId, modelType);

  console.log(`Deployed model: ${personId}/${modelType}/${version}`);
}

/**
 * Rollback to a previous model version
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @param toPreviousVersion - Version to rollback to
 */
export async function rollbackModel(
  personId: string,
  modelType: string,
  toPreviousVersion: string
): Promise<void> {
  // Verify the target version exists
  const targetModel = await prisma.personalModel.findUnique({
    where: {
      personId_modelType_version: {
        personId,
        modelType,
        version: toPreviousVersion,
      },
    },
  });

  if (!targetModel) {
    throw new Error(
      `Cannot rollback: version ${toPreviousVersion} not found`
    );
  }

  // Deploy the previous version
  await deployModel(personId, modelType, toPreviousVersion);

  console.log(`Rolled back to model version: ${toPreviousVersion}`);
}

/**
 * Get the active model version for a user
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @returns Active model version or null
 */
export async function getActiveModelVersion(
  personId: string,
  modelType: string
): Promise<string | null> {
  const activeModel = await prisma.personalModel.findFirst({
    where: { personId, modelType, isActive: true },
  });

  return activeModel?.version || null;
}

/**
 * List all model versions for a user
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @returns Array of model versions with metadata
 */
export async function listModelVersions(
  personId: string,
  modelType: string
): Promise<
  Array<{
    version: string;
    isActive: boolean;
    trainedAt: Date;
    performance: {
      mae: number | null;
      rmse: number | null;
      r2: number | null;
    };
    mealsCount: number;
  }>
> {
  const models = await prisma.personalModel.findMany({
    where: { personId, modelType },
    orderBy: { trainedAt: "desc" },
  });

  return models.map((m) => ({
    version: m.version,
    isActive: m.isActive,
    trainedAt: m.trainedAt,
    performance: {
      mae: m.accuracyMae,
      rmse: m.accuracyRmse,
      r2: m.accuracyR2,
    },
    mealsCount: m.trainingMealsCount,
  }));
}

/**
 * Increment model version number
 *
 * @param currentVersion - Current version (e.g., "1.2.3")
 * @param level - Version level to increment: "major" | "minor" | "patch"
 * @returns New version string
 */
export function incrementVersion(
  currentVersion: string,
  level: "major" | "minor" | "patch"
): string {
  const [major, minor, patch] = currentVersion.split(".").map(Number);

  if (level === "major") {
    return `${major + 1}.0.0`;
  } else if (level === "minor") {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * A/B Testing: Determine which model version to use for a user
 *
 * Implements canary deployment pattern:
 * - canaryPercentage% of users get the new version
 * - Remaining users get the stable version
 *
 * Uses deterministic hashing of userId to ensure consistent assignment.
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @param canaryVersion - New version being tested (optional)
 * @param canaryPercentage - Percentage of users to get canary (0-100)
 * @returns Version to use for this user
 */
export async function getModelVersionForABTest(
  personId: string,
  modelType: string,
  canaryVersion?: string,
  canaryPercentage: number = 10
): Promise<string> {
  // If no canary version specified, just return active version
  if (!canaryVersion) {
    const active = await getActiveModelVersion(personId, modelType);
    if (!active) {
      throw new Error(`No active model found for ${modelType}`);
    }
    return active;
  }

  // Deterministic assignment based on user ID hash
  const hash = simpleHash(personId);
  const bucket = hash % 100; // 0-99

  if (bucket < canaryPercentage) {
    // User is in canary group
    console.log(
      `A/B Test: User ${personId} assigned to canary version ${canaryVersion}`
    );
    return canaryVersion;
  } else {
    // User is in control group (active/stable version)
    const active = await getActiveModelVersion(personId, modelType);
    if (!active) {
      throw new Error(`No active model found for ${modelType}`);
    }
    console.log(
      `A/B Test: User ${personId} assigned to stable version ${active}`
    );
    return active;
  }
}

/**
 * Simple hash function for user ID (for A/B bucketing)
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Track prediction performance for A/B testing analysis
 *
 * Logs prediction outcomes to database for later analysis.
 * Non-PHI: only stores aggregated metrics, not raw glucose values.
 *
 * @param personId - User ID
 * @param modelVersion - Model version used
 * @param predictionMAE - Mean absolute error of the prediction (mg/dL)
 */
export async function logPredictionPerformance(
  personId: string,
  modelVersion: string,
  predictionMAE: number
): Promise<void> {
  // Store in AnalyticsEvent (non-PHI telemetry)
  await prisma.analyticsEvent.create({
    data: {
      userId: personId,
      name: "ml_prediction_performance",
      meta: {
        modelVersion,
        mae: Math.round(predictionMAE), // Rounded to avoid exact glucose values
        timestamp: new Date().toISOString(),
      },
    },
  });
}

/**
 * Analyze A/B test results
 *
 * Compares performance of canary version vs stable version.
 *
 * @param modelType - Model type
 * @param canaryVersion - Canary version
 * @param stableVersion - Stable version
 * @param windowDays - Number of days to analyze (default: 7)
 * @returns Performance comparison
 */
export async function analyzeABTestResults(
  modelType: string,
  canaryVersion: string,
  stableVersion: string,
  windowDays: number = 7
): Promise<{
  canary: { avgMAE: number; sampleSize: number };
  stable: { avgMAE: number; sampleSize: number };
  recommendation: "deploy_canary" | "rollback" | "inconclusive";
}> {
  const windowStart = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  );

  // Fetch canary performance logs
  const canaryLogs = await prisma.analyticsEvent.findMany({
    where: {
      name: "ml_prediction_performance",
      createdAt: { gte: windowStart },
      meta: {
        path: ["modelVersion"],
        equals: canaryVersion,
      },
    },
  });

  // Fetch stable performance logs
  const stableLogs = await prisma.analyticsEvent.findMany({
    where: {
      name: "ml_prediction_performance",
      createdAt: { gte: windowStart },
      meta: {
        path: ["modelVersion"],
        equals: stableVersion,
      },
    },
  });

  const canaryMAEs = canaryLogs
    .map((log) => (log.meta as any)?.mae)
    .filter((mae) => typeof mae === "number");
  const stableMAEs = stableLogs
    .map((log) => (log.meta as any)?.mae)
    .filter((mae) => typeof mae === "number");

  const canaryAvg =
    canaryMAEs.length > 0
      ? canaryMAEs.reduce((sum, mae) => sum + mae, 0) / canaryMAEs.length
      : 0;
  const stableAvg =
    stableMAEs.length > 0
      ? stableMAEs.reduce((sum, mae) => sum + mae, 0) / stableMAEs.length
      : 0;

  // Determine recommendation
  let recommendation: "deploy_canary" | "rollback" | "inconclusive";
  if (canaryMAEs.length < 10 || stableMAEs.length < 10) {
    recommendation = "inconclusive"; // Not enough data
  } else if (canaryAvg < stableAvg - 5) {
    // Canary is at least 5 mg/dL better
    recommendation = "deploy_canary";
  } else if (canaryAvg > stableAvg + 5) {
    // Canary is worse by 5+ mg/dL
    recommendation = "rollback";
  } else {
    recommendation = "inconclusive"; // No significant difference
  }

  return {
    canary: { avgMAE: canaryAvg, sampleSize: canaryMAEs.length },
    stable: { avgMAE: stableAvg, sampleSize: stableMAEs.length },
    recommendation,
  };
}
