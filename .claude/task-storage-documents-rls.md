# Task: Storage RLS Policies for `documents` Bucket

## Context

The `documents` storage bucket exists but has **NO RLS policies**, causing 400 errors when trying to access uploaded files via signed URLs.

## Current Situation

- **Bucket**: `documents` (private bucket)
- **Path structure**: `{personId}/{timestamp}-{filename}`
  - Example: `"550e8400-e29b-41d4-a716-446655440000/1234567890-test.pdf"`
- **Upload works**: Uses service role in `/api/uploads` route
- **File access fails**: No RLS policies for SELECT operations

## Ownership Chain (CRITICAL)

This is a **TRANSITIVE OWNERSHIP** pattern:

```
Storage path → personId → Person.ownerId → auth.uid()
```

**The storage path uses `personId`, NOT `auth.uid()`!**

From `/apps/web/src/app/api/uploads/route.ts`:
```typescript
const storagePath = `${personId}/${Date.now()}-${fileName}`;
```

Authorization check in upload route:
```typescript
const person = await prisma.person.findUnique({ where: { id: personId } });
if (!person || person.ownerId !== userId) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
```

## Database Schema (db/schema.prisma)

```prisma
model Person {
  id         String   @id @default(uuid())
  ownerId    String // supabase auth.uid()
  // ... other fields
  documents  Document[]
}

model Document {
  id          String   @id @default(uuid())
  personId    String
  storagePath String
  // ... other fields
  person      Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
}
```

## Required RLS Policies

Create policies for `storage.objects` table for bucket `documents`:

### 1. INSERT Policy
**Goal**: Users can upload files to their own Person folder

**Logic**:
- Bucket must be `documents`
- User must be authenticated (`auth.uid() IS NOT NULL`)
- First folder in path must be a `personId` where `Person.ownerId = auth.uid()`
- **Cannot use direct comparison** like `(storage.foldername(name))[1] = auth.uid()::text`
- **Must use EXISTS subquery** to check Person table

### 2. SELECT Policy
**Goal**: Users can view files in their own Person folder

**Logic**: Same transitive ownership check as INSERT

### 3. UPDATE Policy
**Goal**: Users can update metadata of their own files

**Logic**: Same transitive ownership check

### 4. DELETE Policy
**Goal**: Users can delete their own files

**Logic**: Same transitive ownership check

## Technical Requirements

1. **Performance**:
   - Add indexes to support policy queries
   - Consider using `Person(id, ownerId)` index
   - Storage queries should use indexed columns

2. **Security**:
   - Fail secure (deny by default)
   - No way to bypass ownership checks
   - Service role should bypass (for system operations)

3. **Edge Cases**:
   - Orphaned files (personId doesn't exist in Person table) → DENY
   - NULL auth.uid() → DENY
   - Invalid path format → DENY
   - Deleted Person record → File access denied automatically

4. **Bucket Configuration**:
   - File size limit: 10MB (PDFs + images)
   - Allowed MIME types: `['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']`
   - Private bucket (public = false)

## Expected Output

1. **SQL file**: `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/storage-documents.sql`
   - Bucket creation/update (with ON CONFLICT handling)
   - RLS enable on storage.objects
   - All 4 policies (INSERT, SELECT, UPDATE, DELETE)
   - Verification queries
   - Comprehensive comments explaining transitive ownership

2. **Apply policies to database**:
   - Execute SQL against SUPABASE_DB_URL
   - Verify with `SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%documents%'`

3. **Index recommendations**:
   - Suggest indexes to support policy performance
   - Document in SQL comments

4. **Test scenarios**:
   - Provide test queries to validate policies work correctly
   - Cover both positive (authorized) and negative (unauthorized) cases

## References

**Existing storage policies for comparison**:
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/storage-food-photos.sql` (direct ownership: `{userId}/*`)
- `/Users/Tom/Arbeiten/Arbeiten/2025_EverMed/db/storage-ml-models.sql` (direct ownership: `{userId}/*`)

**Key difference**: Those buckets use `auth.uid()` directly in path. This bucket uses `personId`, requiring transitive ownership check.

## Success Criteria

- [ ] SQL file created with all 4 policies
- [ ] Policies applied to database
- [ ] Verification queries show policies exist
- [ ] Test scenarios validate authorization works correctly
- [ ] File access via signed URLs works (no more 400 errors)
- [ ] Performance indexes recommended
- [ ] Security model documented in SQL comments
