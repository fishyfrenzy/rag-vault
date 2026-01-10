-- =====================================================
-- SCALING OPTIMIZATIONS
-- Migration 005 - Prepare for 100k+ Users
-- =====================================================

-- =====================================================
-- SOFT DELETES
-- Preserve data integrity, allow recovery
-- =====================================================

-- Add soft delete to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add soft delete to vault items
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add soft delete to inventory
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- Covering indexes for common query patterns
-- =====================================================

-- Vault search optimization (subject + category combo)
CREATE INDEX IF NOT EXISTS idx_vault_subject_category 
    ON the_vault(subject, category) 
    WHERE deleted_at IS NULL;

-- Vault listing by score (hot items)
CREATE INDEX IF NOT EXISTS idx_vault_active_score 
    ON the_vault(score DESC, created_at DESC) 
    WHERE deleted_at IS NULL AND is_active = true;

-- User inventory lookup
CREATE INDEX IF NOT EXISTS idx_inventory_user_active 
    ON user_inventory(user_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- Activity feed pagination (user-specific)
CREATE INDEX IF NOT EXISTS idx_activity_user_paginated 
    ON activity_feed(user_id, created_at DESC);

-- Activity feed pagination (global)
CREATE INDEX IF NOT EXISTS idx_activity_global_paginated 
    ON activity_feed(created_at DESC);

-- Contributions by user (for karma calculation)
CREATE INDEX IF NOT EXISTS idx_contributions_user_time 
    ON contributions(user_id, created_at DESC);

-- Edit proposals needing review
CREATE INDEX IF NOT EXISTS idx_edit_proposals_pending 
    ON edit_proposals(status, created_at) 
    WHERE status = 'pending';

-- Votes lookup for deduplication
CREATE INDEX IF NOT EXISTS idx_votes_lookup 
    ON votes(user_id, target_type, target_id);

-- =====================================================
-- FULL-TEXT SEARCH PREPARATION
-- Enable pg_trgm for fuzzy matching
-- =====================================================

-- Enable extension (requires superuser, may need to be done via Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for trigram search on subject (uncomment after enabling pg_trgm)
-- CREATE INDEX IF NOT EXISTS idx_vault_subject_trgm 
--     ON the_vault USING gin (subject gin_trgm_ops);

-- =====================================================
-- ACTIVITY FEED CLEANUP FUNCTION
-- Auto-purge old activity entries
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_activity()
RETURNS void AS $$
BEGIN
    DELETE FROM activity_feed 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Schedule this via Supabase cron or pg_cron
-- SELECT cron.schedule('cleanup-activity', '0 3 * * *', 'SELECT cleanup_old_activity()');

-- =====================================================
-- RATE LIMITING HELPER
-- Track API calls per user (for edge function rate limiting)
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER DEFAULT 1,
    UNIQUE(user_id, action, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
    ON rate_limits(user_id, action, window_start);

-- RLS for rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" 
    ON rate_limits FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- =====================================================
-- PROFILE STATS CACHE
-- Denormalized stats for fast profile loading
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vault_items_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inventory_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;

-- Function to update profile stats
CREATE OR REPLACE FUNCTION update_profile_stats(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE profiles SET
        vault_items_count = (SELECT COUNT(*) FROM the_vault WHERE created_by = p_user_id AND deleted_at IS NULL),
        inventory_count = (SELECT COUNT(*) FROM user_inventory WHERE user_id = p_user_id AND deleted_at IS NULL),
        sold_count = (SELECT COUNT(*) FROM user_inventory WHERE user_id = p_user_id AND for_sale = false AND deleted_at IS NOT NULL)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONNECTION POOLING NOTES
-- =====================================================
-- For 100k+ users, enable connection pooling in Supabase:
-- 1. Go to Project Settings > Database
-- 2. Enable "Connection Pooling"
-- 3. Use the pooler connection string for app connections
-- 4. Keep direct connection for migrations only

-- =====================================================
-- SCALING RECOMMENDATIONS (comments)
-- =====================================================
-- 1. Enable Read Replicas for read-heavy queries (vault browsing)
-- 2. Add Redis/Upstash for caching hot data (leaderboards, trending)
-- 3. Consider partitioning activity_feed by month if table grows > 10M rows
-- 4. Add CDN (Cloudflare) in front of Supabase Storage for images
