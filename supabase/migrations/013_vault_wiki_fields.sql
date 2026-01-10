-- =====================================================
-- VAULT WIKI FIELDS
-- Migration 013 - Wiki Description & Search
-- =====================================================

-- 1. Add description field for Wiki content
ALTER TABLE the_vault 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN the_vault.description IS 'Detailed wiki-style description and history of the item';

-- 2. Add search_keywords for better discovery
ALTER TABLE the_vault 
ADD COLUMN IF NOT EXISTS search_keywords TEXT[];

COMMENT ON COLUMN the_vault.search_keywords IS 'Array of keywords to improve searchability (e.g. alternate names, tours, eras)';

-- 3. Create a text search index on subject and description
-- This allows for fast full-text search across title and body
CREATE INDEX IF NOT EXISTS idx_vault_search_text 
ON the_vault USING GIN (to_tsvector('english', subject || ' ' || COALESCE(description, '')));

-- 4. Update RLS to ensure these new fields are viewable (already covered by existing policy, but good to verify)
-- Existing policy: "Vault is viewable by everyone" (USING true) covers all columns.
