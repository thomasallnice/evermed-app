# EverMed Supabase Security Implementation Guide

## Overview

This guide covers the deployment and verification of Row Level Security (RLS) policies and storage security for the EverMed application on Supabase.

## Architecture Summary

**Multi-Tenant Isolation Model:**
- User → Person (1:many) - Users own Persons
- Person → Document (1:many) - Persons have Documents
- Document → Observation, DocChunk (1:many) - Documents have structured data
- Person → SharePack (1:many) - Persons can create shareable packages

**Access Pattern:**
- Server-side API routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- RLS policies provide defense-in-depth protection
- Storage bucket uses RLS for user file access
- Signed URLs generated server-side for temporary file access

## Deployment Steps

### Step 1: Staging Environment Deployment

1. **Access Supabase Dashboard**
   - Navigate to your staging project
   - Go to SQL Editor

2. **Run RLS Policies Script**
   ```bash
   # Copy the contents of db/supabase_rls_policies.sql
   # Paste into Supabase SQL Editor
   # Execute the entire script
   ```

3. **Verify Deployment**
   ```sql
   -- Check RLS is enabled
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;

   -- Verify all tables show rowsecurity = true
   ```

4. **Check Storage Bucket**
   - Navigate to Storage in Supabase Dashboard
   - Verify `documents` bucket exists
   - Confirm it's set to PRIVATE (not public)
   - Check file size limit: 50 MB
   - Verify allowed MIME types include PDFs and images

### Step 2: Run Test Suite

1. **Create Test Users**
   - In Supabase Dashboard → Authentication → Users
   - Create two test users manually or via signup
   - Note their UUIDs for testing

2. **Update Test File**
   - Edit `db/supabase_rls_tests.sql`
   - Replace `user-1111-1111-1111-111111111111` with actual test user UUID
   - Replace `user-2222-2222-2222-222222222222` with second test user UUID

3. **Run Test Suite**
   ```bash
   # Execute the test file in Supabase SQL Editor
   # Review results - all isolation tests should pass
   ```

4. **Storage Tests (Client SDK)**
   - Create a small test script using your test suite
   - Verify upload restrictions work
   - Verify read/download restrictions work

### Step 3: Production Deployment

**IMPORTANT:** Only deploy to production after complete staging validation

1. **Backup Production Database**
   ```bash
   # Via Supabase Dashboard → Database → Backups
   # Or use pg_dump if you have direct access
   ```

2. **Deploy During Low-Traffic Window**
   - Run the same `supabase_rls_policies.sql` script
   - Monitor for errors

3. **Verify Production**
   - Run verification queries (see below)
   - Test with real user accounts
   - Monitor application logs for policy violations

### Step 4: Application Configuration Verification

1. **Verify Environment Variables**
   ```bash
   # .env.local should have:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon key)
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service role key)
   ```

2. **Verify Service Role Usage**
   - Check that all API routes use service role key
   - Confirm no client-side queries use anon key directly
   - Example pattern:
   ```typescript
   // Server-side API route
   const supabase = createClient(url, serviceRoleKey);
   // This bypasses RLS as intended
   ```

3. **Verify Signed URL Generation**
   ```typescript
   // In /apps/web/src/lib/storage.ts
   // Confirm expiration times are reasonable (1-60 minutes)
   await supabase.storage
     .from('documents')
     .createSignedUrl(storagePath, 3600); // 1 hour
   ```

## Security Verification Checklist

### Database RLS

- [ ] RLS enabled on all tables (`rowsecurity = true`)
- [ ] Each table has policies for SELECT, INSERT, UPDATE, DELETE
- [ ] Service role policies exist for all tables
- [ ] Indexes created for policy-filtered columns
- [ ] Test users can only access their own data
- [ ] Test users cannot access other users' data
- [ ] Service role can access all data

### Storage Security

- [ ] `documents` bucket is PRIVATE (not public)
- [ ] File size limit set (50 MB)
- [ ] Allowed MIME types restricted to PDFs and images
- [ ] Upload policy restricts to user's person folders
- [ ] Read policy restricts to user's person folders
- [ ] Delete policy restricts to user's person folders
- [ ] Service role can read all files (for signed URLs)

### Application Security

- [ ] API routes use `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Client-side code does not expose service role key
- [ ] Signed URLs have appropriate expiration times
- [ ] User authentication required for all protected routes
- [ ] `requireUserId()` middleware checks in place

### Data Isolation

- [ ] User A cannot view User B's Persons
- [ ] User A cannot view User B's Documents
- [ ] User A cannot view User B's Observations
- [ ] User A cannot upload to User B's storage folders
- [ ] User A cannot download User B's files
- [ ] Ownership transfer attacks prevented

## Common Security Pitfalls to Avoid

### 1. Storage Path Mismatch

**CRITICAL:** Your upload route uses `{personId}` not `{userId}` in storage paths:

```typescript
const storagePath = `${personId}/${Date.now()}-${fileName}`;
```

This is CORRECT because:
- Storage policies check if the folder (personId) belongs to the authenticated user
- Policy: `EXISTS (SELECT 1 FROM "Person" WHERE id = foldername AND ownerId = auth.uid())`

**DO NOT** change the path pattern without updating storage policies.

### 2. Service Role Key Exposure

**NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code:
- ✅ Use in API routes (server-side)
- ✅ Use in server-side utilities
- ❌ NEVER in client components
- ❌ NEVER in environment variables prefixed with `NEXT_PUBLIC_`

### 3. Signed URL Expiration

Set appropriate expiration times:
- ✅ 5-60 minutes for temporary document viewing
- ❌ 24+ hours (too long, security risk)
- ❌ Permanent URLs (defeats RLS purpose)

Current implementation (1 hour) is reasonable:
```typescript
const expiresInSeconds = 3600; // 1 hour
```

### 4. Missing Ownership Checks

Your upload route correctly verifies ownership:
```typescript
const person = await prisma.person.findUnique({ where: { id: personId } });
if (!person || person.ownerId !== userId) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

**ALWAYS** include this pattern in API routes that accept `personId`, `documentId`, etc.

### 5. Bypass RLS in Wrong Context

Service role should ONLY bypass RLS when:
- ✅ Server-side API routes performing authorized operations
- ✅ Generating signed URLs for authorized access
- ✅ Admin operations with proper authorization checks
- ❌ Client-side operations (use anon key with RLS)

## Performance Considerations

### Index Coverage

All critical columns used in RLS policies have indexes:
- `Person.ownerId` - PRIMARY isolation point
- `Document.personId` - Transitive ownership
- `Observation.personId` - Transitive ownership
- `ChatMessage.userId` - Direct ownership
- All foreign keys used in policy joins

### Query Performance

Monitor slow queries in Supabase Dashboard:
1. Navigate to Database → Query Performance
2. Look for queries involving policy checks
3. If slow, verify indexes exist on filtered columns

### Expected Performance Impact

- Direct ownership checks (Person, ChatMessage): Minimal overhead
- Single-level transitive (Document, Observation): ~5-10% overhead
- Multi-level transitive (DocChunk): ~10-15% overhead
- All should be negligible with proper indexes

## Monitoring and Alerts

### Supabase Dashboard Monitoring

1. **Database Logs**
   - Monitor for policy violation errors
   - Look for unusual access patterns
   - Check for failed authentication attempts

2. **Storage Logs**
   - Monitor file access patterns
   - Watch for unauthorized upload attempts
   - Check signed URL generation rate

3. **API Logs**
   - Monitor for 403 Forbidden responses
   - Check authentication failures
   - Watch for suspicious activity patterns

### Application-Level Monitoring

Add logging to track security events:

```typescript
// In API routes
if (!person || person.ownerId !== userId) {
  console.warn('Ownership check failed', {
    userId,
    personId,
    attemptedBy: userId,
    actualOwner: person?.ownerId
  });
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

## Testing Recommendations

### Unit Tests

Create tests for:
- Storage helper functions (`getSignedUrlForDocument`)
- Ownership verification logic
- API route authorization checks

### Integration Tests

Test end-to-end flows:
1. User creates Person → Success
2. User uploads Document → Success
3. User tries to access another user's Document → Failure (403)
4. User generates signed URL for own Document → Success
5. Signed URL expires correctly

### Security Tests

Specifically test attack scenarios:
1. **Horizontal Privilege Escalation**
   - User A tries to access User B's data
   - Should fail at API route level AND RLS level

2. **Ownership Transfer**
   - User tries to change `ownerId` of their Person
   - Should fail RLS WITH CHECK clause

3. **Path Traversal**
   - User tries to upload to `../other-person-id/file.pdf`
   - Should fail storage policy

4. **Direct Database Access**
   - Simulate client-side query with anon key
   - Should be blocked by RLS policies

## Incident Response

If a security issue is detected:

1. **Immediate Actions**
   - Revoke compromised credentials
   - Review access logs for unauthorized access
   - Check for data exfiltration

2. **Investigation**
   - Identify the vulnerability
   - Determine scope of potential access
   - Review all affected user accounts

3. **Remediation**
   - Deploy security fixes
   - Update RLS policies if needed
   - Force password resets if credentials compromised

4. **Communication**
   - Notify affected users (if required by GDPR/privacy laws)
   - Document incident and response
   - Update security procedures

## Maintenance

### Regular Security Reviews

Schedule quarterly reviews:
- [ ] Audit RLS policies for gaps
- [ ] Review service role usage patterns
- [ ] Check for exposed secrets in code
- [ ] Update dependencies (Supabase client, etc.)
- [ ] Review storage access patterns

### Policy Updates

When adding new tables:
1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create policies for SELECT, INSERT, UPDATE, DELETE
3. Add service role bypass policy
4. Create necessary indexes
5. Add to test suite
6. Document ownership model

## Signed URL Best Practices

### Current Implementation

```typescript
export async function getSignedUrlForDocument(
  storagePath: string,
  expiresInSeconds = 3600
) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}
```

### Recommendations

1. **Vary expiration by use case:**
   ```typescript
   // Quick preview: 5 minutes
   getSignedUrlForDocument(path, 300);

   // Document viewing: 1 hour (current default)
   getSignedUrlForDocument(path, 3600);

   // Download: 15 minutes
   getSignedUrlForDocument(path, 900);
   ```

2. **Add usage tracking:**
   ```typescript
   // Log signed URL generation
   await prisma.analyticsEvent.create({
     data: {
       userId,
       name: 'signed_url_generated',
       meta: { storagePath, expiresIn: expiresInSeconds }
     }
   });
   ```

3. **Consider one-time URLs for sensitive documents:**
   - Generate URL
   - Track usage
   - Invalidate after first access (requires custom implementation)

## SharePack Security

SharePacks allow passcode-protected public access. Important security notes:

### Passcode Hashing

Ensure passcodes are properly hashed:
```typescript
import argon2 from 'argon2';

const PEPPER = process.env.PASSCODE_PEPPER; // secret pepper value
const passcodeHash = await argon2.hash(PEPPER + passcode);
```

### Passcode Verification

Verify with timing-safe comparison:
```typescript
const isValid = await argon2.verify(sharepack.passcodeHash, PEPPER + providedPasscode);
```

### SharePack Access Logging

Always log access:
```typescript
await prisma.shareEvent.create({
  data: {
    packId: sharepack.id,
    kind: 'view',
    ipHash: hashIp(requestIp)
  }
});
```

### Expiration and Revocation

Check expiration and revocation:
```typescript
if (sharepack.revokedAt || sharepack.expiresAt < new Date()) {
  return res.status(403).json({ error: 'SharePack expired or revoked' });
}
```

## Advanced Topics

### Audit Logging

Consider adding audit logs for sensitive operations:

```sql
CREATE TABLE "AuditLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  action TEXT, -- 'create', 'read', 'update', 'delete'
  "tableName" TEXT,
  "recordId" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

### IP-Based Rate Limiting

Add to Supabase Edge Functions or API routes:
```typescript
// Track requests per IP
const key = `ratelimit:${ipHash}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60); // 1 minute window
if (count > 100) return res.status(429).json({ error: 'Rate limit exceeded' });
```

### Geographic Restrictions

For GDPR/data residency compliance:
```typescript
// In API routes
const clientCountry = req.geo?.country;
if (requiresEuDataResidency && !EU_COUNTRIES.includes(clientCountry)) {
  return res.status(451).json({ error: 'Geographic restriction' });
}
```

## Support and Resources

### Supabase Resources
- RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- Storage Documentation: https://supabase.com/docs/guides/storage
- Security Best Practices: https://supabase.com/docs/guides/auth/security

### Internal Documentation
- Schema: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/schema.prisma`
- RLS Policies: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/supabase_rls_policies.sql`
- Test Suite: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/supabase_rls_tests.sql`

## Conclusion

This RLS implementation provides defense-in-depth security for your multi-tenant medical records application. The key principles are:

1. **Service role for API routes** - Controlled server-side access
2. **RLS policies** - Defense against misconfigured clients
3. **Storage security** - Path-based isolation
4. **Signed URLs** - Temporary, controlled file access
5. **Audit trails** - SharePack access logging

Follow this guide carefully during deployment and maintain security vigilance through regular reviews and monitoring.
