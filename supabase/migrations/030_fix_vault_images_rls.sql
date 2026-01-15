-- Fix: Allow authenticated users to insert vault images
-- The SECURITY DEFINER functions handle the logic, but direct inserts also need to work

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated can add vault images" ON vault_images;

-- Create a more permissive policy for authenticated users
CREATE POLICY "Authenticated users can add vault images" ON vault_images 
    FOR INSERT TO authenticated WITH CHECK (true);

-- Also ensure storage bucket has correct policies
-- Run in Supabase Dashboard > Storage > vault-images bucket > Policies:
-- INSERT: (bucket_id = 'vault-images' AND auth.role() = 'authenticated')
