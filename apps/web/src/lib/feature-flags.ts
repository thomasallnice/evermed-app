/**
 * Feature Flags Service - Sprint 6 Beta Launch
 *
 * Provides deterministic, privacy-preserving feature flag evaluation for gradual rollout
 * and A/B testing. Uses hash-based bucketing to ensure consistent user experience.
 *
 * @module feature-flags
 */

import { createHash } from 'crypto';
import { prisma } from './prisma';

/**
 * Feature flag names used in the application
 */
export const FEATURE_FLAGS = {
  METABOLIC_INSIGHTS_ENABLED: 'metabolic_insights_enabled',
  GLUCOSE_PREDICTIONS: 'glucose_predictions',
  CGM_INTEGRATION: 'cgm_integration',
  MEAL_TEMPLATES: 'meal_templates',
} as const;

export type FeatureFlagName = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  rolloutPercent: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Deterministically assigns a user to a bucket (0-99) based on their userId and flag name.
 * Uses SHA-256 hashing to ensure consistent bucketing across sessions.
 *
 * @param userId - The user's unique identifier
 * @param flagName - The feature flag name
 * @returns A bucket number between 0 and 99
 */
function getUserBucket(userId: string, flagName: string): number {
  // Hash userId + flagName to get consistent bucket assignment
  const hash = createHash('sha256')
    .update(`${userId}:${flagName}`)
    .digest('hex');

  // Take first 4 hex chars and convert to 0-99 range
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % 100;
}

/**
 * Checks if a feature is enabled for a specific user.
 * Evaluates both the global enabled flag and rollout percentage with deterministic bucketing.
 *
 * @param userId - The user's unique identifier
 * @param flagName - The feature flag name to check
 * @returns Promise<boolean> - True if the feature is enabled for this user
 *
 * @example
 * const canUseMetabolicInsights = await isFeatureEnabled(userId, 'metabolic_insights_enabled');
 * if (canUseMetabolicInsights) {
 *   // Show Metabolic Insights features
 * }
 */
export async function isFeatureEnabled(
  userId: string,
  flagName: FeatureFlagName
): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { name: flagName },
    });

    // If flag doesn't exist or is disabled, return false
    if (!flag || !flag.enabled) {
      return false;
    }

    // If rollout is 100%, everyone gets the feature
    if (flag.rolloutPercent >= 100) {
      return true;
    }

    // If rollout is 0%, nobody gets the feature (even if enabled=true)
    if (flag.rolloutPercent <= 0) {
      return false;
    }

    // Deterministic bucketing: check if user's bucket is within rollout percentage
    const userBucket = getUserBucket(userId, flagName);
    return userBucket < flag.rolloutPercent;
  } catch (error) {
    console.error(`[FeatureFlags] Error checking flag "${flagName}":`, error);
    // Fail closed: if we can't check the flag, assume disabled
    return false;
  }
}

/**
 * Gets all feature flags (admin use only).
 *
 * @returns Promise<FeatureFlag[]> - Array of all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return await prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('[FeatureFlags] Error fetching all flags:', error);
    return [];
  }
}

/**
 * Updates a feature flag (admin use only).
 * Validates rollout percentage is between 0 and 100.
 *
 * @param flagName - The feature flag name to update
 * @param enabled - Whether the flag is enabled
 * @param rolloutPercent - Percentage of users who should see the feature (0-100)
 * @returns Promise<FeatureFlag> - The updated feature flag
 *
 * @throws Error if rolloutPercent is invalid
 */
export async function updateFeatureFlag(
  flagName: FeatureFlagName,
  enabled: boolean,
  rolloutPercent: number
): Promise<FeatureFlag> {
  if (rolloutPercent < 0 || rolloutPercent > 100) {
    throw new Error('rolloutPercent must be between 0 and 100');
  }

  return await prisma.featureFlag.upsert({
    where: { name: flagName },
    update: {
      enabled,
      rolloutPercent,
      updatedAt: new Date(),
    },
    create: {
      name: flagName,
      enabled,
      rolloutPercent,
      description: `Feature flag for ${flagName}`,
    },
  });
}

/**
 * Creates a new feature flag (admin use only).
 *
 * @param name - Unique flag name
 * @param description - Human-readable description
 * @param enabled - Initial enabled state (default: false)
 * @param rolloutPercent - Initial rollout percentage (default: 0)
 * @returns Promise<FeatureFlag> - The created feature flag
 */
export async function createFeatureFlag(
  name: string,
  description: string,
  enabled: boolean = false,
  rolloutPercent: number = 0
): Promise<FeatureFlag> {
  if (rolloutPercent < 0 || rolloutPercent > 100) {
    throw new Error('rolloutPercent must be between 0 and 100');
  }

  return await prisma.featureFlag.create({
    data: {
      name,
      description,
      enabled,
      rolloutPercent,
    },
  });
}

/**
 * Gets a specific feature flag by name.
 *
 * @param flagName - The feature flag name
 * @returns Promise<FeatureFlag | null> - The feature flag or null if not found
 */
export async function getFeatureFlag(
  flagName: FeatureFlagName
): Promise<FeatureFlag | null> {
  try {
    return await prisma.featureFlag.findUnique({
      where: { name: flagName },
    });
  } catch (error) {
    console.error(`[FeatureFlags] Error fetching flag "${flagName}":`, error);
    return null;
  }
}

/**
 * Calculates what percentage of a user cohort will see a feature based on rollout.
 * Useful for estimating beta user reach.
 *
 * @param totalUsers - Total number of users
 * @param rolloutPercent - Rollout percentage (0-100)
 * @returns Estimated number of users who will see the feature
 */
export function estimateReach(totalUsers: number, rolloutPercent: number): number {
  return Math.floor((totalUsers * rolloutPercent) / 100);
}
