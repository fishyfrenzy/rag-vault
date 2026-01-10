-- =====================================================
-- ADMIN SUPPORT
-- Migration 015 - Admin Flag & Policies
-- =====================================================

-- 1. Add is_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Update RLS policies for edit_proposals to allow Admins to update (approve/reject)
-- We need to DROP existing strict policies if they conflict, or add a new permissive one.
-- Existing update policy: "Users can update own pending proposals"
-- We add an admin policy:
CREATE POLICY "Admins can update any proposal" 
ON edit_proposals 
FOR UPDATE 
TO authenticated 
USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Note: We generally need a policy to allow reviewing (updating status) for non-admins too (Trusted Users).
-- The previous migration might have missed this for *other* users' edits.
-- Let's add a policy for Trusted users to update status of others' proposals.
CREATE POLICY "Trusted users can review others proposals"
ON edit_proposals
FOR UPDATE
TO authenticated
USING (
    -- User must be trusted (karma >= 200) AND proposal is NOT their own
    (SELECT karma_score FROM profiles WHERE id = auth.uid()) >= 200
    AND user_id != auth.uid()
);
