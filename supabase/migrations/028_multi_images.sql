-- =====================================================
-- MULTI-IMAGE SYSTEM
-- Migration 028 - Front/Back/Tag Views with Alternatives
-- =====================================================

-- =====================================================
-- 1. VAULT IMAGES TABLE
-- Multiple images per vault item with types and voting
-- =====================================================
CREATE TABLE IF NOT EXISTS vault_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_item_id UUID NOT NULL REFERENCES the_vault(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_type TEXT NOT NULL CHECK (image_type IN ('front', 'back', 'tag')),
    is_primary BOOLEAN DEFAULT false,
    caption TEXT,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vault_item_id, image_url)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_vault_images_item ON vault_images(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_images_type ON vault_images(vault_item_id, image_type, is_primary DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_vault_images_primary ON vault_images(vault_item_id, image_type) WHERE is_primary = true;

-- =====================================================
-- 2. IMAGE VOTES TABLE
-- Track who voted on which image
-- =====================================================
CREATE TABLE IF NOT EXISTS vault_image_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_image_id UUID NOT NULL REFERENCES vault_images(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vault_image_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_image_votes_image ON vault_image_votes(vault_image_id);
CREATE INDEX IF NOT EXISTS idx_image_votes_user ON vault_image_votes(user_id);

-- =====================================================
-- 3. INVENTORY IMAGE COLUMNS
-- Single front/back/tag for user items
-- =====================================================
ALTER TABLE user_inventory
ADD COLUMN IF NOT EXISTS front_image_url TEXT,
ADD COLUMN IF NOT EXISTS back_image_url TEXT,
ADD COLUMN IF NOT EXISTS tag_image_url TEXT;

COMMENT ON COLUMN user_inventory.front_image_url IS 'Front view of this specific item';
COMMENT ON COLUMN user_inventory.back_image_url IS 'Back view of this specific item';
COMMENT ON COLUMN user_inventory.tag_image_url IS 'Tag/label photo of this specific item';

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE vault_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_image_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view images
DROP POLICY IF EXISTS "Anyone can view vault images" ON vault_images;
CREATE POLICY "Anyone can view vault images" ON vault_images FOR SELECT USING (true);

-- Authenticated users can add images
DROP POLICY IF EXISTS "Authenticated can add vault images" ON vault_images;
CREATE POLICY "Authenticated can add vault images" ON vault_images 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);

-- Anyone can view votes
DROP POLICY IF EXISTS "Anyone can view image votes" ON vault_image_votes;
CREATE POLICY "Anyone can view image votes" ON vault_image_votes FOR SELECT USING (true);

-- Users can vote
DROP POLICY IF EXISTS "Users can vote on images" ON vault_image_votes;
CREATE POLICY "Users can vote on images" ON vault_image_votes 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change own image vote" ON vault_image_votes;
CREATE POLICY "Users can change own image vote" ON vault_image_votes 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own image vote" ON vault_image_votes;
CREATE POLICY "Users can remove own image vote" ON vault_image_votes 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNCTION: Vote on an image
-- =====================================================
CREATE OR REPLACE FUNCTION vote_vault_image(p_image_id UUID, p_vote TEXT)
RETURNS JSON AS $$
DECLARE
    v_existing TEXT;
    v_result vault_images%ROWTYPE;
BEGIN
    -- Check for existing vote
    SELECT vote_type INTO v_existing
    FROM vault_image_votes WHERE vault_image_id = p_image_id AND user_id = auth.uid();
    
    IF v_existing IS NOT NULL THEN
        IF v_existing = p_vote THEN
            -- Same vote = remove it
            DELETE FROM vault_image_votes WHERE vault_image_id = p_image_id AND user_id = auth.uid();
            IF p_vote = 'up' THEN
                UPDATE vault_images SET upvotes = upvotes - 1, score = score - 1 
                WHERE id = p_image_id RETURNING * INTO v_result;
            ELSE
                UPDATE vault_images SET downvotes = downvotes - 1, score = score + 1 
                WHERE id = p_image_id RETURNING * INTO v_result;
            END IF;
        ELSE
            -- Different vote = switch it
            UPDATE vault_image_votes SET vote_type = p_vote WHERE vault_image_id = p_image_id AND user_id = auth.uid();
            IF p_vote = 'up' THEN
                UPDATE vault_images SET upvotes = upvotes + 1, downvotes = downvotes - 1, score = score + 2 
                WHERE id = p_image_id RETURNING * INTO v_result;
            ELSE
                UPDATE vault_images SET upvotes = upvotes - 1, downvotes = downvotes + 1, score = score - 2 
                WHERE id = p_image_id RETURNING * INTO v_result;
            END IF;
        END IF;
    ELSE
        -- New vote
        INSERT INTO vault_image_votes (vault_image_id, user_id, vote_type) 
        VALUES (p_image_id, auth.uid(), p_vote);
        
        IF p_vote = 'up' THEN
            UPDATE vault_images SET upvotes = upvotes + 1, score = score + 1 
            WHERE id = p_image_id RETURNING * INTO v_result;
        ELSE
            UPDATE vault_images SET downvotes = downvotes + 1, score = score - 1 
            WHERE id = p_image_id RETURNING * INTO v_result;
        END IF;
    END IF;
    
    RETURN json_build_object(
        'upvotes', v_result.upvotes,
        'downvotes', v_result.downvotes,
        'score', v_result.score,
        'user_vote', CASE WHEN v_existing = p_vote THEN NULL ELSE p_vote END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNCTION: Add a new image
-- =====================================================
CREATE OR REPLACE FUNCTION add_vault_image(
    p_vault_item_id UUID, 
    p_image_url TEXT, 
    p_image_type TEXT,
    p_caption TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_image_id UUID;
    v_is_primary BOOLEAN := false;
    v_existing_count INT;
BEGIN
    -- Validate image type
    IF p_image_type NOT IN ('front', 'back', 'tag') THEN
        RETURN json_build_object('error', 'Invalid image type. Must be front, back, or tag.');
    END IF;
    
    -- Check if this is the first image of this type (make it primary)
    SELECT COUNT(*) INTO v_existing_count
    FROM vault_images 
    WHERE vault_item_id = p_vault_item_id AND image_type = p_image_type;
    
    IF v_existing_count = 0 THEN
        v_is_primary := true;
    END IF;
    
    -- Insert the image
    INSERT INTO vault_images (vault_item_id, image_url, image_type, is_primary, caption, added_by, upvotes, score)
    VALUES (p_vault_item_id, p_image_url, p_image_type, v_is_primary, p_caption, auth.uid(), 1, 1)
    ON CONFLICT (vault_item_id, image_url) DO NOTHING
    RETURNING id INTO v_image_id;
    
    IF v_image_id IS NULL THEN
        RETURN json_build_object('error', 'Image already exists for this item');
    END IF;
    
    -- Auto-upvote from adder
    INSERT INTO vault_image_votes (vault_image_id, user_id, vote_type)
    VALUES (v_image_id, auth.uid(), 'up');
    
    RETURN json_build_object(
        'success', true,
        'image_id', v_image_id,
        'is_primary', v_is_primary
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCTION: Get images for a vault item
-- =====================================================
CREATE OR REPLACE FUNCTION get_vault_images(p_vault_item_id UUID)
RETURNS TABLE (
    id UUID,
    image_url TEXT,
    image_type TEXT,
    is_primary BOOLEAN,
    caption TEXT,
    upvotes INT,
    downvotes INT,
    score INT,
    user_vote TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vi.id,
        vi.image_url,
        vi.image_type,
        vi.is_primary,
        vi.caption,
        vi.upvotes,
        vi.downvotes,
        vi.score,
        viv.vote_type as user_vote
    FROM vault_images vi
    LEFT JOIN vault_image_votes viv ON viv.vault_image_id = vi.id AND viv.user_id = auth.uid()
    WHERE vi.vault_item_id = p_vault_item_id
    ORDER BY vi.image_type, vi.is_primary DESC, vi.score DESC, vi.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCTION: Set primary image
-- =====================================================
CREATE OR REPLACE FUNCTION set_primary_vault_image(p_image_id UUID)
RETURNS JSON AS $$
DECLARE
    v_vault_item_id UUID;
    v_image_type TEXT;
BEGIN
    -- Get image details
    SELECT vault_item_id, image_type INTO v_vault_item_id, v_image_type
    FROM vault_images WHERE id = p_image_id;
    
    IF v_vault_item_id IS NULL THEN
        RETURN json_build_object('error', 'Image not found');
    END IF;
    
    -- Unset current primary
    UPDATE vault_images 
    SET is_primary = false 
    WHERE vault_item_id = v_vault_item_id AND image_type = v_image_type AND is_primary = true;
    
    -- Set new primary
    UPDATE vault_images SET is_primary = true WHERE id = p_image_id;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION vote_vault_image TO authenticated;
GRANT EXECUTE ON FUNCTION add_vault_image TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_images TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_primary_vault_image TO authenticated;

-- =====================================================
-- 10. MIGRATE EXISTING IMAGES
-- Move reference_image_url to vault_images as primary front
-- =====================================================
INSERT INTO vault_images (vault_item_id, image_url, image_type, is_primary, upvotes, score)
SELECT id, reference_image_url, 'front', true, 1, 1
FROM the_vault
WHERE reference_image_url IS NOT NULL AND reference_image_url != ''
ON CONFLICT (vault_item_id, image_url) DO NOTHING;

-- =====================================================
-- 11. COMMENTS
-- =====================================================
COMMENT ON TABLE vault_images IS 'Multiple front/back/tag images for vault items with voting';
COMMENT ON TABLE vault_image_votes IS 'Tracks user votes on vault images';
