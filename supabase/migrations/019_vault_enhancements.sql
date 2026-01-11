-- =====================================================
-- VAULT ITEM ENHANCEMENTS
-- Migration 019 - History, Variants, Related Shirts
-- =====================================================

-- =====================================================
-- 1. VAULT HISTORY TABLE
-- Complete changelog of all vault item changes
-- =====================================================
CREATE TABLE IF NOT EXISTS vault_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_item_id UUID REFERENCES the_vault(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'created', 'edited', 'verified', 'image_added', 'variant_added'
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast history lookups
CREATE INDEX IF NOT EXISTS idx_vault_history_item ON vault_history(vault_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_history_user ON vault_history(user_id);

-- RLS for vault history
ALTER TABLE vault_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view vault history" ON vault_history FOR SELECT USING (true);
CREATE POLICY "System can insert history" ON vault_history FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. VARIANTS SYSTEM
-- Link shirt variations to a base shirt
-- =====================================================

-- Add variant columns to the_vault
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES the_vault(id) ON DELETE SET NULL;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS variant_type TEXT;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS is_base_shirt BOOLEAN DEFAULT true;

-- Index for finding variants of a base shirt
CREATE INDEX IF NOT EXISTS idx_vault_parent ON the_vault(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vault_base_shirts ON the_vault(is_base_shirt) WHERE is_base_shirt = true;

-- Variant types: back_hit, front_hit, color, graphic_change, size_variant, bootleg, reprint
COMMENT ON COLUMN the_vault.variant_type IS 'Type of variant: back_hit, front_hit, color, graphic_change, size_variant, bootleg, reprint';

-- =====================================================
-- 3. RELATED SHIRTS TABLE
-- User-curated connections between shirts with voting
-- =====================================================
CREATE TABLE IF NOT EXISTS related_shirts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shirt_a_id UUID NOT NULL REFERENCES the_vault(id) ON DELETE CASCADE,
    shirt_b_id UUID NOT NULL REFERENCES the_vault(id) ON DELETE CASCADE,
    proposed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT, -- Optional explanation for the connection
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0, -- upvotes - downvotes
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Can't relate a shirt to itself
    CONSTRAINT different_shirts CHECK (shirt_a_id != shirt_b_id)
);

-- Unique index to prevent duplicates (A-B is same as B-A)
CREATE UNIQUE INDEX IF NOT EXISTS idx_related_shirts_unique_pair 
    ON related_shirts (LEAST(shirt_a_id, shirt_b_id), GREATEST(shirt_a_id, shirt_b_id));

-- Indexes for related shirt queries
CREATE INDEX IF NOT EXISTS idx_related_a ON related_shirts(shirt_a_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_related_b ON related_shirts(shirt_b_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_related_score ON related_shirts(score DESC);

-- RLS for related shirts
ALTER TABLE related_shirts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view related shirts" ON related_shirts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can suggest related" ON related_shirts FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = proposed_by);

-- =====================================================
-- 4. RELATED SHIRT VOTES TABLE
-- Track who voted on related shirt suggestions
-- =====================================================
CREATE TABLE IF NOT EXISTS related_shirt_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_id UUID NOT NULL REFERENCES related_shirts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(related_id, user_id)
);

-- RLS for votes
ALTER TABLE related_shirt_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view related votes" ON related_shirt_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON related_shirt_votes FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change own vote" ON related_shirt_votes FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON related_shirt_votes FOR DELETE TO authenticated 
    USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNCTIONS
-- =====================================================

-- Function to log vault history
CREATE OR REPLACE FUNCTION log_vault_history(
    p_vault_item_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_field_name TEXT DEFAULT NULL,
    p_old_value TEXT DEFAULT NULL,
    p_new_value TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO vault_history (vault_item_id, user_id, action, field_name, old_value, new_value, metadata)
    VALUES (p_vault_item_id, p_user_id, p_action, p_field_name, p_old_value, p_new_value, p_metadata)
    RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote on related shirt
CREATE OR REPLACE FUNCTION vote_related_shirt(
    p_related_id UUID,
    p_vote_type TEXT -- 'up' or 'down'
) RETURNS void AS $$
DECLARE
    v_existing_vote TEXT;
BEGIN
    -- Check for existing vote
    SELECT vote_type INTO v_existing_vote
    FROM related_shirt_votes
    WHERE related_id = p_related_id AND user_id = auth.uid();
    
    IF v_existing_vote IS NOT NULL THEN
        IF v_existing_vote = p_vote_type THEN
            -- Same vote, remove it
            DELETE FROM related_shirt_votes WHERE related_id = p_related_id AND user_id = auth.uid();
            
            IF p_vote_type = 'up' THEN
                UPDATE related_shirts SET upvotes = upvotes - 1, score = score - 1 WHERE id = p_related_id;
            ELSE
                UPDATE related_shirts SET downvotes = downvotes - 1, score = score + 1 WHERE id = p_related_id;
            END IF;
        ELSE
            -- Different vote, switch it
            UPDATE related_shirt_votes SET vote_type = p_vote_type WHERE related_id = p_related_id AND user_id = auth.uid();
            
            IF p_vote_type = 'up' THEN
                UPDATE related_shirts SET upvotes = upvotes + 1, downvotes = downvotes - 1, score = score + 2 WHERE id = p_related_id;
            ELSE
                UPDATE related_shirts SET upvotes = upvotes - 1, downvotes = downvotes + 1, score = score - 2 WHERE id = p_related_id;
            END IF;
        END IF;
    ELSE
        -- New vote
        INSERT INTO related_shirt_votes (related_id, user_id, vote_type) VALUES (p_related_id, auth.uid(), p_vote_type);
        
        IF p_vote_type = 'up' THEN
            UPDATE related_shirts SET upvotes = upvotes + 1, score = score + 1 WHERE id = p_related_id;
        ELSE
            UPDATE related_shirts SET downvotes = downvotes + 1, score = score - 1 WHERE id = p_related_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get related shirts for an item (top 3 by score)
CREATE OR REPLACE FUNCTION get_related_shirts(p_vault_item_id UUID)
RETURNS TABLE (
    id UUID,
    related_shirt_id UUID,
    subject TEXT,
    category TEXT,
    reference_image_url TEXT,
    score INTEGER,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id,
        CASE WHEN rs.shirt_a_id = p_vault_item_id THEN rs.shirt_b_id ELSE rs.shirt_a_id END as related_shirt_id,
        v.subject,
        v.category,
        v.reference_image_url,
        rs.score,
        rs.reason
    FROM related_shirts rs
    JOIN the_vault v ON v.id = CASE WHEN rs.shirt_a_id = p_vault_item_id THEN rs.shirt_b_id ELSE rs.shirt_a_id END
    WHERE (rs.shirt_a_id = p_vault_item_id OR rs.shirt_b_id = p_vault_item_id)
      AND rs.status = 'approved'
    ORDER BY rs.score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. TRIGGER FOR AUTO-LOGGING CREATES
-- =====================================================
CREATE OR REPLACE FUNCTION log_vault_creation() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO vault_history (vault_item_id, user_id, action, new_value)
    VALUES (NEW.id, NEW.created_by, 'created', NEW.subject);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS vault_creation_log ON the_vault;
CREATE TRIGGER vault_creation_log
    AFTER INSERT ON the_vault
    FOR EACH ROW EXECUTE FUNCTION log_vault_creation();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION log_vault_history TO authenticated;
GRANT EXECUTE ON FUNCTION vote_related_shirt TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_shirts TO authenticated, anon;

-- =====================================================
-- 7. BACKFILL HISTORY FOR EXISTING ITEMS
-- =====================================================
INSERT INTO vault_history (vault_item_id, user_id, action, new_value, created_at)
SELECT 
    id as vault_item_id,
    created_by as user_id,
    'created' as action,
    subject as new_value,
    created_at
FROM the_vault
WHERE NOT EXISTS (
    SELECT 1 FROM vault_history vh 
    WHERE vh.vault_item_id = the_vault.id AND vh.action = 'created'
);
