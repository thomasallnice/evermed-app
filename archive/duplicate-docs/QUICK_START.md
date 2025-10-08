# RLS Security Quick Start Guide

## 5-Minute Overview

This directory contains complete Row Level Security (RLS) and storage security configuration for your Supabase deployment.

## What Was Generated

1. **supabase_rls_policies.sql** (24KB) - Main deployment script
2. **supabase_rls_tests.sql** (14KB) - Test suite
3. **SUPABASE_SECURITY_GUIDE.md** (14KB) - Comprehensive documentation
4. **DEPLOYMENT_CHECKLIST.md** (10KB) - Step-by-step deployment guide
5. **STORAGE_SECURITY_EXAMPLES.md** (18KB) - Code examples
6. **RLS_IMPLEMENTATION_SUMMARY.md** (9.5KB) - Executive summary

## Quick Deploy (Staging)

### Step 1: Open Supabase Dashboard
```
https://app.supabase.com/project/YOUR-PROJECT-ID
```

### Step 2: Go to SQL Editor
Navigate: Database → SQL Editor

### Step 3: Execute Main Script
1. Open `db/supabase_rls_policies.sql` in your editor
2. Copy entire contents (Cmd+A, Cmd+C)
3. Paste into Supabase SQL Editor
4. Click "Run" or press Cmd+Enter

### Step 4: Verify Deployment
Copy and run this in SQL Editor:
```sql
-- Should show all tables with rowsecurity = true
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Step 5: Test Your Application
```bash
cd /Users/Tom/Arbeiten/Arbeiten/2025_EverMed
npm run dev
```

Test these user flows:
- [ ] Register new user
- [ ] Create a Person
- [ ] Upload a document
- [ ] View the document (signed URL works)
- [ ] Verify you cannot see other users' data

## What This Does

### Database Security
- ✅ Enables RLS on all 10 tables
- ✅ Creates 44 security policies
- ✅ Adds 10 performance indexes
- ✅ Isolates users from each other's data

### Storage Security
- ✅ Configures `documents` bucket (private, 50MB limit)
- ✅ Restricts uploads to PDF and images only
- ✅ Enforces path-based isolation (`{personId}/{file}`)
- ✅ Allows server-side signed URL generation

### Access Control
- ✅ Users can ONLY access their own data
- ✅ Service role (API routes) can access all data
- ✅ Signed URLs expire after 1 hour (configurable)
- ✅ SharePacks allow passcode-protected public access

## Security Model at a Glance

```
Your Application Architecture:

┌─────────────────────────────────────┐
│         User (auth.uid)             │
└────────────┬────────────────────────┘
             │ ownerId
             ▼
┌─────────────────────────────────────┐
│            Person                    │
└────────────┬────────────────────────┘
             │ personId
             ├─────────────┬──────────┐
             ▼             ▼          ▼
        ┌─────────┐  ┌──────────┐  ┌─────────┐
        │Document │  │SharePack │  │Observ...│
        └────┬────┘  └──────────┘  └─────────┘
             │
             ▼
        ┌─────────┐
        │DocChunk │
        └─────────┘

RLS Policy Enforcement:
• Direct ownership: Person, ChatMessage
• 1-level transitive: Document, Observation, SharePack
• 2-level transitive: DocChunk, SharePackItem
• Service role: Bypasses all policies
```

## Important Security Notes

### ✅ Your Current Implementation is Secure

Your upload route ALREADY verifies ownership:
```typescript
const person = await prisma.person.findUnique({ where: { id: personId } });
if (!person || person.ownerId !== userId) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

**Keep this pattern!** This is critical defense-in-depth.

### ✅ Storage Path Pattern is Correct

Your path: `{personId}/{timestamp}_{filename}`

The RLS policies expect this exact pattern. DO NOT CHANGE without updating policies.

### ✅ Service Role Usage is Correct

Your API routes use service role key - this is the RIGHT approach:
```typescript
const supabase = createClient(url, SERVICE_ROLE_KEY);
```

RLS policies provide defense-in-depth protection.

## What You DON'T Need to Change

### Application Code
Your current implementation is secure. The RLS policies ADD protection, they don't REPLACE your existing security.

### Environment Variables
Keep your current `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### API Routes
Your API routes are already using service role correctly. No changes needed.

### Upload Logic
Your upload path pattern is correct. No changes needed.

## Testing the Security

### Test 1: User Isolation
```typescript
// In browser console (logged in as User A)
const { data } = await supabase
  .from('Person')
  .select('*');

console.log(data); // Should only show User A's persons
```

### Test 2: Storage Isolation
Try to access another user's file directly - should fail.

### Test 3: Signed URLs
```typescript
// API route generates signed URL
const url = await getSignedUrlForDocument(storagePath, 3600);
// URL works for 1 hour, then expires
```

## Troubleshooting

### Problem: 403 Errors everywhere
**Cause:** Service role key not set
**Fix:** Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`

### Problem: Users can't see their own data
**Cause:** RLS policy bug or auth issue
**Fix:** Check user is authenticated (`auth.uid()` returns UUID)

### Problem: Storage uploads fail
**Cause:** Path mismatch or policy error
**Fix:** Verify path is `{personId}/{timestamp}_{file}`

### Problem: Slow queries
**Cause:** Missing index (unlikely, indexes are in script)
**Fix:** Run `EXPLAIN ANALYZE` on slow query

## Production Deployment

**DO NOT deploy to production until:**
1. ✅ Staging deployment successful
2. ✅ All tests pass
3. ✅ Application works correctly
4. ✅ Tested with real user flows
5. ✅ Monitored for 24+ hours

**Then follow:** `DEPLOYMENT_CHECKLIST.md`

## Files Overview

### For Immediate Use
- **supabase_rls_policies.sql** - Run this in Supabase SQL Editor
- **DEPLOYMENT_CHECKLIST.md** - Follow this step-by-step

### For Reference
- **SUPABASE_SECURITY_GUIDE.md** - Deep dive into security model
- **RLS_IMPLEMENTATION_SUMMARY.md** - Executive summary
- **supabase_rls_tests.sql** - Detailed test scenarios
- **STORAGE_SECURITY_EXAMPLES.md** - Code examples for enhancements

## Support

1. Read `RLS_IMPLEMENTATION_SUMMARY.md` for overview
2. Check `SUPABASE_SECURITY_GUIDE.md` for details
3. Use `DEPLOYMENT_CHECKLIST.md` for step-by-step guidance
4. Review `STORAGE_SECURITY_EXAMPLES.md` for code patterns

## Key Takeaways

1. **Your current code is secure** - RLS adds defense-in-depth
2. **Service role is correct** - API routes should use service role
3. **Path pattern is correct** - Don't change `{personId}/{file}`
4. **Test thoroughly** - Verify user isolation works
5. **Deploy to staging first** - Test before production

## Next Steps

1. **Now:** Deploy to staging
2. **Test:** Verify isolation and functionality
3. **Monitor:** Watch for 24-48 hours
4. **Then:** Deploy to production with checklist
5. **Maintain:** Regular security reviews

---

**Start Here:** Open `DEPLOYMENT_CHECKLIST.md` and follow the steps.

**Questions?** Read `SUPABASE_SECURITY_GUIDE.md` for comprehensive documentation.

**Ready to deploy?** Copy `supabase_rls_policies.sql` into Supabase SQL Editor.
