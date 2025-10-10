# ML Model Storage Setup Guide

**Sprint 4**: Supabase Storage configuration for ML model artifacts

## Overview

ML models are stored in Supabase Storage with Row-Level Security (RLS) policies to ensure:
- Per-user isolation (users can only access their own models)
- Secure model artifact storage
- Fast model loading via signed URLs
- Version-controlled model paths

## Storage Structure

```
supabase-storage/
  ml-models/                    # Bucket name
    {userId}/                   # Per-user folder
      glucose-prediction/       # Model type
        1.0.0/                  # Semantic version
          model.json            # Model weights + metadata
        1.1.0/
          model.json
        2.0.0/
          model.json
```

**Path Convention**: `models/{userId}/{modelType}/{version}/model.json`

## Bucket Configuration

### Step 1: Create Storage Bucket

**Via Supabase Dashboard**:
1. Navigate to Storage → Buckets
2. Click "Create bucket"
3. Bucket name: `ml-models`
4. Public bucket: **NO** (private with RLS)
5. File size limit: 10 MB (models are typically <1 MB)
6. Allowed MIME types: `application/json`

**Via Supabase CLI**:
```bash
supabase storage create ml-models --public=false
```

### Step 2: Apply RLS Policies

**Policy 1: Users can upload to their own folder**
```sql
CREATE POLICY "Users can upload models to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ml-models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Users can read from their own folder**
```sql
CREATE POLICY "Users can read own models"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ml-models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Users can update models in their own folder**
```sql
CREATE POLICY "Users can update own models"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ml-models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 4: Users can delete models in their own folder**
```sql
CREATE POLICY "Users can delete own models"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ml-models'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Enable RLS

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

## Verification

### Test RLS Policies

**Test 1: User can upload to own folder**
```typescript
const supabase = createClient(); // Authenticated as user A

const { error } = await supabase.storage
  .from("ml-models")
  .upload("models/{userA_id}/glucose-prediction/1.0.0/model.json", blob);

// Should succeed
assert(error === null);
```

**Test 2: User cannot upload to another user's folder**
```typescript
const supabase = createClient(); // Authenticated as user A

const { error } = await supabase.storage
  .from("ml-models")
  .upload("models/{userB_id}/glucose-prediction/1.0.0/model.json", blob);

// Should fail with policy violation
assert(error !== null);
```

**Test 3: User can read own models**
```typescript
const supabase = createClient(); // Authenticated as user A

const { data, error } = await supabase.storage
  .from("ml-models")
  .download("models/{userA_id}/glucose-prediction/1.0.0/model.json");

// Should succeed
assert(data !== null);
```

**Test 4: User cannot read another user's models**
```typescript
const supabase = createClient(); // Authenticated as user A

const { data, error } = await supabase.storage
  .from("ml-models")
  .download("models/{userB_id}/glucose-prediction/1.0.0/model.json");

// Should fail with policy violation
assert(data === null);
```

## Integration with ML Pipeline

### Model Storage Module

The `model-storage.ts` module handles all storage operations:

```typescript
import { saveModel, loadModel, getOrLoadModel } from "@/lib/ml/model-storage";

// Save model (automatic path generation)
await saveModel(userId, "glucose-prediction", "1.0.0", modelData, metadata);
// → Uploads to: models/{userId}/glucose-prediction/1.0.0/model.json

// Load model (with caching)
const { modelData, metadata } = await getOrLoadModel(userId, "glucose-prediction");
// → Downloads from storage (or returns cached version)
```

### RLS Enforcement

- **Authenticated requests**: RLS policies automatically enforce per-user access
- **Service role bypass**: NEVER use service role for model access (violates RLS)
- **Supabase client**: Always use authenticated client from `@/lib/supabase/client`

## Performance Optimization

### Caching Strategy

**In-memory cache** (1-hour TTL):
- First model load: ~5s (download from storage)
- Cached load: <50ms (memory lookup)
- Cache invalidation: On version deployment or rollback

```typescript
// Cached loading (preferred)
const model = await getOrLoadModel(userId, "glucose-prediction");

// Force reload (bypasses cache)
invalidateCache(userId, "glucose-prediction");
const freshModel = await loadModel(userId, "glucose-prediction");
```

### Signed URLs (Future Enhancement)

For client-side model loading (e.g., in-browser TensorFlow.js):
```typescript
const { data } = await supabase.storage
  .from("ml-models")
  .createSignedUrl("models/{userId}/glucose-prediction/1.0.0/model.json", 3600);

// data.signedUrl valid for 1 hour
```

## Monitoring

### Storage Metrics to Track

1. **Storage usage**: Monitor per-user storage consumption
   ```sql
   SELECT
     (storage.foldername(name))[1] as user_id,
     COUNT(*) as model_count,
     SUM(metadata->>'size')::bigint as total_bytes
   FROM storage.objects
   WHERE bucket_id = 'ml-models'
   GROUP BY user_id;
   ```

2. **Model versions per user**:
   ```sql
   SELECT personId, COUNT(*) as version_count
   FROM PersonalModel
   WHERE modelType = 'glucose-prediction'
   GROUP BY personId
   ORDER BY version_count DESC;
   ```

3. **Active models**:
   ```sql
   SELECT COUNT(*) as active_model_count
   FROM PersonalModel
   WHERE isActive = true;
   ```

### Cleanup Policy

**Archive old model versions** (keep last 3 versions):
```typescript
async function cleanupOldModels(personId: string, modelType: string) {
  const versions = await listModelVersions(personId, modelType);

  // Keep active model + last 2 inactive versions
  const toDelete = versions
    .filter(v => !v.isActive)
    .sort((a, b) => b.trainedAt.getTime() - a.trainedAt.getTime())
    .slice(3); // Keep only latest 3 inactive versions

  for (const version of toDelete) {
    await deleteModel(personId, modelType, version.version);
  }
}
```

## Security Best Practices

### DO:
- ✅ Use authenticated Supabase client for all storage operations
- ✅ Validate file sizes (<10 MB)
- ✅ Validate MIME type (`application/json`)
- ✅ Store only serialized model data (no sensitive user data)
- ✅ Implement rate limiting on model uploads (max 10 versions per user)

### DON'T:
- ❌ Use service role for model access (bypasses RLS)
- ❌ Store PHI (personal health information) in model files
- ❌ Allow public access to `ml-models` bucket
- ❌ Hardcode storage paths (use dynamic generation)
- ❌ Store raw glucose values in model metadata

## Troubleshooting

### Issue 1: "Bucket not found" error
**Solution**: Verify bucket exists and name is correct (`ml-models`).
```bash
supabase storage list
```

### Issue 2: "Policy violation" error
**Solution**: Check RLS policies are applied and user is authenticated.
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'ml-models';
```

### Issue 3: Model upload fails with size limit error
**Solution**: Increase bucket file size limit or compress model data.
```bash
supabase storage update ml-models --file-size-limit 20MB
```

### Issue 4: Cache not invalidating
**Solution**: Manually invalidate cache after deployment.
```typescript
import { invalidateCache } from "@/lib/ml/model-storage";
invalidateCache(userId, "glucose-prediction");
```

## Deployment Checklist

**Before deploying ML features to production**:
- [ ] Create `ml-models` storage bucket (private)
- [ ] Apply all 4 RLS policies (INSERT, SELECT, UPDATE, DELETE)
- [ ] Enable RLS on `storage.objects` table
- [ ] Test RLS policies with multiple users (positive and negative cases)
- [ ] Verify PersonalModel schema is migrated
- [ ] Test model upload/download flow end-to-end
- [ ] Set up monitoring for storage usage
- [ ] Document cleanup policy for old model versions
- [ ] Configure rate limiting for model uploads (optional)

## References

- Supabase Storage Documentation: https://supabase.com/docs/guides/storage
- Supabase RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- ML Pipeline README: `/apps/web/src/lib/ml/README.md`
- Model Storage Implementation: `/apps/web/src/lib/ml/model-storage.ts`
