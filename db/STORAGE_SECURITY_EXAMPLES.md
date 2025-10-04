# Storage Security Implementation Examples

## Current Implementation Review

Your current storage helper at `/apps/web/src/lib/storage.ts` is secure but minimal. Here are enhancements to consider.

## Enhanced Storage Helper

```typescript
// apps/web/src/lib/storage.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

function getServiceClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('Supabase env missing for server-side storage operations');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false }
  });
}

/**
 * Security levels for signed URLs
 */
export enum SignedUrlExpiryTime {
  PREVIEW = 300,      // 5 minutes - Quick previews
  VIEW = 3600,        // 1 hour - Normal viewing
  DOWNLOAD = 900,     // 15 minutes - Downloads
  SHARE = 86400,      // 24 hours - SharePack access (special case)
}

/**
 * Generate a signed URL for document access
 * Uses service role to bypass RLS (authorized server-side operation)
 *
 * @param storagePath - Path in storage bucket (e.g., "{personId}/file.pdf")
 * @param expiresInSeconds - URL expiration time
 * @returns Signed URL string
 */
export async function getSignedUrlForDocument(
  storagePath: string,
  expiresInSeconds: number = SignedUrlExpiryTime.VIEW
) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error('[storage] Failed to generate signed URL', {
      path: storagePath,
      error: error.message
    });
    throw error;
  }

  return data.signedUrl;
}

/**
 * Validate storage path matches expected pattern
 * Pattern: {personId}/{timestamp}_{filename}
 *
 * @param storagePath - Path to validate
 * @returns True if valid, false otherwise
 */
export function isValidStoragePath(storagePath: string): boolean {
  // Pattern: UUID / timestamp-filename
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d+-[\w\s.-]+$/i;
  return pattern.test(storagePath);
}

/**
 * Extract personId from storage path
 *
 * @param storagePath - Full storage path
 * @returns Person ID or null if invalid
 */
export function extractPersonIdFromPath(storagePath: string): string | null {
  const match = storagePath.match(/^([0-9a-f-]+)\//i);
  return match ? match[1] : null;
}

/**
 * Delete a file from storage
 * Should only be called after verifying ownership via database query
 *
 * @param storagePath - Path to file in storage
 */
export async function deleteStorageFile(storagePath: string) {
  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from('documents')
    .remove([storagePath]);

  if (error) {
    console.error('[storage] Failed to delete file', {
      path: storagePath,
      error: error.message
    });
    throw error;
  }
}

/**
 * Check if a file exists in storage
 *
 * @param storagePath - Path to check
 * @returns True if exists, false otherwise
 */
export async function storageFileExists(storagePath: string): boolean {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .list(storagePath.split('/')[0], {
      search: storagePath.split('/')[1]
    });

  if (error) return false;
  return data && data.length > 0;
}

/**
 * Get file metadata without downloading
 *
 * @param storagePath - Path to file
 * @returns File metadata
 */
export async function getStorageFileMetadata(storagePath: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .list(storagePath.split('/')[0], {
      search: storagePath.split('/')[1]
    });

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('File not found');
  }

  return data[0];
}
```

## API Route Security Patterns

### Pattern 1: Upload with Ownership Verification

```typescript
// apps/web/src/app/api/uploads/route.ts
import { requireUserId } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate user
    const userId = await requireUserId(req);

    // Step 2: Get and validate input
    const form = await req.formData();
    const file = form.get('file') as File;
    const personId = String(form.get('personId') || '');

    if (!file || !personId) {
      return NextResponse.json(
        { error: 'file and personId required' },
        { status: 400 }
      );
    }

    // Step 3: CRITICAL - Verify ownership
    const person = await prisma.person.findUnique({
      where: { id: personId }
    });

    if (!person || person.ownerId !== userId) {
      // Log potential security violation
      console.warn('[upload] Ownership violation attempt', {
        userId,
        personId,
        actualOwner: person?.ownerId
      });
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403 }
      );
    }

    // Step 4: Validate file
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 50MB)' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Step 5: Generate secure path
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${personId}/${timestamp}-${sanitizedFilename}`;

    // Step 6: Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getServiceClient();

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false // Prevent overwriting
      });

    if (uploadError) {
      console.error('[upload] Storage upload failed', {
        error: uploadError.message,
        path: storagePath
      });
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      );
    }

    // Step 7: Save metadata to database
    // ... (existing code)

    return NextResponse.json({ documentId: doc.id });
  } catch (e: any) {
    console.error('[upload] Unexpected error', e);
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
```

### Pattern 2: Document Access with Signed URLs

```typescript
// apps/web/src/app/api/documents/[id]/download/route.ts
import { requireUserId } from '@/lib/auth';
import { getSignedUrlForDocument, SignedUrlExpiryTime } from '@/lib/storage';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authenticate
    const userId = await requireUserId(req);
    const documentId = params.id;

    // Step 2: Fetch document with ownership check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        person: {
          select: { ownerId: true }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Step 3: CRITICAL - Verify ownership
    if (document.person.ownerId !== userId) {
      console.warn('[download] Ownership violation attempt', {
        userId,
        documentId,
        actualOwner: document.person.ownerId
      });
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403 }
      );
    }

    // Step 4: Generate signed URL
    const signedUrl = await getSignedUrlForDocument(
      document.storagePath,
      SignedUrlExpiryTime.DOWNLOAD
    );

    // Step 5: (Optional) Log access
    await prisma.analyticsEvent.create({
      data: {
        userId,
        name: 'document_download',
        meta: { documentId }
      }
    });

    return NextResponse.json({ url: signedUrl });
  } catch (e: any) {
    console.error('[download] Error', e);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Document Deletion with Cleanup

```typescript
// apps/web/src/app/api/documents/[id]/route.ts
import { requireUserId } from '@/lib/auth';
import { deleteStorageFile } from '@/lib/storage';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Step 1: Authenticate
    const userId = await requireUserId(req);
    const documentId = params.id;

    // Step 2: Fetch document with ownership check
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        person: {
          select: { ownerId: true }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Step 3: CRITICAL - Verify ownership
    if (document.person.ownerId !== userId) {
      console.warn('[delete] Ownership violation attempt', {
        userId,
        documentId,
        actualOwner: document.person.ownerId
      });
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403 }
      );
    }

    // Step 4: Delete from storage first
    try {
      await deleteStorageFile(document.storagePath);
    } catch (storageError) {
      console.error('[delete] Storage deletion failed', {
        documentId,
        path: document.storagePath,
        error: storageError
      });
      // Continue with DB deletion even if storage fails
      // (storage might already be deleted)
    }

    // Step 5: Delete from database (cascades to related records)
    await prisma.document.delete({
      where: { id: documentId }
    });

    // Step 6: Log deletion
    await prisma.analyticsEvent.create({
      data: {
        userId,
        name: 'document_deleted',
        meta: { documentId }
      }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[delete] Error', e);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
```

## SharePack Public Access Pattern

```typescript
// apps/web/src/app/api/share-packs/[id]/access/route.ts
import { getSignedUrlForDocument, SignedUrlExpiryTime } from '@/lib/storage';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();
const PEPPER = process.env.PASSCODE_PEPPER || '';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { passcode } = await req.json();
    const packId = params.id;

    // Step 1: Fetch SharePack with items
    const pack = await prisma.sharePack.findUnique({
      where: { id: packId },
      include: {
        items: {
          include: {
            document: true,
            observation: true
          }
        }
      }
    });

    if (!pack) {
      return NextResponse.json(
        { error: 'SharePack not found' },
        { status: 404 }
      );
    }

    // Step 2: Check expiration and revocation
    if (pack.revokedAt) {
      return NextResponse.json(
        { error: 'SharePack has been revoked' },
        { status: 403 }
      );
    }

    if (pack.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'SharePack has expired' },
        { status: 403 }
      );
    }

    // Step 3: Verify passcode
    const isValidPasscode = await argon2.verify(
      pack.passcodeHash,
      PEPPER + passcode
    );

    if (!isValidPasscode) {
      // Log failed attempt
      const ipHash = hashIp(req.headers.get('x-forwarded-for') || 'unknown');
      await prisma.shareEvent.create({
        data: {
          packId,
          kind: 'failed_auth',
          ipHash
        }
      });

      return NextResponse.json(
        { error: 'Invalid passcode' },
        { status: 401 }
      );
    }

    // Step 4: Generate signed URLs for documents
    const documentsWithUrls = await Promise.all(
      pack.items
        .filter(item => item.document)
        .map(async item => {
          const signedUrl = await getSignedUrlForDocument(
            item.document!.storagePath,
            SignedUrlExpiryTime.SHARE // 24 hours for SharePacks
          );

          return {
            id: item.document!.id,
            filename: item.document!.filename,
            kind: item.document!.kind,
            url: signedUrl
          };
        })
    );

    // Step 5: Log successful access
    const ipHash = hashIp(req.headers.get('x-forwarded-for') || 'unknown');
    await prisma.shareEvent.create({
      data: {
        packId,
        kind: 'view',
        ipHash
      }
    });

    // Step 6: Increment views counter
    await prisma.sharePack.update({
      where: { id: packId },
      data: { viewsCount: { increment: 1 } }
    });

    return NextResponse.json({
      title: pack.title,
      audience: pack.audience,
      expiresAt: pack.expiresAt,
      documents: documentsWithUrls,
      observations: pack.items
        .filter(item => item.observation)
        .map(item => item.observation)
    });
  } catch (e: any) {
    console.error('[sharepack-access] Error', e);
    return NextResponse.json(
      { error: 'Failed to access SharePack' },
      { status: 500 }
    );
  }
}

// Helper: Hash IP address for privacy
function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT || ''))
    .digest('hex')
    .slice(0, 16);
}
```

## Storage Cleanup Job

```typescript
// apps/web/src/lib/storage-cleanup.ts
/**
 * Background job to clean up orphaned storage files
 * Run periodically (e.g., daily via cron)
 */
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupOrphanedFiles() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('[cleanup] Starting storage cleanup...');

  // Get all persons to check their folders
  const persons = await prisma.person.findMany({
    select: { id: true }
  });

  let deletedCount = 0;

  for (const person of persons) {
    // List all files in this person's folder
    const { data: files, error } = await supabase.storage
      .from('documents')
      .list(person.id);

    if (error || !files) continue;

    for (const file of files) {
      const storagePath = `${person.id}/${file.name}`;

      // Check if this file has a corresponding Document record
      const documentExists = await prisma.document.findFirst({
        where: { storagePath }
      });

      if (!documentExists) {
        // Orphaned file - delete it
        console.log('[cleanup] Deleting orphaned file:', storagePath);

        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove([storagePath]);

        if (!deleteError) {
          deletedCount++;
        }
      }
    }
  }

  console.log(`[cleanup] Cleanup complete. Deleted ${deletedCount} orphaned files.`);
  return deletedCount;
}

// Run as cron job
if (require.main === module) {
  cleanupOrphanedFiles()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[cleanup] Fatal error:', err);
      process.exit(1);
    });
}
```

## Testing Storage Security

```typescript
// tests/integration/storage-security.spec.ts
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

test.describe('Storage Security', () => {
  test('User cannot upload to another users folder', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Login as user 1
    await supabase.auth.signInWithPassword({
      email: 'user1@test.com',
      password: 'test123'
    });

    // Try to upload to user 2's person folder
    const file = new File(['test'], 'hack.pdf', { type: 'application/pdf' });
    const { data, error } = await supabase.storage
      .from('documents')
      .upload('other-person-id/hack.pdf', file);

    // Should fail with policy violation
    expect(error).toBeTruthy();
    expect(error?.message).toContain('policy');
  });

  test('User cannot download another users file', async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Login as user 1
    await supabase.auth.signInWithPassword({
      email: 'user1@test.com',
      password: 'test123'
    });

    // Try to download user 2's file
    const { data, error } = await supabase.storage
      .from('documents')
      .download('other-person-id/their-file.pdf');

    // Should fail with policy violation
    expect(error).toBeTruthy();
  });

  test('Signed URL expires correctly', async ({ page }) => {
    // Generate signed URL with 5 second expiry
    const signedUrl = await getSignedUrlForDocument(
      'test-person/test-file.pdf',
      5
    );

    // Should work immediately
    const response1 = await fetch(signedUrl);
    expect(response1.ok).toBe(true);

    // Wait 10 seconds
    await page.waitForTimeout(10000);

    // Should fail after expiry
    const response2 = await fetch(signedUrl);
    expect(response2.ok).toBe(false);
  });
});
```

## Summary

These patterns provide:

1. **Defense-in-Depth**: Multiple layers of security checks
2. **Ownership Verification**: Always verify before granting access
3. **Audit Logging**: Track security-relevant events
4. **Input Validation**: Check file sizes, types, paths
5. **Secure Cleanup**: Remove orphaned files
6. **Testing**: Verify security policies work correctly

Implement these patterns in your API routes for production-grade security.
