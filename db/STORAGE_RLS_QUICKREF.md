# Storage RLS Quick Reference: Documents Bucket

## TL;DR

✅ **RLS policies deployed**: Users can only access files in their own Person folders
✅ **Path structure**: `{personId}/{timestamp}-{filename}`
✅ **Ownership chain**: Storage path → personId → Person.ownerId → auth.uid()
✅ **Performance index**: `Person(id, ownerId)` index created

## Common Operations

### Upload File (Service Role)

```typescript
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  { auth: { persistSession: false } }
);

const storagePath = `${personId}/${Date.now()}-${fileName}`;
const { error } = await admin.storage
  .from('documents')
  .upload(storagePath, fileBuffer, { contentType: mimeType });
```

### Generate Signed URL (Service Role)

```typescript
// In API route (server-side only)
const { data, error } = await admin.storage
  .from('documents')
  .createSignedUrl(storagePath, 3600); // 1 hour expiry

// Returns: { data: { signedUrl: "https://..." }, error: null }
```

### Access File (User Session)

```typescript
// In client-side code with authenticated user
const supabase = createBrowserClient();

// User's auth token is automatically included
fetch(signedUrl) // RLS policies validate ownership
  .then(res => res.blob())
  .then(blob => {
    // Handle file
  });
```

## Authorization Flow

### Upload Flow

1. **Client** → POST `/api/uploads` with file + personId
2. **API** validates: `person.ownerId === userId` (application-level auth)
3. **API** uploads with service role (bypasses RLS)
4. **API** creates Document record with `storagePath`
5. **API** returns documentId to client

### Download Flow

1. **Client** → GET `/api/documents/:id`
2. **API** validates: user owns Document (via Person.ownerId)
3. **API** generates signed URL with service role
4. **API** returns signed URL to client
5. **Client** fetches signed URL
6. **Supabase** validates:
   - URL signature (cryptographic)
   - Expiration time (1 hour)
   - RLS policy: auth.uid() matches Person.ownerId ✅

## RLS Policy Logic

All 4 policies (INSERT, SELECT, UPDATE, DELETE) use this check:

```sql
bucket_id = 'documents'
AND auth.uid() IS NOT NULL
AND (
  EXISTS (
    SELECT 1 FROM "Person"
    WHERE "Person".id::text = (storage.foldername(name))[1]
    AND "Person"."ownerId" = auth.uid()::text
  )
)
```

**Translation**: "User can access file if they own the Person record in the path."

## Security Checks

### ✅ Allowed

- User A accesses `personId-A/file.pdf` where Person A's ownerId = User A's auth.uid()
- Service role accesses any file (for legitimate API operations)

### ❌ Blocked

- User A accesses `personId-B/file.pdf` where Person B's ownerId ≠ User A's auth.uid()
- Unauthenticated user accesses any file (auth.uid() IS NULL)
- User accesses `orphaned-person-id/file.pdf` where Person record doesn't exist

## Debugging

### Check Policy Status

```sql
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%documents%';
```

### Check Ownership Chain for a File

```sql
SELECT
  o.name as file_path,
  (storage.foldername(o.name))[1] as person_id,
  p."ownerId" as auth_uid_owner
FROM storage.objects o
LEFT JOIN "Person" p ON p.id = (storage.foldername(o.name))[1]
WHERE o.bucket_id = 'documents'
  AND o.name = 'f087d811-e0c6-4308-bda4-a47138cad662/1234567890-test.pdf';
```

### Common Issues

**400 Error on Signed URL**:
- User's auth token expired → Re-authenticate
- Person record deleted → File is orphaned (expected denial)
- Wrong user trying to access → RLS correctly blocking (expected denial)

**Slow File Access**:
- Check if `Person_id_ownerId_idx` index exists
- Monitor Supabase logs for slow queries

## Important Notes

1. **Service Role Bypass**: Service role key bypasses ALL RLS policies. Use only in server-side API routes, never expose to client.

2. **Signed URLs**: Signed URLs are cryptographically secure but RLS policies still apply. User must be authenticated and own the Person record.

3. **Path Structure**: MUST use `{personId}/{timestamp}-{filename}`. Enforced by upload endpoint, validated by RLS policies.

4. **Transitive Ownership**: Unlike other buckets (food-photos, ml-models), this uses personId, not auth.uid() directly. This maintains Person abstraction.

5. **Orphaned Files**: If Person record is deleted, files become inaccessible (no cleanup by default). Consider implementing cleanup job.

## Files

- **Policies**: `/db/storage-documents.sql`
- **Tests**: `/db/test-storage-documents.sql`
- **Full Docs**: `/db/STORAGE_RLS_IMPLEMENTATION.md`
- **This File**: `/db/STORAGE_RLS_QUICKREF.md`

## Verification Commands

```bash
# Apply policies
export PGPASSWORD="..." && psql -h ... -U postgres -d postgres -f db/storage-documents.sql

# Run tests
psql -h ... -U postgres -d postgres -f db/test-storage-documents.sql

# Check policies exist
psql -h ... -U postgres -d postgres -c "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%documents%';"
```

---

**Status**: ✅ Deployed
**Last Updated**: 2025-10-10
**Contact**: See `/db/STORAGE_RLS_IMPLEMENTATION.md` for detailed documentation
