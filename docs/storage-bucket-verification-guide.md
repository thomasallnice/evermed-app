# Food Photos Storage Bucket - Verification Guide

## Overview

This guide provides step-by-step verification commands to ensure the `food-photos` storage bucket is correctly configured with proper RLS policies.

## Prerequisites

- Supabase project linked (`supabase link`)
- SQL file applied (`db/storage-food-photos.sql`)
- Environment variables set (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)

---

## Quick Start

### 1. Run Setup Script

```bash
# For local development
./scripts/setup-food-photos-bucket.sh local

# For staging
./scripts/setup-food-photos-bucket.sh staging

# For production
./scripts/setup-food-photos-bucket.sh prod
```

### 2. Verify Bucket Configuration

```bash
# Check bucket exists and has correct settings
supabase db execute -c "
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'food-photos';
"
```

**Expected Output:**
```
 id          | name        | public | file_size_limit | allowed_mime_types
-------------+-------------+--------+-----------------+----------------------------------
 food-photos | food-photos | false  | 5242880         | {image/jpeg,image/jpg,image/png}
```

### 3. Verify RLS Policies

```bash
# List all RLS policies for food-photos bucket
supabase db execute -c "
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%food photos%'
ORDER BY policyname;
"
```

**Expected Output:**
```
policyname                                  | cmd    | qual                        | with_check
--------------------------------------------+--------+-----------------------------+---------------------------
Users can delete own food photos            | DELETE | (bucket_id = 'food-photos') | NULL
Users can upload food photos to own folder  | INSERT | NULL                        | (bucket_id = 'food-photos')
Users can update own food photos            | UPDATE | (bucket_id = 'food-photos') | (bucket_id = 'food-photos')
Users can view own food photos              | SELECT | (bucket_id = 'food-photos') | NULL
```

---

## Manual Testing Scenarios

### Test 1: Upload 2MB JPEG (Should Succeed)

```typescript
// apps/web/src/app/api/test-upload/route.ts
import { uploadFoodPhoto } from '@/lib/storage/food-photos';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Mock 2MB image buffer
const testImage = Buffer.alloc(2 * 1024 * 1024);
testImage.writeUInt8(0xFF, 0); // JPEG magic number
testImage.writeUInt8(0xD8, 1);

const result = await uploadFoodPhoto(supabase, {
  file: testImage,
  userId: 'test-user-id',
  contentType: 'image/jpeg',
});

console.log(result);
// Expected: { success: true, photoId: '...', path: '...', url: '...' }
```

**Command Line Test:**
```bash
# Using curl to upload via API
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: test-user-id" \
  -F "file=@/path/to/test-2mb.jpg"
```

**Expected:** `200 OK` with JSON response containing `photoId` and `url`

---

### Test 2: Upload 6MB File (Should Fail)

```bash
# Create 6MB test file
dd if=/dev/zero of=/tmp/large-file.jpg bs=1M count=6

# Attempt upload
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: test-user-id" \
  -F "file=@/tmp/large-file.jpg"
```

**Expected:** `413 Payload Too Large` or error message "File size exceeds 5MB limit"

---

### Test 3: Upload Non-JPEG/PNG File (Should Fail)

```bash
# Create PDF test file
echo "This is a test PDF" > /tmp/test-document.pdf

# Attempt upload
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: test-user-id" \
  -F "file=@/tmp/test-document.pdf"
```

**Expected:** Error message "Invalid file type. Only JPEG and PNG images are allowed"

---

### Test 4: Cross-User Access (Should Fail)

```typescript
// User A uploads a photo
const userAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Set auth context for User A (via session)

await uploadFoodPhoto(userAClient, {
  file: testImage,
  userId: 'user-a-id',
});

// User B attempts to access User A's photo
const userBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Set auth context for User B (via session)

const { data, error } = await userBClient.storage
  .from('food-photos')
  .download('user-a-id/photo-123.jpg');

console.log(error);
// Expected: Error - 403 Forbidden or "Object not found"
```

**Command Line Test:**
```bash
# User A uploads
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: user-a-id" \
  -F "file=@/tmp/test.jpg"

# User B attempts download (should fail)
curl -X GET http://localhost:3000/api/food-photos/user-a-id/photo-123.jpg \
  -H "x-user-id: user-b-id"
```

**Expected:** `403 Forbidden` or `404 Not Found`

---

### Test 5: Signed URL with 1-Hour Expiry

```typescript
import { getFoodPhotoUrl } from '@/lib/storage/food-photos';

// Generate signed URL
const url = await getFoodPhotoUrl(supabase, 'user-id', 'photo-123');

console.log('Signed URL:', url);
// Expected: URL with query params including token and expiry

// Verify URL is accessible immediately
const response = await fetch(url);
console.log('Immediate access:', response.status);
// Expected: 200 OK

// Parse expiry from URL
const urlObj = new URL(url);
const expiresAt = urlObj.searchParams.get('Expires');
console.log('Expires at:', new Date(parseInt(expiresAt!) * 1000));
// Expected: 1 hour from now (3600 seconds)
```

**Manual Verification:**
1. Copy signed URL from response
2. Open in browser → Should display image
3. Wait 1 hour
4. Open same URL again → Should show `403 Forbidden` or expired error

---

### Test 6: Delete Own Photo (Should Succeed)

```typescript
import { deleteFoodPhoto } from '@/lib/storage/food-photos';

// User deletes their own photo
const success = await deleteFoodPhoto(supabase, 'user-id', 'photo-123');

console.log('Deleted:', success);
// Expected: true

// Verify photo is gone
const url = await getFoodPhotoUrl(supabase, 'user-id', 'photo-123');
console.log('URL after delete:', url);
// Expected: null
```

**Command Line Test:**
```bash
curl -X DELETE http://localhost:3000/api/food-photos/photo-123 \
  -H "x-user-id: user-id"
```

**Expected:** `200 OK` with success message

---

### Test 7: Delete Another User's Photo (Should Fail)

```bash
# User A uploads
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: user-a-id" \
  -F "file=@/tmp/test.jpg"

# User B attempts to delete User A's photo
curl -X DELETE http://localhost:3000/api/food-photos/photo-123 \
  -H "x-user-id: user-b-id"
```

**Expected:** `403 Forbidden` or `404 Not Found`

---

## Automated Test Suite

Run the comprehensive test suite:

```bash
# Run all storage security tests
npm run test -- tests/storage-security/food-photos-rls.test.ts

# Run with coverage
npm run test -- tests/storage-security/food-photos-rls.test.ts --coverage
```

**Expected Output:**
```
✓ Upload Permissions (4 tests)
  ✓ should allow user to upload to their own folder
  ✓ should block upload exceeding 5MB file size limit
  ✓ should block upload of non-JPEG/PNG file types
  ✓ should block user from uploading to another user's folder

✓ View Permissions (2 tests)
  ✓ should allow user to view their own photos
  ✓ should block user from viewing another user's photos

✓ Delete Permissions (2 tests)
  ✓ should allow user to delete their own photos
  ✓ should block user from deleting another user's photos

✓ Signed URL Generation (2 tests)
  ✓ should generate signed URL with 1-hour expiry
  ✓ should generate signed URL that expires after 1 hour

✓ Cross-User Access Isolation (1 test)
  ✓ should completely isolate User A and User B photos

✓ Bucket Configuration Verification (1 test)
  ✓ should have food-photos bucket configured correctly

Test Summary: 12 passed, 0 failed
```

---

## Health Check Endpoint

Create a health check endpoint to verify bucket configuration:

```typescript
// apps/web/src/app/api/health/storage/route.ts
import { verifyBucketConfiguration } from '@/lib/storage/food-photos';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = await verifyBucketConfiguration(supabase);

  return Response.json({
    bucket: 'food-photos',
    configured: result.configured,
    error: result.error,
    timestamp: new Date().toISOString(),
  });
}
```

**Test:**
```bash
curl http://localhost:3000/api/health/storage
```

**Expected:**
```json
{
  "bucket": "food-photos",
  "configured": true,
  "timestamp": "2025-10-10T12:00:00.000Z"
}
```

---

## Troubleshooting

### Issue: Bucket not found

**Symptom:** `Error: Bucket 'food-photos' does not exist`

**Solution:**
```bash
# Run setup script
./scripts/setup-food-photos-bucket.sh local

# Or manually execute SQL
psql $DATABASE_URL -f db/storage-food-photos.sql
```

---

### Issue: RLS policies not working

**Symptom:** Users can access other users' photos

**Solution:**
```bash
# Check if RLS is enabled
supabase db execute -c "
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';
"

# If rowsecurity is false, enable it
supabase db execute -c "
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
"

# Re-apply policies
psql $DATABASE_URL -f db/storage-food-photos.sql
```

---

### Issue: File upload fails with "Payload too large"

**Symptom:** Cannot upload files larger than default limit

**Solution:**
```bash
# Update bucket file size limit
supabase db execute -c "
UPDATE storage.buckets
SET file_size_limit = 5242880
WHERE id = 'food-photos';
"
```

---

### Issue: Signed URLs expire immediately

**Symptom:** Signed URLs return 403 Forbidden immediately

**Solution:**
```typescript
// Increase expiry time when generating URL
const { data } = await supabase.storage
  .from('food-photos')
  .createSignedUrl(path, 3600); // 3600 seconds = 1 hour

// Or use a longer expiry for debugging
const { data } = await supabase.storage
  .from('food-photos')
  .createSignedUrl(path, 86400); // 24 hours
```

---

## CI/CD Integration

Add storage verification to CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Verify Storage Configuration
  run: |
    npm run test -- tests/storage-security/food-photos-rls.test.ts
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## Success Criteria Checklist

Before marking this task as complete, verify:

- [ ] Bucket created with correct name (`food-photos`)
- [ ] Bucket is private (RLS enabled)
- [ ] File size limit is 5MB (5242880 bytes)
- [ ] Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`
- [ ] 4 RLS policies applied (upload, view, update, delete)
- [ ] Upload 2MB JPEG succeeds ✅
- [ ] Upload 6MB file fails with 413 ✅
- [ ] Cross-user access blocked ✅
- [ ] Signed URLs work for 1 hour then expire ✅
- [ ] Path isolation enforced (`{userId}/*`) ✅
- [ ] All automated tests pass ✅

---

## Documentation

- **SQL Setup:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/storage-food-photos.sql`
- **Setup Script:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/scripts/setup-food-photos-bucket.sh`
- **TypeScript Module:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/apps/web/src/lib/storage/food-photos.ts`
- **Test Suite:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/tests/storage-security/food-photos-rls.test.ts`
- **This Guide:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/docs/storage-bucket-verification-guide.md`
