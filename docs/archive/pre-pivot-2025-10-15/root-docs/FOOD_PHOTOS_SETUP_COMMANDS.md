# Food Photos Storage Bucket - Quick Setup Commands

## 🚀 Immediate Execution Commands

Copy and paste these commands to set up the food-photos bucket.

---

## **Step 1: Create Bucket & Apply RLS Policies**

### Option A: Using Supabase CLI (Recommended for Local)

```bash
# For local development
./scripts/setup-food-photos-bucket.sh local
```

### Option B: Manual SQL Execution

```bash
# Connect to your Supabase database
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f db/storage-food-photos.sql
```

### Option C: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `db/storage-food-photos.sql`
3. Execute the SQL

---

## **Step 2: Verify Bucket Configuration**

```bash
# Check bucket exists
supabase db execute -c "
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'food-photos';
"
```

**Expected Output:**
```
id          | name        | public | file_size_limit | allowed_mime_types
------------+-------------+--------+-----------------+----------------------------
food-photos | food-photos | false  | 5242880         | {image/jpeg,image/jpg,image/png}
```

---

## **Step 3: Verify RLS Policies**

```bash
# List all policies
supabase db execute -c "
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%food photos%'
ORDER BY policyname;
"
```

**Expected: 4 policies**
1. Users can upload food photos to own folder (INSERT)
2. Users can view own food photos (SELECT)
3. Users can update own food photos (UPDATE)
4. Users can delete own food photos (DELETE)

---

## **Step 4: Run Automated Tests**

```bash
# Run test suite
npm run test -- tests/storage-security/food-photos-rls.test.ts
```

**Expected: All tests pass (12 tests)**

---

## **Step 5: Manual Testing**

### Test 1: Upload 2MB JPEG (Success Case)

```bash
# Create test image (2MB)
dd if=/dev/zero of=/tmp/test-2mb.jpg bs=1M count=2

# Upload via API (implement endpoint first)
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: test-user-123" \
  -F "file=@/tmp/test-2mb.jpg"
```

**Expected:** `200 OK` with `{ success: true, photoId: "...", url: "..." }`

---

### Test 2: Upload 6MB File (Should Fail)

```bash
# Create large file (6MB)
dd if=/dev/zero of=/tmp/test-6mb.jpg bs=1M count=6

# Attempt upload
curl -X POST http://localhost:3000/api/food-photos/upload \
  -H "x-user-id: test-user-123" \
  -F "file=@/tmp/test-6mb.jpg"
```

**Expected:** `413 Payload Too Large` or error message "File size exceeds 5MB limit"

---

### Test 3: Cross-User Access (Should Fail)

```typescript
// In Node.js REPL or test script
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// User A uploads
// User B attempts to access → Should fail with 403 Forbidden
const { error } = await supabase.storage
  .from('food-photos')
  .download('user-a-id/photo-123.jpg');

console.log(error); // Expected: Error object
```

---

### Test 4: Generate Signed URL with 1-Hour Expiry

```typescript
import { getFoodPhotoUrl } from '@/lib/storage/food-photos';

const url = await getFoodPhotoUrl(supabase, 'user-id', 'photo-123');

console.log('Signed URL:', url);
console.log('Valid for 1 hour');

// Test URL in browser → Should display image
// Wait 1 hour → Should show 403 Forbidden
```

---

## **Step 6: Health Check**

Create health check endpoint (optional):

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
  return Response.json(result);
}
```

**Test:**
```bash
curl http://localhost:3000/api/health/storage
```

**Expected:**
```json
{
  "configured": true
}
```

---

## **Success Criteria Checklist**

- [ ] Bucket created: `food-photos`
- [ ] Privacy: Private (RLS enabled)
- [ ] File size limit: 5MB
- [ ] Allowed types: JPEG, PNG only
- [ ] Path structure: `{userId}/{photoId}.jpg`
- [ ] 4 RLS policies applied
- [ ] Upload 2MB JPEG: ✅ Success
- [ ] Upload 6MB file: ✅ Fails with 413
- [ ] Cross-user access: ✅ Blocked
- [ ] Signed URLs: ✅ Work for 1 hour then expire
- [ ] All tests pass: ✅ 12/12

---

## **Troubleshooting**

### Bucket not found
```bash
# Re-run setup
./scripts/setup-food-photos-bucket.sh local
```

### RLS not working
```bash
# Check if RLS is enabled
supabase db execute -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects';"

# Enable RLS if false
supabase db execute -c "ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;"
```

### Tests fail with "Supabase credentials not available"
```bash
# Set environment variables
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## **Files Created**

1. **SQL Setup:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/storage-food-photos.sql`
2. **Setup Script:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/scripts/setup-food-photos-bucket.sh`
3. **TypeScript Module:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/apps/web/src/lib/storage/food-photos.ts`
4. **Test Suite:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/tests/storage-security/food-photos-rls.test.ts`
5. **Verification Guide:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/docs/storage-bucket-verification-guide.md`
6. **This Quick Reference:** `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/FOOD_PHOTOS_SETUP_COMMANDS.md`

---

## **Next Steps**

After successful setup:

1. Integrate into food logging feature
2. Add upload UI component
3. Implement API endpoints (`/api/food-photos/upload`, `/api/food-photos/:id`)
4. Add to CI/CD pipeline
5. Deploy to staging and production

---

**Ready to execute? Start with:**
```bash
./scripts/setup-food-photos-bucket.sh local
```
