-- ============================================================================
-- Storage Bucket: food-photos (Bucket Creation Only)
-- Purpose: Create food-photos bucket in Supabase Storage
-- Note: RLS policies must be added via Supabase Dashboard UI
-- ============================================================================

-- Create or update the food-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  true, -- PUBLIC (required for OpenAI Vision API)
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'food-photos';
