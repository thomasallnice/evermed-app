# Supabase Security Deployment Checklist

## Pre-Deployment Verification

### Environment Setup
- [ ] Staging environment has separate Supabase project from production
- [ ] Environment variables configured correctly in both environments
- [ ] Service role keys are different between staging and production
- [ ] Service role keys are NOT exposed in client-side code

### Database State
- [ ] Prisma schema matches deployed database schema
- [ ] All migrations have been run
- [ ] No pending schema changes
- [ ] Database backup created (production only)

## Staging Deployment

### 1. Deploy RLS Policies
```bash
# Navigate to Supabase Dashboard → SQL Editor
# Copy contents of db/supabase_rls_policies.sql
# Execute entire script
```

- [ ] Script executed without errors
- [ ] All policies created successfully
- [ ] Storage bucket configured
- [ ] Indexes created

### 2. Verify RLS Configuration

Run these verification queries in SQL Editor:

```sql
-- Check RLS enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'Person', 'Document', 'Observation', 'SharePack',
  'SharePackItem', 'ShareEvent', 'DocChunk',
  'ChatMessage', 'TokenUsage', 'AnalyticsEvent'
)
ORDER BY tablename;
```

**Expected:** All tables show `rowsecurity = true`

- [ ] All tables have RLS enabled
- [ ] No missing tables in results

```sql
-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected counts:**
- Person: 5 policies (4 user + 1 service)
- Document: 5 policies
- Observation: 5 policies
- SharePack: 5 policies
- SharePackItem: 5 policies
- ShareEvent: 2 policies (read-only for users)
- DocChunk: 5 policies
- ChatMessage: 5 policies
- TokenUsage: 2 policies (read-only for users)
- AnalyticsEvent: 2 policies (read-only for users)

- [ ] Policy counts match expected values
- [ ] All tables have policies

```sql
-- Check storage bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';
```

**Expected:**
- public: false
- file_size_limit: 52428800 (50 MB)
- allowed_mime_types: Array with PDF and image types

- [ ] Bucket exists and is private
- [ ] File size limit set to 50 MB
- [ ] MIME types restricted

### 3. Run Test Suite

```bash
# Edit db/supabase_rls_tests.sql
# Replace test user UUIDs with real test users
# Execute in SQL Editor section by section
```

Critical tests to verify:
- [ ] User can view their own Person
- [ ] User CANNOT view another user's Person
- [ ] User can view Documents of their Person
- [ ] User CANNOT view Documents of another Person
- [ ] User can view Observations of their Person
- [ ] User CANNOT view Observations of another Person
- [ ] Service role can access all data

### 4. Application Testing

Test with real application:

```bash
# In staging environment
npm run dev
```

**User Registration & Login:**
- [ ] New user can register
- [ ] User can log in
- [ ] User session persists correctly

**Person Management:**
- [ ] User can create a Person
- [ ] User can view their Persons
- [ ] User CANNOT see other users' Persons (verify in DB directly)

**Document Upload:**
- [ ] User can upload document to their Person
- [ ] File appears in storage bucket under correct path
- [ ] Document metadata saved to database
- [ ] User can view/download their document
- [ ] Signed URL generated correctly
- [ ] Signed URL expires after timeout

**Observations:**
- [ ] Observations extracted from documents
- [ ] User can view their observations
- [ ] Observations linked to correct Person

**SharePacks:**
- [ ] User can create SharePack
- [ ] Passcode protection works
- [ ] SharePack expiration works
- [ ] Access logged in ShareEvents

### 5. Storage Security Testing

Use Supabase JavaScript client with anon key (not service role):

```typescript
// Test direct client access (should fail with proper RLS)
const { data, error } = await supabase
  .from('Person')
  .select('*')
  .neq('ownerId', userId);

console.log('Should be empty:', data);
console.log('Length:', data?.length); // Should be 0
```

- [ ] Client cannot query other users' data
- [ ] Storage policies prevent cross-user access
- [ ] Signed URLs work correctly

### 6. Performance Testing

Monitor query performance:

```sql
-- Check slow queries
EXPLAIN ANALYZE
SELECT * FROM "Document" d
WHERE EXISTS (
  SELECT 1 FROM "Person" p
  WHERE p.id = d."personId"
  AND p."ownerId" = 'test-user-id'
);
```

- [ ] Queries use indexes (not sequential scans)
- [ ] Response times acceptable (<100ms for simple queries)
- [ ] No performance degradation compared to pre-RLS

## Production Deployment

### Pre-Production Checklist

- [ ] All staging tests passed
- [ ] Application tested thoroughly in staging
- [ ] Security verification complete
- [ ] Performance acceptable
- [ ] Team reviewed deployment plan
- [ ] Rollback plan prepared
- [ ] Maintenance window scheduled (low traffic time)

### Production Deployment Steps

1. **Create Database Backup**
   - [ ] Backup created via Supabase Dashboard
   - [ ] Backup verified and downloadable
   - [ ] Backup timestamp recorded

2. **Deploy RLS Policies**
   ```bash
   # In Production Supabase → SQL Editor
   # Execute db/supabase_rls_policies.sql
   ```
   - [ ] Script executed successfully
   - [ ] No errors in execution log
   - [ ] All policies created

3. **Immediate Verification**
   ```sql
   -- Run verification queries (from staging section)
   -- Verify all tables have RLS enabled
   -- Verify policy counts match expected
   -- Verify storage bucket configuration
   ```
   - [ ] RLS enabled on all tables
   - [ ] Policy counts correct
   - [ ] Storage configured correctly

4. **Application Verification**
   - [ ] Login works for existing users
   - [ ] Data loads correctly for users
   - [ ] Upload functionality works
   - [ ] No 403/500 errors in logs
   - [ ] Monitor for 5-10 minutes

5. **User Testing**
   - [ ] Test with real user account
   - [ ] Verify all core features work
   - [ ] Check API logs for errors
   - [ ] Monitor Supabase dashboard

### Post-Deployment Monitoring

**First Hour:**
- [ ] Monitor error rates in application logs
- [ ] Watch for 403 Forbidden errors
- [ ] Check Supabase database logs
- [ ] Verify no user reports issues
- [ ] Monitor API response times

**First 24 Hours:**
- [ ] Daily log review
- [ ] Check for policy violations
- [ ] Monitor performance metrics
- [ ] Review user feedback
- [ ] Check error tracking (Sentry, etc.)

**First Week:**
- [ ] Review access patterns
- [ ] Analyze query performance
- [ ] Check for unusual activity
- [ ] Gather user feedback
- [ ] Document any issues

## Rollback Procedure

If issues are detected:

### Immediate Rollback (Critical Issues)

1. **Disable RLS on affected tables:**
   ```sql
   ALTER TABLE "Person" DISABLE ROW LEVEL SECURITY;
   -- Repeat for all tables
   ```

2. **Remove storage policies:**
   ```sql
   DROP POLICY IF EXISTS "Users can upload to their person folders" ON storage.objects;
   -- Repeat for all storage policies
   ```

3. **Verify application works:**
   - [ ] Check application functionality
   - [ ] Monitor for errors

### Partial Rollback (Non-Critical Issues)

1. **Disable RLS on specific table:**
   ```sql
   ALTER TABLE "problematic_table" DISABLE ROW LEVEL SECURITY;
   ```

2. **Debug the issue:**
   - Review policy logic
   - Check for missing indexes
   - Verify schema matches policies

3. **Fix and re-enable:**
   ```sql
   -- Fix policy
   DROP POLICY "old_policy" ON "problematic_table";
   CREATE POLICY "fixed_policy" ON "problematic_table" ...;

   -- Re-enable RLS
   ALTER TABLE "problematic_table" ENABLE ROW LEVEL SECURITY;
   ```

## Common Issues and Solutions

### Issue: 403 Forbidden on all requests

**Cause:** Service role key not configured correctly

**Solution:**
```bash
# Verify environment variable
echo $SUPABASE_SERVICE_ROLE_KEY

# Restart application with correct key
```

### Issue: Users can't access their own data

**Cause:** Policy logic error or missing index

**Solution:**
```sql
-- Check if user is authenticated
SELECT auth.uid();

-- Test policy manually
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid';
SELECT * FROM "Person";
RESET role;
```

### Issue: Storage uploads fail

**Cause:** Path doesn't match policy expectations

**Solution:**
```typescript
// Verify path pattern matches policy
// Expected: {personId}/{timestamp}_{filename}
const storagePath = `${personId}/${Date.now()}-${fileName}`;
```

### Issue: Slow queries after RLS

**Cause:** Missing indexes on policy-filtered columns

**Solution:**
```sql
-- Add missing index
CREATE INDEX idx_table_column ON "Table"("column");

-- Verify index usage
EXPLAIN ANALYZE SELECT * FROM "Table" WHERE "column" = 'value';
```

## Success Criteria

Deployment is successful when:

- [ ] All RLS policies active on all tables
- [ ] Storage bucket security configured
- [ ] Users can access ONLY their own data
- [ ] Service role can access all data (API routes)
- [ ] No increase in error rates
- [ ] No performance degradation
- [ ] All test scenarios pass
- [ ] No user-reported issues
- [ ] Monitoring shows normal operation

## Documentation Updates

After successful deployment:

- [ ] Update internal docs with deployment date
- [ ] Document any issues encountered
- [ ] Update runbooks with lessons learned
- [ ] Share knowledge with team
- [ ] Schedule security review in 3 months

## Contacts

**In case of issues:**
- Database Team: [contact info]
- Security Team: [contact info]
- On-Call Engineer: [contact info]
- Supabase Support: https://supabase.com/dashboard/support

## Sign-Off

**Staging Deployment:**
- Deployed by: ________________
- Date: ________________
- Verified by: ________________
- Issues: ________________

**Production Deployment:**
- Deployed by: ________________
- Date: ________________
- Verified by: ________________
- Issues: ________________
- Rollback plan confirmed: ☐
