/**
 * Food Photos Storage Module
 * Purpose: Handle secure upload, retrieval, and deletion of food photos
 * Bucket: food-photos (private with RLS)
 * Path Structure: {userId}/{photoId}.jpg
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// ============================================================================
// Constants
// ============================================================================
const BUCKET_NAME = 'food-photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

// ============================================================================
// Types
// ============================================================================
export interface UploadFoodPhotoParams {
  file: File | Buffer;
  userId: string;
  photoId?: string; // Optional, will generate if not provided
  contentType?: string;
}

export interface UploadFoodPhotoResult {
  success: boolean;
  photoId?: string;
  path?: string;
  url?: string;
  error?: string;
}

export interface FoodPhotoMetadata {
  photoId: string;
  path: string;
  size: number;
  contentType: string;
  createdAt: Date;
  url: string; // Signed URL
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate file before upload
 * Returns error message if invalid, null if valid
 */
export function validateFoodPhoto(file: File | Buffer): string | null {
  // Check file size
  const size = file instanceof File ? file.size : file.length;
  if (size > MAX_FILE_SIZE) {
    return `File size exceeds 5MB limit (got ${(size / 1024 / 1024).toFixed(2)}MB)`;
  }

  // Check MIME type (only for File objects)
  if (file instanceof File) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Invalid file type. Only JPEG and PNG images are allowed (got ${file.type})`;
    }
  }

  return null; // Valid
}

// ============================================================================
// Upload Operations
// ============================================================================

/**
 * Upload food photo to user's folder
 * Enforces path isolation: {userId}/{photoId}.jpg
 */
export async function uploadFoodPhoto(
  supabase: SupabaseClient,
  params: UploadFoodPhotoParams
): Promise<UploadFoodPhotoResult> {
  const { file, userId, photoId = nanoid(), contentType } = params;

  // Validate file
  const validationError = validateFoodPhoto(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Determine content type
  const mimeType =
    contentType || (file instanceof File ? file.type : 'image/jpeg');

  // Ensure file extension matches content type
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${photoId}.${extension}`;

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        contentType: mimeType,
        upsert: false, // Prevent overwriting existing files
      });

    if (error) {
      console.error('[uploadFoodPhoto] Upload failed:', error);
      return { success: false, error: error.message };
    }

    // Generate signed URL for immediate access
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (urlError) {
      console.warn('[uploadFoodPhoto] Failed to generate signed URL:', urlError);
    }

    return {
      success: true,
      photoId,
      path: data.path,
      url: urlData?.signedUrl,
    };
  } catch (err) {
    console.error('[uploadFoodPhoto] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Retrieval Operations
// ============================================================================

/**
 * Get signed URL for food photo
 * URL expires after 1 hour
 */
export async function getFoodPhotoUrl(
  supabase: SupabaseClient,
  userId: string,
  photoId: string
): Promise<string | null> {
  // Try both .jpg and .png extensions
  const possiblePaths = [
    `${userId}/${photoId}.jpg`,
    `${userId}/${photoId}.png`,
  ];

  for (const path of possiblePaths) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  console.error('[getFoodPhotoUrl] Failed to generate URL for photoId:', photoId);
  return null;
}

/**
 * Download food photo as blob
 */
export async function downloadFoodPhoto(
  supabase: SupabaseClient,
  userId: string,
  photoId: string
): Promise<Blob | null> {
  // Try both .jpg and .png extensions
  const possiblePaths = [
    `${userId}/${photoId}.jpg`,
    `${userId}/${photoId}.png`,
  ];

  for (const path of possiblePaths) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(path);

    if (!error && data) {
      return data;
    }
  }

  console.error('[downloadFoodPhoto] Failed to download photoId:', photoId);
  return null;
}

/**
 * List all food photos for a user
 * Returns metadata including signed URLs
 */
export async function listUserFoodPhotos(
  supabase: SupabaseClient,
  userId: string
): Promise<FoodPhotoMetadata[]> {
  try {
    // List all files in user's folder
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(userId, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('[listUserFoodPhotos] Failed to list files:', error);
      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    // Generate signed URLs for each photo
    const photosWithUrls = await Promise.all(
      files.map(async (file) => {
        const path = `${userId}/${file.name}`;
        const { data: urlData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

        // Extract photoId from filename (remove extension)
        const photoId = file.name.replace(/\.(jpg|png)$/, '');

        return {
          photoId,
          path,
          size: file.metadata?.size || 0,
          contentType: file.metadata?.mimetype || 'image/jpeg',
          createdAt: new Date(file.created_at),
          url: urlData?.signedUrl || '',
        };
      })
    );

    return photosWithUrls.filter((photo) => photo.url); // Only return photos with valid URLs
  } catch (err) {
    console.error('[listUserFoodPhotos] Unexpected error:', err);
    return [];
  }
}

// ============================================================================
// Deletion Operations
// ============================================================================

/**
 * Delete food photo
 * Users can only delete their own photos (enforced by RLS)
 */
export async function deleteFoodPhoto(
  supabase: SupabaseClient,
  userId: string,
  photoId: string
): Promise<boolean> {
  // Try both .jpg and .png extensions
  const possiblePaths = [
    `${userId}/${photoId}.jpg`,
    `${userId}/${photoId}.png`,
  ];

  for (const path of possiblePaths) {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (!error) {
      console.log('[deleteFoodPhoto] Successfully deleted:', path);
      return true;
    }
  }

  console.error('[deleteFoodPhoto] Failed to delete photoId:', photoId);
  return false;
}

/**
 * Bulk delete food photos
 */
export async function deleteFoodPhotos(
  supabase: SupabaseClient,
  userId: string,
  photoIds: string[]
): Promise<{ success: string[]; failed: string[] }> {
  const results = await Promise.all(
    photoIds.map(async (photoId) => {
      const success = await deleteFoodPhoto(supabase, userId, photoId);
      return { photoId, success };
    })
  );

  return {
    success: results.filter((r) => r.success).map((r) => r.photoId),
    failed: results.filter((r) => !r.success).map((r) => r.photoId),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if food-photos bucket exists and is configured correctly
 * Useful for health checks and debugging
 */
export async function verifyBucketConfiguration(
  supabase: SupabaseClient
): Promise<{ configured: boolean; error?: string }> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      return { configured: false, error: error.message };
    }

    const foodPhotosBucket = buckets?.find((b) => b.id === BUCKET_NAME);

    if (!foodPhotosBucket) {
      return {
        configured: false,
        error: `Bucket '${BUCKET_NAME}' does not exist. Run setup script: ./scripts/setup-food-photos-bucket.sh`,
      };
    }

    // Verify bucket configuration
    const configIssues: string[] = [];

    if (foodPhotosBucket.public) {
      configIssues.push('Bucket should be private (RLS enforced)');
    }

    if (foodPhotosBucket.file_size_limit !== MAX_FILE_SIZE) {
      configIssues.push(
        `File size limit should be ${MAX_FILE_SIZE} bytes (got ${foodPhotosBucket.file_size_limit})`
      );
    }

    if (configIssues.length > 0) {
      return {
        configured: false,
        error: `Bucket configuration issues: ${configIssues.join(', ')}`,
      };
    }

    return { configured: true };
  } catch (err) {
    return {
      configured: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Generate client-side validation rules for forms
 * Use in frontend to validate before upload
 */
export function getClientValidationRules() {
  return {
    maxSize: MAX_FILE_SIZE,
    maxSizeMB: MAX_FILE_SIZE / 1024 / 1024,
    allowedTypes: ALLOWED_MIME_TYPES,
    allowedExtensions: ['jpg', 'jpeg', 'png'],
  };
}
