/**
 * ML Pipeline - Main Exports
 *
 * Sprint 4: Glucose Prediction ML Training Pipeline
 */

// Types
export type {
  MealFeatures,
  GlucoseHistoryFeatures,
  UserBaselineFeatures,
  FeatureVector,
  TrainingExample,
  TrainingDataset,
  ModelPerformance,
  ModelMetadata,
  PredictionResult,
  RetrainingTrigger,
} from "./types";

// Feature Engineering
export {
  extractMealFeatures,
  extractGlucoseHistory,
  calculateUserBaseline,
  createTrainingDataset,
  validateFeatures,
} from "./feature-engineering";

// Training
export {
  trainGlucoseModel,
  evaluateModel,
  predict,
  shouldDeployNewModel,
} from "./training";

// Model Storage
export {
  saveModel,
  loadModel,
  getOrLoadModel,
  invalidateCache,
  getCacheStats,
} from "./model-storage";

// Versioning
export {
  deployModel,
  rollbackModel,
  getActiveModelVersion,
  listModelVersions,
  incrementVersion,
  getModelVersionForABTest,
  logPredictionPerformance,
  analyzeABTestResults,
} from "./versioning";

// Retraining
export {
  checkRetrainingNeeded,
  retrainModel,
  scheduleRetraining,
  batchRetrainModels,
} from "./retraining";
