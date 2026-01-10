-- =====================================================
-- USER COLLECTIONS (FOLDERS)
-- Migration 007 - Organizing Inventory
-- =====================================================

-- 1. Create User Collections table
CREATE TABLE IF NOT EXISTS user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#9333ea', -- Default purple
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add collection_id to user_inventory
ALTER TABLE user_inventory 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES user_collections(id) ON DELETE SET NULL;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_collections_user ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_collection ON user_inventory(collection_id);

-- 4. Enable RLS
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can manage their own collections"
ON user_collections FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view non-private collections"
ON user_collections FOR SELECT
TO public
USING (is_private = false);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_collections_updated_at
    BEFORE UPDATE ON user_collections
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
