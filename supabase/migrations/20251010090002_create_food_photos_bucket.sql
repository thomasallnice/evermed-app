-- Create food-photos storage bucket for Metabolic Insights
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  false, -- private bucket
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
);

-- Storage RLS policies for food-photos bucket
-- Users can upload their own food photos
CREATE POLICY "Users can upload own food photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos'
  AND auth.uid()::text IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own food photos
CREATE POLICY "Users can view own food photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'food-photos'
  AND auth.uid()::text IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own food photos
CREATE POLICY "Users can update own food photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-photos'
  AND auth.uid()::text IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own food photos
CREATE POLICY "Users can delete own food photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-photos'
  AND auth.uid()::text IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
