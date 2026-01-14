-- =====================================================
-- ENHANCED TAG SYSTEM
-- Migration 027 - Tag Pool + Voting
-- =====================================================

-- =====================================================
-- 1. TAG POOL TABLE
-- All unique tags in the system with usage stats
-- =====================================================
CREATE TABLE IF NOT EXISTS tag_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tag_pool_slug ON tag_pool(slug);
CREATE INDEX IF NOT EXISTS idx_tag_pool_name_trgm ON tag_pool USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tag_pool_usage ON tag_pool(usage_count DESC);

-- =====================================================
-- 2. VAULT ITEM TAGS TABLE
-- Junction table linking tags to items with voting
-- =====================================================
CREATE TABLE IF NOT EXISTS vault_item_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_item_id UUID NOT NULL REFERENCES the_vault(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tag_pool(id) ON DELETE CASCADE,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    upvotes INT DEFAULT 0,
    downvotes INT DEFAULT 0,
    score INT DEFAULT 0,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vault_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_tags_item ON vault_item_tags(vault_item_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_vault_tags_tag ON vault_item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_vault_tags_status ON vault_item_tags(status) WHERE status = 'approved';

-- =====================================================
-- 3. TAG VOTES TABLE
-- Track who voted on which tag
-- =====================================================
CREATE TABLE IF NOT EXISTS tag_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_tag_id UUID NOT NULL REFERENCES vault_item_tags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vault_tag_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tag_votes_vault_tag ON tag_votes(vault_tag_id);
CREATE INDEX IF NOT EXISTS idx_tag_votes_user ON tag_votes(user_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE tag_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_votes ENABLE ROW LEVEL SECURITY;

-- Tag Pool policies
DROP POLICY IF EXISTS "Anyone can view tags" ON tag_pool;
CREATE POLICY "Anyone can view tags" ON tag_pool FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can create tags" ON tag_pool;
CREATE POLICY "Authenticated can create tags" ON tag_pool FOR INSERT TO authenticated WITH CHECK (true);

-- Vault Item Tags policies
DROP POLICY IF EXISTS "Anyone can view vault tags" ON vault_item_tags;
CREATE POLICY "Anyone can view vault tags" ON vault_item_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can add tags" ON vault_item_tags;
CREATE POLICY "Authenticated can add tags" ON vault_item_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);

-- Tag Votes policies
DROP POLICY IF EXISTS "Anyone can view tag votes" ON tag_votes;
CREATE POLICY "Anyone can view tag votes" ON tag_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote on tags" ON tag_votes;
CREATE POLICY "Users can vote on tags" ON tag_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change own tag vote" ON tag_votes;
CREATE POLICY "Users can change own tag vote" ON tag_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own tag vote" ON tag_votes;
CREATE POLICY "Users can remove own tag vote" ON tag_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNCTION: Vote on a tag
-- =====================================================
CREATE OR REPLACE FUNCTION vote_vault_tag(p_vault_tag_id UUID, p_vote TEXT)
RETURNS JSON AS $$
DECLARE
    v_existing TEXT;
    v_result vault_item_tags%ROWTYPE;
BEGIN
    -- Check for existing vote
    SELECT vote_type INTO v_existing
    FROM tag_votes WHERE vault_tag_id = p_vault_tag_id AND user_id = auth.uid();
    
    IF v_existing IS NOT NULL THEN
        IF v_existing = p_vote THEN
            -- Same vote = remove it
            DELETE FROM tag_votes WHERE vault_tag_id = p_vault_tag_id AND user_id = auth.uid();
            IF p_vote = 'up' THEN
                UPDATE vault_item_tags SET upvotes = upvotes - 1, score = score - 1 
                WHERE id = p_vault_tag_id RETURNING * INTO v_result;
            ELSE
                UPDATE vault_item_tags SET downvotes = downvotes - 1, score = score + 1 
                WHERE id = p_vault_tag_id RETURNING * INTO v_result;
            END IF;
        ELSE
            -- Different vote = switch it
            UPDATE tag_votes SET vote_type = p_vote WHERE vault_tag_id = p_vault_tag_id AND user_id = auth.uid();
            IF p_vote = 'up' THEN
                UPDATE vault_item_tags SET upvotes = upvotes + 1, downvotes = downvotes - 1, score = score + 2 
                WHERE id = p_vault_tag_id RETURNING * INTO v_result;
            ELSE
                UPDATE vault_item_tags SET upvotes = upvotes - 1, downvotes = downvotes + 1, score = score - 2 
                WHERE id = p_vault_tag_id RETURNING * INTO v_result;
            END IF;
        END IF;
    ELSE
        -- New vote
        INSERT INTO tag_votes (vault_tag_id, user_id, vote_type) 
        VALUES (p_vault_tag_id, auth.uid(), p_vote);
        
        IF p_vote = 'up' THEN
            UPDATE vault_item_tags SET upvotes = upvotes + 1, score = score + 1 
            WHERE id = p_vault_tag_id RETURNING * INTO v_result;
        ELSE
            UPDATE vault_item_tags SET downvotes = downvotes + 1, score = score - 1 
            WHERE id = p_vault_tag_id RETURNING * INTO v_result;
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
-- 6. FUNCTION: Add a tag to an item
-- =====================================================
CREATE OR REPLACE FUNCTION add_vault_tag(p_vault_item_id UUID, p_tag_name TEXT)
RETURNS JSON AS $$
DECLARE
    v_tag_id UUID;
    v_vault_tag_id UUID;
    v_slug TEXT;
    v_clean_name TEXT;
BEGIN
    -- Clean and normalize tag name
    v_clean_name := TRIM(p_tag_name);
    v_slug := LOWER(TRIM(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g')));
    v_slug := TRIM(BOTH '-' FROM v_slug); -- Remove leading/trailing hyphens
    
    IF v_slug = '' OR length(v_slug) < 2 THEN
        RETURN json_build_object('error', 'Tag must be at least 2 characters');
    END IF;
    
    -- Get or create tag in pool
    SELECT id INTO v_tag_id FROM tag_pool WHERE slug = v_slug;
    IF v_tag_id IS NULL THEN
        INSERT INTO tag_pool (name, slug, created_by, usage_count)
        VALUES (v_clean_name, v_slug, auth.uid(), 1)
        RETURNING id INTO v_tag_id;
    ELSE
        UPDATE tag_pool SET usage_count = usage_count + 1 WHERE id = v_tag_id;
    END IF;
    
    -- Check if tag already exists on item
    SELECT id INTO v_vault_tag_id FROM vault_item_tags 
    WHERE vault_item_id = p_vault_item_id AND tag_id = v_tag_id;
    
    IF v_vault_tag_id IS NOT NULL THEN
        RETURN json_build_object('error', 'Tag already exists on this item', 'tag_id', v_vault_tag_id);
    END IF;
    
    -- Add tag to vault item (with auto-upvote from adder)
    INSERT INTO vault_item_tags (vault_item_id, tag_id, added_by, upvotes, score)
    VALUES (p_vault_item_id, v_tag_id, auth.uid(), 1, 1)
    RETURNING id INTO v_vault_tag_id;
    
    -- Add the upvote record
    INSERT INTO tag_votes (vault_tag_id, user_id, vote_type)
    VALUES (v_vault_tag_id, auth.uid(), 'up');
    
    RETURN json_build_object(
        'success', true,
        'vault_tag_id', v_vault_tag_id,
        'tag_id', v_tag_id,
        'tag_name', v_clean_name,
        'tag_slug', v_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCTION: Get tags for an item (top 10 by score)
-- =====================================================
CREATE OR REPLACE FUNCTION get_vault_tags(p_vault_item_id UUID)
RETURNS TABLE (
    id UUID,
    tag_name TEXT,
    tag_slug TEXT,
    upvotes INT,
    downvotes INT,
    score INT,
    user_vote TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vt.id,
        tp.name as tag_name,
        tp.slug as tag_slug,
        vt.upvotes,
        vt.downvotes,
        vt.score,
        tv.vote_type as user_vote
    FROM vault_item_tags vt
    JOIN tag_pool tp ON tp.id = vt.tag_id
    LEFT JOIN tag_votes tv ON tv.vault_tag_id = vt.id AND tv.user_id = auth.uid()
    WHERE vt.vault_item_id = p_vault_item_id
      AND vt.status = 'approved'
    ORDER BY vt.score DESC, vt.created_at
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCTION: Search tag pool for autocomplete
-- =====================================================
CREATE OR REPLACE FUNCTION search_tags(query TEXT, result_limit INT DEFAULT 10)
RETURNS TABLE (id UUID, name TEXT, slug TEXT, usage_count INT) AS $$
BEGIN
    IF query IS NULL OR TRIM(query) = '' THEN
        -- Return popular tags
        RETURN QUERY
        SELECT tp.id, tp.name, tp.slug, tp.usage_count
        FROM tag_pool tp
        ORDER BY tp.usage_count DESC
        LIMIT result_limit;
    ELSE
        -- Search by name
        RETURN QUERY
        SELECT tp.id, tp.name, tp.slug, tp.usage_count
        FROM tag_pool tp
        WHERE tp.name ILIKE '%' || TRIM(query) || '%'
           OR tp.slug ILIKE '%' || TRIM(query) || '%'
        ORDER BY 
            CASE WHEN tp.name ILIKE TRIM(query) || '%' THEN 0 ELSE 1 END,
            tp.usage_count DESC
        LIMIT result_limit;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. FUNCTION: Get popular tags across all items
-- =====================================================
CREATE OR REPLACE FUNCTION get_popular_tags(result_limit INT DEFAULT 20)
RETURNS TABLE (id UUID, name TEXT, slug TEXT, usage_count INT) AS $$
BEGIN
    RETURN QUERY
    SELECT tp.id, tp.name, tp.slug, tp.usage_count
    FROM tag_pool tp
    WHERE tp.usage_count > 0
    ORDER BY tp.usage_count DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION vote_vault_tag TO authenticated;
GRANT EXECUTE ON FUNCTION add_vault_tag TO authenticated;
GRANT EXECUTE ON FUNCTION get_vault_tags TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_tags TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_popular_tags TO authenticated, anon;

-- =====================================================
-- 11. MIGRATE EXISTING TAGS
-- Convert tags from the_vault.tags array to new system
-- =====================================================

-- First, insert unique tags into tag_pool
INSERT INTO tag_pool (name, slug, usage_count)
SELECT 
    TRIM(tag_name) as name,
    LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(tag_name), '[^a-zA-Z0-9]+', '-', 'g'))) as slug,
    COUNT(*) as usage_count
FROM (
    SELECT DISTINCT unnest(tags) as tag_name
    FROM the_vault
    WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
) t
WHERE TRIM(tag_name) != ''
  AND length(TRIM(tag_name)) >= 2
GROUP BY TRIM(tag_name)
ON CONFLICT (slug) DO UPDATE SET usage_count = tag_pool.usage_count + EXCLUDED.usage_count;

-- Then, link tags to vault items
INSERT INTO vault_item_tags (vault_item_id, tag_id, upvotes, score, status)
SELECT 
    v.id as vault_item_id,
    tp.id as tag_id,
    1 as upvotes,
    1 as score,
    'approved' as status
FROM the_vault v
CROSS JOIN LATERAL unnest(v.tags) as tag_name
JOIN tag_pool tp ON tp.slug = LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(tag_name), '[^a-zA-Z0-9]+', '-', 'g')))
WHERE v.tags IS NOT NULL AND array_length(v.tags, 1) > 0
ON CONFLICT (vault_item_id, tag_id) DO NOTHING;

-- =====================================================
-- 12. COMMENTS
-- =====================================================
COMMENT ON TABLE tag_pool IS 'Central pool of all unique tags in the system';
COMMENT ON TABLE vault_item_tags IS 'Junction table linking tags to vault items with voting';
COMMENT ON TABLE tag_votes IS 'Tracks user votes on vault item tags';
