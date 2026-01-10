-- =====================================================
-- STORAGE SETUP
-- Migration 006 - Image Storage Configuration
-- =====================================================

-- Note: Storage bucket creation must be done via Supabase Dashboard or API
-- This file documents the required configuration and creates RLS policies

-- =====================================================
-- BUCKET CONFIGURATION (via Dashboard)
-- =====================================================
-- Bucket Name: shirt-images
-- Public: Yes (for public URL access)
-- File Size Limit: 10MB
-- Allowed MIME Types: image/jpeg, image/png, image/webp, image/gif

-- =====================================================
-- STORAGE POLICIES
-- These policies control who can upload/read/delete files
-- =====================================================

-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Public read access for shirt images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shirt-images');

-- Policy: Authenticated users can upload to their folder
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'shirt-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'shirt-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'shirt-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- IMAGE METADATA TABLE
-- Track image uploads for analytics and cleanup
-- =====================================================

CREATE TABLE IF NOT EXISTS image_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    vault_item_id UUID REFERENCES the_vault(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES user_inventory(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(storage_path)
);

-- Indexes for image lookups
CREATE INDEX IF NOT EXISTS idx_image_uploads_user 
    ON image_uploads(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_uploads_vault 
    ON image_uploads(vault_item_id);

CREATE INDEX IF NOT EXISTS idx_image_uploads_inventory 
    ON image_uploads(inventory_id);

-- RLS for image uploads table
ALTER TABLE image_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view image metadata"
ON image_uploads FOR SELECT
USING (true);

CREATE POLICY "Users can insert own image metadata"
ON image_uploads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- STORAGE CLEANUP FUNCTION
-- Remove orphaned images (no associated vault item or inventory)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS void AS $$
DECLARE
    orphan RECORD;
BEGIN
    -- Find images older than 24 hours with no associations
    FOR orphan IN 
        SELECT storage_path 
        FROM image_uploads 
        WHERE vault_item_id IS NULL 
          AND inventory_id IS NULL 
          AND created_at < NOW() - INTERVAL '24 hours'
    LOOP
        -- Note: Actual file deletion must be done via Supabase Storage API
        -- This just removes the metadata record
        DELETE FROM image_uploads WHERE storage_path = orphan.storage_path;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STORAGE USAGE TRACKING
-- Monitor per-user storage consumption
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS BIGINT AS $$
    SELECT COALESCE(SUM(file_size), 0)::BIGINT
    FROM image_uploads
    WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- SETUP INSTRUCTIONS (Manual Steps)
-- =====================================================
-- 
-- 1. Create Storage Bucket via Dashboard:
--    - Go to Storage > New bucket
--    - Name: shirt-images
--    - Toggle "Public bucket" ON
--    - Set file size limit: 10485760 (10MB)
--
-- 2. Enable Image Transformations (Pro plan):
--    - Settings > Storage > Enable transformations
--    - Allows on-the-fly resizing: ?width=400&height=400
--
-- 3. Optional: Set up CDN
--    - Add Cloudflare in front of storage URL
--    - Cache images at edge for faster global access
--
-- 4. Schedule cleanup job:
--    - Use Supabase Edge Function with cron trigger
--    - Run cleanup_orphaned_images() daily
