/**
 * Model Storage and Caching Utilities
 *
 * Handles saving/loading ML models to/from Supabase Storage with RLS enforcement.
 * Implements in-memory caching for performance optimization.
 *
 * Storage structure: models/{userId}/{modelType}/{version}/model.json
 */

import { createClient } from "@/lib/supabase/client";
import { PrismaClient } from "@prisma/client";
import type { ModelMetadata } from "./types";

const prisma = new PrismaClient();

// In-memory model cache: Map<cacheKey, { model: any, loadedAt: Date }>
const modelCache = new Map<
  string,
  { model: any; loadedAt: Date; version: string }
>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate cache key for a model
 */
function getCacheKey(
  personId: string,
  modelType: string,
  version?: string
): string {
  return `${personId}:${modelType}:${version || "active"}`;
}

/**
 * Save model to Supabase Storage
 *
 * Storage path: models/{personId}/{modelType}/{version}/model.json
 * RLS policies ensure users can only access their own models.
 *
 * @param personId - User ID (owner of the model)
 * @param modelType - Model type (e.g., 'glucose-prediction')
 * @param version - Semantic version (e.g., '1.0.0')
 * @param modelData - Serialized model data (JSON-compatible)
 * @param metadata - Model metadata
 * @returns Storage path
 */
export async function saveModel(
  personId: string,
  modelType: string,
  version: string,
  modelData: any,
  metadata: ModelMetadata
): Promise<string> {
  const supabase = createClient();

  // Storage path
  const storagePath = `models/${personId}/${modelType}/${version}/model.json`;

  // Serialize model data
  const modelBlob = new Blob([JSON.stringify({ modelData, metadata })], {
    type: "application/json",
  });

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from("ml-models")
    .upload(storagePath, modelBlob, {
      upsert: true, // Overwrite if exists
      contentType: "application/json",
    });

  if (error) {
    throw new Error(`Failed to save model: ${error.message}`);
  }

  // Update PersonalModel record in database
  await prisma.personalModel.upsert({
    where: {
      personId_modelType_version: {
        personId,
        modelType,
        version,
      },
    },
    create: {
      personId,
      modelType,
      version,
      isActive: false, // Will be activated separately
      modelDataPath: storagePath,
      trainingMealsCount: metadata.training.mealsCount,
      trainingDataStart: metadata.training.dataRange.start,
      trainingDataEnd: metadata.training.dataRange.end,
      trainedAt: metadata.training.trainedAt,
      accuracyMae: metadata.performance.mae,
      accuracyRmse: metadata.performance.rmse,
      accuracyR2: metadata.performance.r2,
      metadata: metadata as any,
    },
    update: {
      modelDataPath: storagePath,
      trainingMealsCount: metadata.training.mealsCount,
      trainingDataStart: metadata.training.dataRange.start,
      trainingDataEnd: metadata.training.dataRange.end,
      trainedAt: metadata.training.trainedAt,
      accuracyMae: metadata.performance.mae,
      accuracyRmse: metadata.performance.rmse,
      accuracyR2: metadata.performance.r2,
      metadata: metadata as any,
      updatedAt: new Date(),
    },
  });

  console.log(`Model saved: ${storagePath}`);
  return storagePath;
}

/**
 * Load model from Supabase Storage
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @param version - Semantic version (optional, defaults to active version)
 * @returns Model data and metadata
 */
export async function loadModel(
  personId: string,
  modelType: string,
  version?: string
): Promise<{ modelData: any; metadata: ModelMetadata }> {
  const supabase = createClient();

  // If no version specified, get active version from database
  let modelRecord;
  if (!version) {
    modelRecord = await prisma.personalModel.findFirst({
      where: {
        personId,
        modelType,
        isActive: true,
      },
    });

    if (!modelRecord) {
      throw new Error(
        `No active model found for user ${personId}, type ${modelType}`
      );
    }
    version = modelRecord.version;
  } else {
    modelRecord = await prisma.personalModel.findUnique({
      where: {
        personId_modelType_version: {
          personId,
          modelType,
          version,
        },
      },
    });

    if (!modelRecord) {
      throw new Error(
        `Model not found: ${personId}/${modelType}/${version}`
      );
    }
  }

  const storagePath = modelRecord.modelDataPath;
  if (!storagePath) {
    throw new Error(`Model ${version} has no storage path`);
  }

  // Download from Supabase Storage
  const { data, error } = await supabase.storage
    .from("ml-models")
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to load model: ${error?.message || "No data"}`);
  }

  // Parse JSON
  const text = await data.text();
  const parsed = JSON.parse(text);

  // Update last used timestamp
  await prisma.personalModel.update({
    where: {
      personId_modelType_version: {
        personId,
        modelType,
        version: modelRecord.version,
      },
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  console.log(`Model loaded: ${storagePath}`);
  return parsed;
}

/**
 * Get or load model with caching
 *
 * Loads model from cache if available and not expired,
 * otherwise loads from storage and caches it.
 *
 * @param personId - User ID
 * @param modelType - Model type
 * @param version - Semantic version (optional)
 * @returns Cached or freshly loaded model
 */
export async function getOrLoadModel(
  personId: string,
  modelType: string,
  version?: string
): Promise<{ modelData: any; metadata: ModelMetadata }> {
  const cacheKey = getCacheKey(personId, modelType, version);

  // Check cache
  const cached = modelCache.get(cacheKey);
  if (cached) {
    const age = Date.now() - cached.loadedAt.getTime();
    if (age < CACHE_TTL_MS) {
      console.log(`Model cache hit: ${cacheKey}`);
      return cached.model;
    } else {
      // Cache expired
      modelCache.delete(cacheKey);
      console.log(`Model cache expired: ${cacheKey}`);
    }
  }

  // Load from storage
  const model = await loadModel(personId, modelType, version);

  // Cache it
  modelCache.set(cacheKey, {
    model,
    loadedAt: new Date(),
    version: model.metadata.version,
  });

  console.log(`Model cached: ${cacheKey}`);
  return model;
}

/**
 * Invalidate cache for a specific model or all models for a user
 *
 * @param personId - User ID
 * @param modelType - Model type (optional)
 * @param version - Version (optional)
 */
export function invalidateCache(
  personId: string,
  modelType?: string,
  version?: string
): void {
  if (modelType && version) {
    // Invalidate specific version
    const cacheKey = getCacheKey(personId, modelType, version);
    modelCache.delete(cacheKey);
    console.log(`Cache invalidated: ${cacheKey}`);
  } else if (modelType) {
    // Invalidate all versions of a model type
    for (const key of modelCache.keys()) {
      if (key.startsWith(`${personId}:${modelType}:`)) {
        modelCache.delete(key);
        console.log(`Cache invalidated: ${key}`);
      }
    }
  } else {
    // Invalidate all models for user
    for (const key of modelCache.keys()) {
      if (key.startsWith(`${personId}:`)) {
        modelCache.delete(key);
        console.log(`Cache invalidated: ${key}`);
      }
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: modelCache.size,
    keys: Array.from(modelCache.keys()),
  };
}
