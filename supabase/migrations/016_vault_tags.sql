-- =====================================================
-- VAULT TAGS
-- Migration 016 - Add tags field
-- =====================================================

-- Add tags array column to the_vault
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS tags TEXT[];

COMMENT ON COLUMN the_vault.tags IS 'Array of user-defined tags for categorization (max 10)';
