-- =====================================================
-- MAJOR DATABASE IMPROVEMENTS
-- Migration 018 - Comprehensive Optimization
-- =====================================================

-- =====================================================
-- 1. FOREIGN KEY INDEXES
-- Speed up JOINs on foreign key columns
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventory_vault ON user_inventory(vault_id);
CREATE INDEX IF NOT EXISTS idx_edit_proposals_user ON edit_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_vault ON contributions(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor ON activity_feed(actor_id);
CREATE INDEX IF NOT EXISTS idx_votes_target_id ON votes(target_id);

-- =====================================================
-- 2. FIX tag_brand TO TEXT[] TYPE
-- Already stored as arrays, make schema match
-- =====================================================
-- Note: If this fails, column may already be TEXT[]
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'the_vault' 
        AND column_name = 'tag_brand' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE the_vault ALTER COLUMN tag_brand TYPE TEXT[] 
        USING CASE 
            WHEN tag_brand IS NULL THEN NULL
            WHEN tag_brand LIKE '{%' THEN tag_brand::TEXT[]
            ELSE string_to_array(tag_brand, ',')
        END;
    END IF;
END $$;

-- =====================================================
-- 3. UPDATED_AT TRIGGERS
-- Auto-update timestamp on row changes
-- =====================================================

-- Create reusable trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at to tables that need it
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE edit_proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create triggers
DROP TRIGGER IF EXISTS update_vault_timestamp ON the_vault;
CREATE TRIGGER update_vault_timestamp 
    BEFORE UPDATE ON the_vault 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_inventory_timestamp ON user_inventory;
CREATE TRIGGER update_inventory_timestamp 
    BEFORE UPDATE ON user_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_proposals_timestamp ON edit_proposals;
CREATE TRIGGER update_proposals_timestamp 
    BEFORE UPDATE ON edit_proposals 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- 4. CONSOLIDATED KARMA FUNCTION
-- Single source of truth for karma awards
-- =====================================================
CREATE OR REPLACE FUNCTION award_karma_v2(
    p_user_id UUID,
    p_action TEXT,
    p_points INTEGER,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    -- Insert transaction log
    INSERT INTO karma_transactions (user_id, action, points, reference_type, reference_id, description)
    VALUES (p_user_id, p_action, p_points, p_reference_type, p_reference_id, p_description);
    
    -- Update profile karma
    UPDATE profiles 
    SET karma_score = GREATEST(0, karma_score + p_points),
        total_contributions = total_contributions + 1,
        karma_tier = CASE 
            WHEN karma_score + p_points >= 1000 THEN 'curator'
            WHEN karma_score + p_points >= 500 THEN 'expert'
            WHEN karma_score + p_points >= 200 THEN 'trusted'
            WHEN karma_score + p_points >= 50 THEN 'contributor'
            ELSE 'newcomer'
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. FULL-TEXT SEARCH SETUP
-- Enable trigram extension and add search vector
-- =====================================================

-- Enable pg_trgm extension (may already exist)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search vector column
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- Create function to generate search vector
CREATE OR REPLACE FUNCTION vault_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
DROP TRIGGER IF EXISTS vault_search_update ON the_vault;
CREATE TRIGGER vault_search_update
    BEFORE INSERT OR UPDATE ON the_vault
    FOR EACH ROW EXECUTE FUNCTION vault_search_vector_update();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_vault_fts ON the_vault USING GIN(search_vector);

-- Create trigram index for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_vault_subject_trgm ON the_vault USING GIN(subject gin_trgm_ops);

-- Backfill existing records
UPDATE the_vault SET search_vector = 
    setweight(to_tsvector('english', COALESCE(subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'C');

-- =====================================================
-- 6. RATE LIMITING TABLE
-- Prevent spam/abuse
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    window_start TIMESTAMPTZ DEFAULT now(),
    request_count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, action)
);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action TEXT,
    p_max_requests INTEGER DEFAULT 10,
    p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    SELECT request_count, window_start INTO v_count, v_window_start
    FROM rate_limits
    WHERE user_id = p_user_id AND action = p_action;
    
    IF v_window_start IS NULL OR v_window_start < now() - (p_window_minutes || ' minutes')::INTERVAL THEN
        -- New window
        INSERT INTO rate_limits (user_id, action, window_start, request_count)
        VALUES (p_user_id, p_action, now(), 1)
        ON CONFLICT (user_id, action) 
        DO UPDATE SET window_start = now(), request_count = 1;
        RETURN TRUE;
    ELSIF v_count < p_max_requests THEN
        -- Within limit
        UPDATE rate_limits SET request_count = request_count + 1
        WHERE user_id = p_user_id AND action = p_action;
        RETURN TRUE;
    ELSE
        -- Rate limited
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CATEGORIES LOOKUP TABLE
-- Normalize categories for flexibility
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO categories (name, slug, icon, display_order) VALUES
    ('Music', 'music', '🎸', 1),
    ('Motorcycle', 'motorcycle', '🏍️', 2),
    ('Movie', 'movie', '🎬', 3),
    ('Art', 'art', '🎨', 4),
    ('Sport', 'sport', '⚽', 5),
    ('Advertising', 'advertising', '📺', 6),
    ('Other', 'other', '📦', 99)
ON CONFLICT (slug) DO NOTHING;

-- RLS for categories (public read)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);

-- =====================================================
-- 8. IS_VERIFIED GENERATED COLUMN
-- Computed field for query efficiency
-- =====================================================

-- Add verification_count if not exists
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;

-- Add generated column (requires verification_count >= 2)
-- Note: Generated columns can't reference other generated columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'the_vault' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE the_vault ADD COLUMN is_verified BOOLEAN 
            GENERATED ALWAYS AS (verification_count >= 2) STORED;
    END IF;
END $$;

-- Index for fast verified item queries
CREATE INDEX IF NOT EXISTS idx_vault_verified ON the_vault(is_verified) WHERE is_verified = true;

-- =====================================================
-- 9. MATERIALIZED VIEW FOR LEADERBOARD
-- Cached karma rankings
-- =====================================================
DROP MATERIALIZED VIEW IF EXISTS karma_leaderboard;
CREATE MATERIALIZED VIEW karma_leaderboard AS
SELECT 
    id,
    display_name,
    username,
    avatar_url,
    karma_score,
    karma_tier,
    total_contributions,
    RANK() OVER (ORDER BY karma_score DESC) as rank
FROM profiles
WHERE is_active = true AND karma_score > 0
ORDER BY karma_score DESC
LIMIT 100;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_id ON karma_leaderboard(id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON karma_leaderboard(rank);

-- Function to refresh leaderboard (call periodically)
CREATE OR REPLACE FUNCTION refresh_leaderboard() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY karma_leaderboard;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. ADMIN AUDIT LOG
-- Track all admin actions
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON admin_audit_log(target_table, target_id);

-- RLS for audit log (only admins can view)
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON admin_audit_log FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Function to log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_action TEXT,
    p_target_table TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_audit_log (admin_id, action, target_table, target_id, old_values, new_values)
    VALUES (auth.uid(), p_action, p_target_table, p_target_id, p_old_values, p_new_values)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION award_karma_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
GRANT SELECT ON karma_leaderboard TO authenticated, anon;
GRANT SELECT ON categories TO authenticated, anon;
