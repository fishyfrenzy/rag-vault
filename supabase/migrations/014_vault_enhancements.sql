-- =====================================================
-- VAULT ENHANCEMENTS
-- Migration 014 - Year Ranges and Metadata
-- =====================================================

-- 1. Change year from INTEGER to TEXT to support ranges like "1988-1991"
-- We use a safe conversion that casts the existing integers to text
ALTER TABLE the_vault 
ALTER COLUMN year TYPE TEXT USING year::TEXT;

COMMENT ON COLUMN the_vault.year IS 'Year of release or manufacture. Supports single years (1990) or ranges (1990-1992)';

-- 2. Ensure origin does not have restrictive checks (it's already text, but good to verify)
-- No action needed if it's just TEXT, but we can add a comment
COMMENT ON COLUMN the_vault.origin IS 'Country of origin (e.g. USA, UK) or specific city';
