# Food Photos Storage - Security Architecture

## Overview

This document explains the security architecture for the `food-photos` Supabase Storage bucket, including RLS policies, path-based isolation, and access control flow.

---

## Security Model

### Path-Based Isolation

```
food-photos/
├── {userId-1}/
│   ├── photo-abc123.jpg  ← User 1 can access
│   ├── photo-def456.jpg  ← User 1 can access
│   └── photo-ghi789.png  ← User 1 can access
├── {userId-2}/
│   ├── photo-xyz001.jpg  ← User 2 can access
│   └── photo-uvw002.png  ← User 2 can access
└── {userId-3}/
    └── photo-rst003.jpg  ← User 3 can access
```

**Key Principle:** Each user has their own folder (`{userId}/`) and can ONLY access files within their folder.

---

## RLS Policy Flow

### Upload Operation (INSERT)

```
User Request: Upload photo
    ↓
[1] Authenticate user → auth.uid()
    ↓
[2] Determine target path: {userId}/{photoId}.jpg
    ↓
[3] RLS Policy Check:
    ├─ bucket_id = 'food-photos'? ✓
    ├─ auth.uid() IS NOT NULL? ✓
    └─ (storage.foldername(name))[1] = auth.uid()::text? ✓
    ↓
[4] File Size Check: < 5MB? ✓
    ↓
[5] MIME Type Check: JPEG or PNG? ✓
    ↓
[6] Upload Success → Return path & signed URL
```

**Failure Points:**
- ❌ User not authenticated → 401 Unauthorized
- ❌ Trying to upload to another user's folder → 403 Forbidden (RLS blocks)
- ❌ File > 5MB → 413 Payload Too Large
- ❌ File not JPEG/PNG → 415 Unsupported Media Type

---

### View Operation (SELECT)

```
User Request: Download photo-abc123.jpg
    ↓
[1] Authenticate user → auth.uid()
    ↓
[2] Target path: {userId}/{photoId}.jpg
    ↓
[3] RLS Policy Check:
    ├─ bucket_id = 'food-photos'? ✓
    ├─ auth.uid() IS NOT NULL? ✓
    └─ (storage.foldername(name))[1] = auth.uid()::text? ✓
    ↓
[4] Download Success → Return file blob
```

**Failure Points:**
- ❌ User not authenticated → 401 Unauthorized
- ❌ Trying to access another user's photo → 403 Forbidden (RLS blocks)
- ❌ Photo doesn't exist → 404 Not Found

---

### Delete Operation (DELETE)

```
User Request: Delete photo-abc123.jpg
    ↓
[1] Authenticate user → auth.uid()
    ↓
[2] Target path: {userId}/{photoId}.jpg
    ↓
[3] RLS Policy Check:
    ├─ bucket_id = 'food-photos'? ✓
    ├─ auth.uid() IS NOT NULL? ✓
    └─ (storage.foldername(name))[1] = auth.uid()::text? ✓
    ↓
[4] Delete Success → File removed
```

**Failure Points:**
- ❌ User not authenticated → 401 Unauthorized
- ❌ Trying to delete another user's photo → 403 Forbidden (RLS blocks)
- ❌ Photo doesn't exist → 404 Not Found

---

## Signed URL Security

### How Signed URLs Work

```
Client Request: Get signed URL for photo-abc123.jpg
    ↓
[1] Authenticate user → auth.uid()
    ↓
[2] RLS Check: Can user access this photo?
    ├─ Yes → Generate signed URL with token
    └─ No → 403 Forbidden
    ↓
[3] Return signed URL:
    https://supabase.storage/food-photos/{userId}/photo-abc123.jpg
    ?token=eyJhbGc...
    &Expires=1728564000
    ↓
[4] Client uses signed URL to download
    ├─ Token valid + not expired → Download succeeds
    └─ Token invalid or expired → 403 Forbidden
```

**Security Properties:**
- ✅ Tokens expire after 1 hour (3600 seconds)
- ✅ Tokens are cryptographically signed (cannot be forged)
- ✅ Tokens are specific to the file path (cannot be used for other files)
- ✅ RLS policies still apply (user must have access to file)
- ✅ Expired tokens cannot be refreshed (must generate new URL)

---

## Cross-User Access Prevention

### Scenario: User A tries to access User B's photo

```
User A (auth.uid() = "user-a-123")
    ↓
Attempts to access: food-photos/user-b-456/photo.jpg
    ↓
RLS Policy Check:
    (storage.foldername(name))[1] = auth.uid()::text
    ↓
    "user-b-456" == "user-a-123"? ❌ FALSE
    ↓
Access Denied → 403 Forbidden
```

**Result:** User A CANNOT access User B's photos, even if they know the exact file path.

---

## Service Role Bypass

### When Service Role is Used

Service role bypasses ALL RLS policies (super admin access).

**Allowed Use Cases:**
1. ✅ Admin dashboard: View all user photos for moderation
2. ✅ Data export: Backup all photos for disaster recovery
3. ✅ Cleanup jobs: Delete orphaned photos (no linked database record)
4. ✅ Health checks: Verify bucket configuration

**NEVER Use Service Role For:**
1. ❌ Regular user operations (use anon key with auth session)
2. ❌ Client-side code (expose only anon key to frontend)
3. ❌ Non-admin features (use RLS-enforced connections)

```typescript
// ✅ CORRECT: User operation with anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// User session sets auth.uid() → RLS enforced

// ❌ WRONG: Using service role for user operation
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Bypasses RLS → Can access ALL photos
```

---

## Bucket Configuration

### Current Settings

| Property            | Value                              | Purpose                                   |
|---------------------|------------------------------------|-------------------------------------------|
| `id`                | `food-photos`                      | Unique bucket identifier                  |
| `public`            | `false`                            | Require authentication (RLS enforced)     |
| `file_size_limit`   | `5242880` (5MB)                    | Prevent abuse with large files            |
| `allowed_mime_types`| `image/jpeg`, `image/jpg`, `image/png` | Only allow image files (security)     |

### Why These Settings?

1. **Private Bucket (`public: false`)**
   - Requires authentication for all operations
   - Enables RLS policies to enforce per-user isolation
   - Prevents anonymous users from accessing photos

2. **5MB File Size Limit**
   - Prevents abuse (users uploading large files)
   - Optimizes storage costs
   - Reasonable size for food photos (typically 1-3MB)

3. **JPEG/PNG Only**
   - Prevents upload of malicious files (e.g., executable scripts)
   - Ensures consistent image format for display
   - Simplifies client-side handling (no need to handle PDFs, videos, etc.)

---

## Performance Considerations

### Indexing Strategy

The RLS policies use `storage.foldername(name)[1]` to extract the userId from the path. This is efficient because:

1. **No Database Joins**: Policies don't require joins with other tables
2. **Path-Based**: Filtering happens at the file system level
3. **Indexed Column**: The `name` column in `storage.objects` is indexed

### Query Performance

```sql
-- ✅ FAST: Uses path prefix for filtering
SELECT * FROM storage.objects
WHERE bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] = 'user-id-123';

-- ❌ SLOW: Requires full table scan
SELECT * FROM storage.objects
WHERE bucket_id = 'food-photos'
  AND name LIKE '%user-id-123%';
```

### Signed URL Caching

Client applications should cache signed URLs:

```typescript
// ✅ GOOD: Cache signed URL for up to 1 hour
const cachedUrl = localStorage.getItem(`photo-${photoId}-url`);
const cachedExpiry = localStorage.getItem(`photo-${photoId}-expiry`);

if (cachedUrl && Date.now() < parseInt(cachedExpiry)) {
  return cachedUrl; // Use cached URL
}

// Generate new URL if expired
const newUrl = await getFoodPhotoUrl(supabase, userId, photoId);
localStorage.setItem(`photo-${photoId}-url`, newUrl);
localStorage.setItem(`photo-${photoId}-expiry`, Date.now() + 3600000);
```

---

## Security Checklist

Before deploying to production, verify:

- [ ] RLS is enabled on `storage.objects` table
- [ ] All 4 RLS policies are applied (INSERT, SELECT, UPDATE, DELETE)
- [ ] Bucket is private (`public: false`)
- [ ] File size limit is 5MB
- [ ] Allowed MIME types are JPEG/PNG only
- [ ] Service role key is NEVER exposed to client
- [ ] Anon key is used for user operations
- [ ] Signed URLs expire after 1 hour
- [ ] Cross-user access is blocked (tested)
- [ ] Upload size limit is enforced (tested)
- [ ] MIME type validation works (tested)

---

## Monitoring & Alerts

### Metrics to Track

1. **Storage Usage**
   - Total photos per user (detect abuse)
   - Total bucket size (cost monitoring)
   - Average file size (quality monitoring)

2. **Access Patterns**
   - Failed upload attempts (security monitoring)
   - 403 Forbidden errors (potential attack)
   - Signed URL generation rate (performance monitoring)

3. **Security Events**
   - Cross-user access attempts (audit log)
   - Large file upload attempts (abuse detection)
   - Invalid MIME type uploads (malicious file detection)

### Alerting Rules

```typescript
// Example: Alert if user uploads > 100 photos in 1 hour
if (userPhotoCount > 100 && timeWindow < 3600) {
  sendAlert('Potential abuse: User uploaded 100+ photos in 1 hour');
}

// Example: Alert if 403 errors spike
if (forbiddenErrorRate > 10 per minute) {
  sendAlert('High 403 error rate: Possible attack');
}
```

---

## Compliance Notes

### GDPR Compliance

- **Right to Access**: Users can download all their photos via API
- **Right to Deletion**: Users can delete their own photos
- **Data Portability**: Export feature available via service role
- **Data Minimization**: Only store necessary photo data (no EXIF metadata)

### HIPAA Considerations (Future)

If handling medical images:
- Enable encryption at rest (Supabase Storage supports this)
- Implement audit logging for all access
- Add data retention policies (auto-delete after N days)
- Ensure BAA (Business Associate Agreement) with Supabase

---

## Disaster Recovery

### Backup Strategy

```bash
# Backup all photos using service role
supabase storage export food-photos \
  --output /backups/food-photos-$(date +%Y%m%d).tar.gz

# Schedule daily backups via cron
0 2 * * * /scripts/backup-storage.sh
```

### Restore Strategy

```bash
# Restore from backup
supabase storage import food-photos \
  --input /backups/food-photos-20251010.tar.gz
```

---

## Testing Strategy

### Unit Tests
- File validation (size, MIME type)
- Path generation (correct format)
- Error handling (upload failures)

### Integration Tests
- Upload flow (file → storage → URL)
- Download flow (URL → file blob)
- Delete flow (remove file)

### Security Tests
- Cross-user access (User A cannot access User B's photos)
- Unauthenticated access (Anonymous users blocked)
- File size limit (6MB file rejected)
- MIME type validation (PDF rejected)

### Performance Tests
- Concurrent uploads (100 users uploading simultaneously)
- Large file uploads (5MB files)
- Signed URL generation (1000 URLs/second)

---

## Summary

The `food-photos` bucket security architecture provides:

✅ **Per-User Isolation**: Path-based RLS policies
✅ **Access Control**: 4 RLS policies (INSERT, SELECT, UPDATE, DELETE)
✅ **Secure URLs**: Signed URLs with 1-hour expiry
✅ **Size Limits**: 5MB max per file
✅ **Type Validation**: JPEG/PNG only
✅ **Fail-Secure**: Deny by default, explicit grants
✅ **Performance**: No database joins, indexed columns
✅ **Monitoring**: Metrics and alerting ready

**Next Steps:**
1. Deploy SQL to staging/production
2. Implement upload API endpoint
3. Add client-side upload UI
4. Configure monitoring alerts
5. Schedule automated backups
