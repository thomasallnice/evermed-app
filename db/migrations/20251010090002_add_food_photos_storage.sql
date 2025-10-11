-- ============================================
-- Storage Bucket and Policies for Food Photos
-- ============================================
-- Creates 'food-photos' bucket with user-scoped RLS policies
-- ============================================

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  false, -- Private bucket
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage Policies for food-photos bucket
-- ============================================

-- Users can upload photos to their own folder (personId/meals/*)
CREATE POLICY "Users can upload own food photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Person"
    WHERE "ownerId" = auth.uid()::text
  )
);

-- Users can view their own photos
CREATE POLICY "Users can view own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Person"
    WHERE "ownerId" = auth.uid()::text
  )
);

-- Users can update their own photos
CREATE POLICY "Users can update own food photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Person"
    WHERE "ownerId" = auth.uid()::text
  )
);

-- Users can delete their own photos
CREATE POLICY "Users can delete own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Person"
    WHERE "ownerId" = auth.uid()::text
  )
);
