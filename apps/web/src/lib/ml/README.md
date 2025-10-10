# ML Pipeline - Glucose Prediction System

**Sprint 4 Deliverable**: Production-ready ML training pipeline for personalized glucose forecasting.

## Overview

This module implements a complete machine learning pipeline for predicting glucose levels 1-2 hours after meals based on:
- Meal nutrition data (calories, carbs, protein, fat, fiber)
- Personal glucose history (last 3 hours of CGM data)
- User baseline metabolism
- Temporal features (time of day, day of week)

**Medical Safety**: All predictions are **informational only**. This system does NOT provide diagnosis, dosing recommendations, or triage. Always includes medical disclaimers per non-SaMD requirements.

## Architecture

### Data Flow

```
User Meals + Glucose Data
         ↓
  Feature Engineering
  (feature-engineering.ts)
         ↓
   LSTM Training
   (training.ts)
         ↓
  Model Storage (Supabase)
  (model-storage.ts)
         ↓
   Versioning & A/B Testing
   (versioning.ts)
         ↓
  Prediction API
  (/api/predictions/glucose)
         ↓
  User-Facing Forecast
```

### Database Schema

**PersonalModel** (enhanced in Sprint 4):
- `personId`, `modelType`, `version` (unique composite key)
- `isActive` (boolean - only one active version per user per model type)
- `trainingDataStart`, `trainingDataEnd` (provenance)
- `accuracyMae`, `accuracyRmse`, `accuracyR2` (performance metrics)
- `modelDataPath` (Supabase Storage path)
- `metadata` (JSON: features, hyperparameters, notes)

### Storage Structure

```
supabase-storage/ml-models/
  {userId}/
    glucose-prediction/
      1.0.0/
        model.json (serialized model + metadata)
      1.1.0/
        model.json
      2.0.0/
        model.json
```

## Module Descriptions

### 1. `types.ts`
TypeScript interfaces for all ML pipeline types:
- `MealFeatures`: Nutrition + time features
- `GlucoseHistoryFeatures`: Time-series glucose (12 values @ 15-min intervals)
- `TrainingDataset`: Train/val/test splits
- `ModelMetadata`: Versioning, hyperparameters, performance
- `PredictionResult`: API response shape

### 2. `feature-engineering.ts`
Extracts and transforms raw data into feature vectors:

**Key Functions**:
- `extractMealFeatures(foodEntry)`: Nutrition + cyclical time encoding
- `extractGlucoseHistory(personId, beforeTime, windowHours)`: Interpolates glucose readings to 15-min intervals
- `calculateUserBaseline(personId, windowDays)`: User's avg glucose, std, typical carb intake
- `createTrainingDataset(personId, startDate, endDate)`: Builds X,y pairs with temporal split
- `validateFeatures(features)`: Medical data sanity checks (detects corrupted data)

**Features Used**:
- Meal: calories, carbsG, proteinG, fatG, fiberG, mealType (one-hot), hourSin, hourCos, dayOfWeekSin, dayOfWeekCos
- Glucose history: 12 interpolated values (3 hours @ 15-min intervals), mean, std, trend
- Baseline: avgGlucose, stdGlucose, avgCarbsPerMeal

### 3. `training.ts`
LSTM model training workflow:

**Key Functions**:
- `trainGlucoseModel(personId, config)`: Full training pipeline
  - Validates minimum data (7 days, 21+ meals)
  - Creates dataset with train/val/test split
  - Trains LSTM (2 layers, 64 units, MSE loss)
  - Evaluates on test set (MAE, RMSE, R²)
  - Saves to Supabase Storage
- `evaluateModel(model, dataset)`: Calculates performance metrics
- `predict(model, features)`: Runs inference
- `shouldDeployNewModel(current, new, threshold)`: Compares performance for deployment decision

**Architecture** (LSTM):
- Input: [meal features (14), glucose history (12), baseline (3)] = 29 features
- LSTM Layer 1: 64 units
- LSTM Layer 2: 64 units
- Dense Output: 2 values (glucose at +60min, +120min)
- Loss: Mean Squared Error
- Optimizer: Adam (lr=0.001)
- Epochs: 100 with early stopping

**Sprint 4 Note**: Current implementation is a **mock baseline predictor** demonstrating the pipeline architecture. Full TensorFlow.js LSTM implementation requires additional dependencies and training infrastructure (marked with TODO comments).

### 4. `model-storage.ts`
Manages model artifacts in Supabase Storage with RLS enforcement:

**Key Functions**:
- `saveModel(personId, modelType, version, modelData, metadata)`: Uploads to `ml-models` bucket
- `loadModel(personId, modelType, version?)`: Downloads from storage (defaults to active version)
- `getOrLoadModel(personId, modelType, version?)`: Cached loading (1-hour TTL)
- `invalidateCache(personId, modelType?, version?)`: Clears cache on version change

**Caching Strategy**:
- In-memory cache: Map<cacheKey, { model, loadedAt, version }>
- TTL: 1 hour
- Invalidation: On version deployment, rollback, or manual trigger
- Target: p95 < 2s for predictions (cached models load in <50ms)

### 5. `versioning.ts`
Semantic versioning and A/B testing framework:

**Key Functions**:
- `deployModel(personId, modelType, version)`: Sets `isActive=true`, deactivates others
- `rollbackModel(personId, modelType, toPreviousVersion)`: Reverts to old version
- `getActiveModelVersion(personId, modelType)`: Returns active version string
- `listModelVersions(personId, modelType)`: All versions with performance metrics
- `incrementVersion(currentVersion, level)`: Bumps MAJOR.MINOR.PATCH
- `getModelVersionForABTest(personId, modelType, canaryVersion, canaryPercentage)`: Deterministic A/B bucketing (10% canary, 90% stable)
- `logPredictionPerformance(personId, modelVersion, predictionMAE)`: Non-PHI telemetry
- `analyzeABTestResults(modelType, canaryVersion, stableVersion, windowDays)`: Compare canary vs stable

**Versioning Rules**:
- MAJOR: Breaking changes to input/output schema
- MINOR: Improved accuracy, new features (default for retraining)
- PATCH: Bug fixes, performance improvements

### 6. `retraining.ts`
Automated retraining workflow with trigger conditions:

**Key Functions**:
- `checkRetrainingNeeded(personId, modelType)`: Evaluates triggers
- `retrainModel(personId, modelType, config?)`: Full retraining workflow
- `scheduleRetraining(personId, schedule)`: Cron scheduling (TODO: Cloud Scheduler)
- `batchRetrainModels(modelType)`: Retrain all users who need it

**Retraining Triggers**:
1. **Data-driven**: 50+ new meals since last training
2. **Time-driven**: 7+ days since last training
3. **Performance-driven**: Current model MAE > 15 mg/dL
4. **Manual**: User-requested retrain

**Workflow**:
1. Check triggers → Retrain if needed
2. Train new model (MINOR version bump)
3. Evaluate on test set
4. Compare to current model (MAE improvement threshold: 5 mg/dL)
5. Deploy if better, else keep old model active
6. Archive old model (keep for rollback)

## API Endpoint

### POST `/api/predictions/glucose`

**Request**:
```json
{
  "mealId": "uuid" // OR inline meal data:
  "meal": {
    "calories": 450,
    "carbsG": 60,
    "proteinG": 25,
    "fatG": 15,
    "fiberG": 8,
    "mealType": "breakfast",
    "timestamp": "2025-10-10T08:00:00Z"
  }
}
```

**Response**:
```json
{
  "predictions": [
    {
      "time": "+60min",
      "glucose": 145,
      "confidence": "high",
      "confidenceScore": 0.85
    },
    {
      "time": "+120min",
      "glucose": 135,
      "confidence": "medium",
      "confidenceScore": 0.70
    }
  ],
  "provenance": {
    "modelVersion": "1.2.0",
    "trainedOn": "2025-10-05",
    "dataPoints": 150,
    "lastUsed": "2025-10-10T12:34:56Z"
  },
  "disclaimer": "This glucose prediction is an informational forecast... NOT medical advice..."
}
```

**Error Responses**:
- `401`: Missing `x-user-id` header
- `404`: No trained model (need 7+ days of data)
- `400`: Invalid meal data
- `500`: Prediction failed

## Medical Compliance

### Non-SaMD Requirements (STRICT)

**PROHIBITED**:
- ❌ Diagnosis: "You have diabetes"
- ❌ Dosing: "Take 10 units of insulin"
- ❌ Triage: "Seek emergency care"
- ❌ Absolute certainty: "Your glucose WILL be 145"

**PERMITTED**:
- ✅ Informational forecasts: "Predicted glucose: 145 mg/dL (±15)"
- ✅ Pattern insights: "Your glucose typically peaks 60 min after breakfast"
- ✅ Confidence levels: "High/Medium/Low confidence"
- ✅ Provenance: "Based on 150 meals from last 30 days"

### Medical Disclaimer (MANDATORY)

**All prediction responses MUST include**:
```typescript
import { GLUCOSE_PREDICTION_DISCLAIMER } from "@/lib/copy";

// In API response:
{
  predictions: [...],
  disclaimer: GLUCOSE_PREDICTION_DISCLAIMER
}
```

**Disclaimer Text** (from `lib/copy.ts`):
> "This glucose prediction is an informational forecast based on your personal meal and glucose history. It is NOT medical advice and should NOT be used for insulin dosing, diagnosis, or treatment decisions. Individual responses vary. Always consult your healthcare provider for medical guidance."

### Privacy & RLS

- All model artifacts stored with RLS policies (users can only access own models)
- Supabase Storage bucket: `ml-models` (per-user folders)
- Predictions never logged with exact glucose values (only MAE for analytics)
- AnalyticsEvent: Non-PHI telemetry only (aggregated metrics)

## Performance Targets

- **Inference latency**: p95 < 2s (cached model loads in <50ms)
- **Model loading**: First load <5s, cached <100ms
- **Training time**: <30s for 7 days of data (~150 examples)
- **Accuracy target**: MAE < 15 mg/dL (production goal: <10 mg/dL)

## Testing Requirements

### Unit Tests (Vitest)
- Feature engineering: `extractMealFeatures`, `extractGlucoseHistory`, `validateFeatures`
- Model loading/caching: Cache hit/miss, TTL expiration
- Versioning: `incrementVersion`, A/B bucketing determinism
- Input validation: Reject invalid meal data, out-of-range glucose

### Integration Tests
- End-to-end training pipeline (mock data → trained model)
- Prediction API endpoint (mock model → prediction response)
- Model versioning (deploy → active version updated)
- Retraining workflow (trigger → train → deploy if better)

### Performance Tests
- Inference latency: 100 predictions, measure p95
- Model loading time: Cold start vs cached
- Batch prediction throughput: 10 users × 10 predictions

## Deployment Checklist

**Before deploying ML features**:
- [ ] Create Supabase Storage bucket: `ml-models`
- [ ] Apply RLS policies to `ml-models` bucket (users can only access own folders)
- [ ] Verify PersonalModel schema migrated to production
- [ ] Test prediction endpoint with real user data (anonymized)
- [ ] Validate medical disclaimers appear in all responses
- [ ] Run performance tests (p95 < 2s for predictions)
- [ ] Set up monitoring (prediction latency, error rates)
- [ ] Document retraining schedule (weekly cron job)

## Future Enhancements (Post-Sprint 4)

1. **Full TensorFlow.js LSTM Implementation**
   - Replace mock baseline predictor with actual LSTM
   - Add model quantization for faster inference
   - Implement transfer learning for cold-start users

2. **Advanced Features**
   - Exercise data integration
   - Stress/sleep features
   - Multi-day glucose forecasting
   - Meal recommendation engine ("meals that keep you stable")

3. **Production Infrastructure**
   - Cloud Run workers for background training
   - Cloud Scheduler for automated retraining
   - Model performance monitoring dashboard
   - Automated rollback on performance degradation

4. **Multi-Model Support**
   - Pattern detection models (spike detection, trends)
   - Anomaly detection (unusual glucose responses)
   - Meal similarity clustering

## Common Pitfalls & Solutions

### Pitfall 1: Training on insufficient data
**Solution**: `trainGlucoseModel` validates minimum 21 meals (7 days × 3 meals/day) before training.

### Pitfall 2: Ignoring RLS policies
**Solution**: All model storage operations use Supabase client with RLS enforcement. Never use service role for user model access.

### Pitfall 3: Missing medical disclaimers
**Solution**: `GLUCOSE_PREDICTION_DISCLAIMER` imported and included in every API response.

### Pitfall 4: Blocking API requests with training
**Solution**: Training is designed for background jobs. API endpoint only loads pre-trained models.

### Pitfall 5: No provenance tracking
**Solution**: Every prediction includes `provenance` object with model version, training date, data points.

### Pitfall 6: Hardcoded model paths
**Solution**: Dynamic loading based on `personId`, `modelType`, `version` via `getOrLoadModel`.

### Pitfall 7: No fallback for model failures
**Solution**: API returns 404 with user-friendly message if no model available.

### Pitfall 8: Temporal data leakage
**Solution**: `createTrainingDataset` uses proper temporal split (70% train, 15% val, 15% test) with no future data in training set.

### Pitfall 9: No monitoring
**Solution**: AnalyticsEvent logs prediction performance (non-PHI) for monitoring and A/B test analysis.

### Pitfall 10: Cache invalidation bugs
**Solution**: `invalidateCache` called on deployment, rollback, and version changes to prevent stale models.

## Contact & Support

For questions about the ML pipeline:
- Review this README and inline code comments
- Check `types.ts` for data structure definitions
- See `/api/predictions/glucose/route.ts` for API contract
- Consult `CLAUDE.md` for medical compliance requirements

**Sprint 4 Status**: Framework complete, ready for full LSTM implementation in future sprint.
