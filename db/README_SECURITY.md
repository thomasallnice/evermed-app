# EverMed Supabase Security Implementation

## Complete RLS and Storage Security for Production Deployment

This directory contains production-ready Row Level Security (RLS) policies and storage security configuration for the EverMed multi-tenant medical records application.

---

## 📋 Quick Navigation

### Start Here
1. **[QUICK_START.md](./QUICK_START.md)** - 5-minute overview and immediate deployment steps
2. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment with verification

### Core Files
3. **[supabase_rls_policies.sql](./supabase_rls_policies.sql)** - Main SQL script (754 lines)
   - Storage bucket configuration
   - 5 storage RLS policies
   - 44 table RLS policies across 10 tables
   - 10 performance indexes
   - Verification queries

4. **[supabase_rls_tests.sql](./supabase_rls_tests.sql)** - Comprehensive test suite (352 lines)
   - Person table isolation tests
   - Document/Observation transitive ownership tests
   - Multi-level transitive tests (DocChunk)
   - SharePack and related table tests
   - Service role bypass tests
   - Edge case tests

### Documentation
5. **[RLS_IMPLEMENTATION_SUMMARY.md](./RLS_IMPLEMENTATION_SUMMARY.md)** - Executive summary
   - Security model overview
   - File descriptions
   - Implementation notes
   - Deployment order
   - Success criteria

6. **[SUPABASE_SECURITY_GUIDE.md](./SUPABASE_SECURITY_GUIDE.md)** - Comprehensive guide (517 lines)
   - Security architecture deep-dive
   - Common pitfalls and how to avoid them
   - Performance considerations
   - Monitoring and incident response
   - SharePack security details
   - Advanced topics

7. **[STORAGE_SECURITY_EXAMPLES.md](./STORAGE_SECURITY_EXAMPLES.md)** - Code examples (718 lines)
   - Enhanced storage helper implementation
   - Secure API route patterns
   - SharePack public access implementation
   - Storage cleanup job
   - Integration tests

---

## 🎯 What This Provides

### Security Features
- ✅ **Multi-tenant data isolation** - Users can ONLY access their own data
- ✅ **Storage path-based security** - Files isolated by personId
- ✅ **Signed URLs with expiration** - Temporary file access (default 1 hour)
- ✅ **Defense-in-depth** - Multiple security layers
- ✅ **Service role bypass** - Controlled server-side access
- ✅ **SharePack passcode protection** - Secure public sharing

### Technical Implementation
- ✅ **44 RLS policies** across 10 tables
- ✅ **5 storage policies** for file operations
- ✅ **10 performance indexes** for policy efficiency
- ✅ **Transitive ownership** support (User → Person → Document → Chunks)
- ✅ **Read-only tables** for TokenUsage and AnalyticsEvent
- ✅ **Comprehensive test suite** with 20+ test scenarios

---

## 🚀 Quick Deploy

### Staging Deployment (Do This First!)

```bash
# 1. Open Supabase Dashboard
# https://app.supabase.com/project/YOUR-STAGING-PROJECT

# 2. Navigate to SQL Editor
# Dashboard → Database → SQL Editor

# 3. Copy and execute main script
# Copy: db/supabase_rls_policies.sql
# Paste into SQL Editor
# Click "Run"

# 4. Verify deployment
# Run verification queries at bottom of script

# 5. Test your application
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed
npm run dev
# Test: Register, create Person, upload document, verify isolation
```

### Production Deployment (After Staging Success!)

**Prerequisites:**
- [ ] Staging deployment successful
- [ ] All tests passed
- [ ] Application verified working
- [ ] Monitored for 24+ hours

**Follow:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

## 📊 Security Model

### Ownership Hierarchy
```
User (auth.uid())
  │
  ├─ Person (ownerId) ──────────────────┐
  │    │                                 │
  │    ├─ Document (personId)            │
  │    │    │                            │
  │    │    ├─ Observation (personId) ◄──┤
  │    │    └─ DocChunk (documentId)     │
  │    │                                 │
  │    └─ SharePack (personId)           │
  │         ├─ SharePackItem (packId) ───┤
  │         └─ ShareEvent (packId)       │
  │                                       │
  ├─ ChatMessage (userId) ────────────────┘
  ├─ TokenUsage (userId)
  └─ AnalyticsEvent (userId)
```

### Access Patterns

| Access Type | Method | RLS |
|------------|--------|-----|
| API Routes | Service Role Key | Bypassed (controlled) |
| Client Queries | Anon Key | Enforced |
| Storage Upload | Client SDK | Enforced |
| Storage Download | Signed URLs | Service Role generates |

---

## 🔒 Key Security Points

### 1. Storage Path Pattern (CRITICAL)
```typescript
// Your current implementation (CORRECT)
const storagePath = `${personId}/${Date.now()}-${fileName}`;
```

**DO NOT CHANGE** this pattern. RLS policies expect `{personId}/{file}`.

### 2. Ownership Verification (CRITICAL)
```typescript
// Your current implementation (CORRECT - KEEP THIS!)
const person = await prisma.person.findUnique({ where: { id: personId } });
if (!person || person.ownerId !== userId) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

This is defense-in-depth. Keep all ownership checks in API routes.

### 3. Service Role Usage (CORRECT)
```typescript
// Your current implementation (CORRECT)
const supabase = createClient(url, SERVICE_ROLE_KEY);
```

API routes SHOULD use service role. RLS provides additional protection.

### 4. Signed URL Expiration
```typescript
// Default: 1 hour (reasonable)
await getSignedUrlForDocument(path, 3600);

// Recommendations:
// - Preview: 300s (5 min)
// - View: 3600s (1 hour)
// - Download: 900s (15 min)
// - SharePack: 86400s (24 hours)
```

---

## 📁 File Sizes and Line Counts

| File | Lines | Size | Purpose |
|------|-------|------|---------|
| supabase_rls_policies.sql | 754 | 24KB | Main deployment script |
| STORAGE_SECURITY_EXAMPLES.md | 718 | 18KB | Code examples |
| SUPABASE_SECURITY_GUIDE.md | 517 | 14KB | Comprehensive docs |
| DEPLOYMENT_CHECKLIST.md | 404 | 10KB | Step-by-step deployment |
| RLS_IMPLEMENTATION_SUMMARY.md | 361 | 9.5KB | Executive summary |
| supabase_rls_tests.sql | 352 | 14KB | Test suite |
| QUICK_START.md | 247 | 7.8KB | Quick start guide |

**Total:** 3,353 lines of SQL, documentation, and examples

---

## ✅ Pre-Deployment Checklist

### Environment Verification
- [ ] Staging and Production are separate Supabase projects
- [ ] Environment variables configured correctly
- [ ] Service role keys are different between environments
- [ ] Service role keys NOT in client-side code

### Database State
- [ ] Prisma migrations all applied
- [ ] Schema matches deployed database
- [ ] No pending schema changes
- [ ] Backup created (production only)

### Code Review
- [ ] Reviewed all SQL in `supabase_rls_policies.sql`
- [ ] Understood security model
- [ ] Verified path patterns match
- [ ] Checked ownership verification exists in API routes

---

## 🧪 Testing

### Automated Tests
```bash
# Run test SQL in Supabase SQL Editor
# File: db/supabase_rls_tests.sql
# Follow instructions to create test users first
```

### Manual Tests
1. **User Registration** - Create new user, verify Person created
2. **Upload Document** - Upload file, verify storage path correct
3. **View Document** - Generate signed URL, verify access works
4. **User Isolation** - Create second user, verify cannot access first user's data
5. **SharePack** - Create SharePack, verify passcode protection works

### Security Tests
1. **Horizontal Privilege Escalation** - Try to access other user's data (should fail)
2. **Ownership Transfer** - Try to change ownerId (should fail)
3. **Path Traversal** - Try `../other-person/file.pdf` (should fail)
4. **Direct DB Access** - Query with anon key (should be filtered by RLS)

---

## 🔍 Verification Queries

After deployment, run these in Supabase SQL Editor:

```sql
-- Check RLS enabled (all should be true)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count policies (should match expected counts)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check storage bucket (should be private, 50MB limit)
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'documents';

-- View all policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 🚨 Rollback Procedure

If critical issues are detected:

### Immediate Rollback
```sql
-- Disable RLS on all tables
ALTER TABLE "Person" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Or use this to disable all at once
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE 'ALTER TABLE "' || r.tablename || '" DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;
```

### Verify Rollback
```sql
-- All should show rowsecurity = false
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

---

## 📈 Monitoring

### First Hour After Deployment
- [ ] Monitor application error logs
- [ ] Watch for 403 Forbidden errors
- [ ] Check Supabase database logs
- [ ] Verify no user-reported issues
- [ ] Monitor API response times

### First 24 Hours
- [ ] Daily log review
- [ ] Check for policy violations
- [ ] Monitor performance metrics
- [ ] Review user feedback
- [ ] Check error tracking service

### First Week
- [ ] Review access patterns
- [ ] Analyze query performance
- [ ] Check for unusual activity
- [ ] Gather user feedback
- [ ] Document any issues

---

## 🆘 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 403 on all requests | Service role key not set | Check `.env.local` |
| Users can't see own data | Policy bug or auth issue | Verify `auth.uid()` returns UUID |
| Storage uploads fail | Path mismatch | Verify path is `{personId}/{file}` |
| Slow queries | Missing index | Run `EXPLAIN ANALYZE` |

### Debug Commands
```sql
-- Check current user
SELECT auth.uid();

-- Test policy as user
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM "Person";
RESET role;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM "Document" WHERE "personId" = 'person-id';
```

---

## 📚 Additional Resources

### Supabase Documentation
- [RLS Overview](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Security](https://supabase.com/docs/guides/storage)
- [Best Practices](https://supabase.com/docs/guides/auth/security)

### PostgreSQL Documentation
- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Policy Creation](https://www.postgresql.org/docs/current/sql-createpolicy.html)

### Internal Documentation
- Schema: [/db/schema.prisma](./schema.prisma)
- Migrations: [/db/migrations/](./migrations/)
- Storage Helper: [/apps/web/src/lib/storage.ts](../apps/web/src/lib/storage.ts)

---

## 👥 Support

### For Deployment Issues
1. Check [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
2. Review [SUPABASE_SECURITY_GUIDE.md](./SUPABASE_SECURITY_GUIDE.md)
3. Run verification queries
4. Check application logs

### For Security Questions
1. Read [SUPABASE_SECURITY_GUIDE.md](./SUPABASE_SECURITY_GUIDE.md)
2. Review [RLS_IMPLEMENTATION_SUMMARY.md](./RLS_IMPLEMENTATION_SUMMARY.md)
3. Check [STORAGE_SECURITY_EXAMPLES.md](./STORAGE_SECURITY_EXAMPLES.md)

### For Code Examples
1. See [STORAGE_SECURITY_EXAMPLES.md](./STORAGE_SECURITY_EXAMPLES.md)
2. Review your current implementation in `/apps/web/src/app/api/`

---

## ✨ Success Criteria

Deployment is successful when:

- ✅ All 10 tables have RLS enabled (`rowsecurity = true`)
- ✅ All 44 table policies created
- ✅ All 5 storage policies created
- ✅ Storage bucket configured (private, 50MB, PDF/images only)
- ✅ All 10 performance indexes created
- ✅ Users can access ONLY their own data
- ✅ Service role can access all data (API routes work)
- ✅ Signed URLs generate correctly
- ✅ Signed URLs expire correctly
- ✅ All test scenarios pass
- ✅ No increase in error rates
- ✅ No performance degradation
- ✅ Monitoring shows normal operation

---

## 🎯 Next Steps

### Immediate (Now)
1. Read [QUICK_START.md](./QUICK_START.md)
2. Review [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. Understand the security model

### Staging Deployment (Today)
4. Deploy to staging environment
5. Run test suite
6. Verify application functionality
7. Test with real user flows

### Monitoring (24-48 hours)
8. Monitor staging for issues
9. Review logs and metrics
10. Gather team feedback

### Production Deployment (After Staging Success)
11. Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
12. Create production backup
13. Deploy during low-traffic window
14. Monitor closely

### Ongoing
15. Regular security reviews
16. Performance monitoring
17. Update documentation as needed
18. Team training on security model

---

## 📝 Version History

- **v1.0** (2025-10-04) - Initial implementation
  - Complete RLS policies for all tables
  - Storage bucket security
  - Comprehensive documentation
  - Test suite and deployment guides

---

## 📄 License & Attribution

Generated by Claude Code (Anthropic) for EverMed medical records application.

**Security Model:** Multi-tenant isolation with transitive ownership
**Database:** PostgreSQL via Supabase
**Schema Management:** Prisma
**Language:** TypeScript/Node.js

---

**Ready to deploy?** Start with [QUICK_START.md](./QUICK_START.md)

**Questions?** Read [SUPABASE_SECURITY_GUIDE.md](./SUPABASE_SECURITY_GUIDE.md)

**Deploying?** Follow [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
