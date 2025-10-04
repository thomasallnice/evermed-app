# Avatar Storage Setup Guide

## Overview

This guide explains how to set up and use the `avatars` storage bucket for profile picture uploads in the EverMed application.

## Security Model

### Bucket Configuration
- **Bucket ID**: `avatars`
- **Access Level**: Public bucket (read-only for everyone, write only for authenticated users)
- **File Size Limit**: 5 MB (enforced at storage level and client-side)
- **Allowed MIME Types**: JPEG, PNG, GIF, WebP

### Path Structure
```
{userId}/avatar.{extension}
```

**Example paths:**
- `550e8400-e29b-41d4-a716-446655440000/avatar.jpg`
- `a1b2c3d4-e5f6-7890-abcd-ef1234567890/avatar.png`

### RLS Policies

#### 1. Upload (INSERT)
- **Who**: Authenticated users only
- **What**: Can upload files to their own folder (`{userId}/avatar.*`)
- **Security**: Users CANNOT upload to other users' folders

#### 2. Update (REPLACE)
- **Who**: Authenticated users only
- **What**: Can replace/update their own avatar
- **Security**: Users can only modify their own avatar

#### 3. Delete
- **Who**: Authenticated users only
- **What**: Can delete their own avatar
- **Security**: Users can only delete their own avatar

#### 4. Read (SELECT)
- **Who**: Public (everyone, including anonymous users)
- **What**: Can view/download all avatars
- **Reason**: Profile pictures need to be displayed across the app

## Deployment

### Step 1: Apply Migration

Run the migration SQL in your Supabase SQL Editor:

```bash
# Option 1: Using Supabase SQL Editor
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy contents of db/migrations/20251004000000_create_avatars_bucket.sql
# 3. Paste and execute

# Option 2: Using psql (if you have direct database access)
psql $DATABASE_URL < db/migrations/20251004000000_create_avatars_bucket.sql
```

### Step 2: Verify Setup

Run these verification queries in the Supabase SQL Editor:

```sql
-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';

-- Expected result:
-- id: 'avatars'
-- name: 'avatars'
-- public: true
-- file_size_limit: 5242880 (5 MB)
-- allowed_mime_types: {image/jpeg, image/jpg, image/png, image/gif, image/webp}

-- Check RLS policies
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- Expected policies:
-- 1. "Users can upload their own avatar" - authenticated - INSERT
-- 2. "Users can update their own avatar" - authenticated - UPDATE
-- 3. "Users can delete their own avatar" - authenticated - DELETE
-- 4. "Anyone can view avatars" - public - SELECT
```

## Client-Side Implementation

### Upload Avatar (Next.js App Router)

```typescript
// apps/web/src/app/api/profile/avatar/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file from form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Extract file extension
    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `${user.id}/avatar.${ext}`;

    // Upload to Supabase Storage (upsert to replace existing)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true // Replace existing avatar
      });

    if (uploadError) {
      console.error('[avatar-upload] Error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      avatarUrl: urlData.publicUrl
    });
  } catch (error: any) {
    console.error('[avatar-upload] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete avatar
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // List all files in user's folder
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(user.id);

    if (files && files.length > 0) {
      // Delete all avatar files (should only be one)
      const filePaths = files.map(f => `${user.id}/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove(filePaths);

      if (deleteError) {
        console.error('[avatar-delete] Error:', deleteError);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[avatar-delete] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Display Avatar in UI

```typescript
// apps/web/src/components/Avatar.tsx
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface AvatarProps {
  userId?: string; // If not provided, uses current user
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ userId, size = 'md' }: AvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadAvatar() {
      try {
        // Get user ID (current user or specified user)
        let targetUserId = userId;
        if (!targetUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          targetUserId = user.id;
        }

        // List files in user's avatar folder
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(targetUserId, { limit: 1 });

        if (files && files.length > 0) {
          // Get public URL for avatar
          const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(`${targetUserId}/${files[0].name}`);

          setAvatarUrl(data.publicUrl);
        }
      } catch (error) {
        console.error('[avatar] Load error:', error);
      }
    }

    loadAvatar();
  }, [userId, supabase]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          {/* Default avatar placeholder */}
          <svg className="w-2/3 h-2/3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
```

### Upload Form Component

```typescript
// apps/web/src/components/AvatarUpload.tsx
'use client';

import { useState } from 'react';

export function AvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Use JPEG, PNG, GIF, or WebP');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      // Success - refresh avatar display
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        Profile Picture
      </label>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleUpload}
        disabled={uploading}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100
          disabled:opacity-50"
      />
      {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      <p className="text-xs text-gray-500 mt-1">
        Max 5MB. JPEG, PNG, GIF, or WebP.
      </p>
    </div>
  );
}
```

## Testing

### Test Scenarios

#### 1. User Isolation Test

```typescript
// Test that users cannot access other users' avatars folders
// This should FAIL with a policy violation

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Login as User A
await supabase.auth.signInWithPassword({
  email: 'usera@example.com',
  password: 'password123'
});

const { data: { user: userA } } = await supabase.auth.getUser();

// Try to upload to User B's folder (should fail)
const file = new File(['fake'], 'hack.jpg', { type: 'image/jpeg' });
const { error } = await supabase.storage
  .from('avatars')
  .upload('other-user-id/avatar.jpg', file);

console.assert(error !== null, 'Should fail due to RLS policy');
```

#### 2. Public Read Test

```typescript
// Test that avatars are publicly readable (no auth required)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// No authentication - public access
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('some-user-id/avatar.jpg');

// Should return a valid public URL
console.log('Public URL:', data.publicUrl);

// Fetch the URL (should work without auth)
const response = await fetch(data.publicUrl);
console.assert(response.ok, 'Avatar should be publicly accessible');
```

#### 3. Replace Avatar Test

```typescript
// Test that users can replace their own avatar (upsert)

const file1 = new File(['first'], 'avatar.jpg', { type: 'image/jpeg' });
await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.jpg`, file1, { upsert: true });

const file2 = new File(['second'], 'avatar.jpg', { type: 'image/jpeg' });
await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.jpg`, file2, { upsert: true });

// Should succeed - avatar is replaced
```

## Troubleshooting

### Issue: Upload fails with "Policy violation"

**Cause**: User is trying to upload to another user's folder or RLS policies not applied.

**Solution**:
1. Verify RLS policies are applied: Check `pg_policies` table
2. Ensure path structure is correct: `{userId}/avatar.{ext}`
3. Check user is authenticated: `await supabase.auth.getUser()`

### Issue: Avatar not displaying

**Cause**: Bucket is not public or wrong URL format.

**Solution**:
1. Verify bucket is public: `SELECT public FROM storage.buckets WHERE id = 'avatars'`
2. Use `getPublicUrl()` not `createSignedUrl()` for public buckets
3. Check browser console for CORS errors

### Issue: File size exceeded

**Cause**: File larger than 5 MB.

**Solution**:
1. Implement client-side validation before upload
2. Compress images on client-side using libraries like `browser-image-compression`
3. Show clear error message to user

## Environment Variables

No additional environment variables are required for avatar storage. The bucket uses the same Supabase credentials as the rest of the application:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Security Considerations

### ✅ Implemented Security

1. **User Isolation**: Users can only modify their own avatars (enforced by RLS)
2. **File Size Limit**: 5 MB maximum (enforced at storage and client level)
3. **MIME Type Restriction**: Only image types allowed
4. **Public Read Only**: Anonymous users can view but not modify

### ⚠️ Additional Recommendations

1. **Image Scanning**: Consider implementing malware scanning for uploaded images
2. **Content Moderation**: Add automated content moderation (e.g., AWS Rekognition, Google Vision API)
3. **Rate Limiting**: Limit upload frequency per user (e.g., max 5 uploads per hour)
4. **Image Processing**: Resize/optimize images on upload to save storage and bandwidth

## Summary

The `avatars` storage bucket is now configured with:

- ✅ Public read access for displaying profile pictures
- ✅ Authenticated write access with user isolation
- ✅ 5 MB file size limit
- ✅ Image-only MIME type restriction
- ✅ RLS policies enforcing security boundaries
- ✅ Simple path structure: `{userId}/avatar.{ext}`

Apply the migration and use the provided code examples to integrate avatar uploads into your application.
