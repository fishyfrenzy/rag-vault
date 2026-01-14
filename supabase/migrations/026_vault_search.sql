-- =====================================================
-- VAULT SEARCH - HYBRID APPROACH
-- Migration 026 - pg_trgm + ILIKE for robust search
-- =====================================================

-- 1. Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create a normalized search text column (plain text for ILIKE)
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS search_text TEXT;

-- 3. Create function to normalize text (remove hyphens, lowercase)
CREATE OR REPLACE FUNCTION normalize_search_text(input TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF input IS NULL THEN
        RETURN '';
    END IF;
    -- Lowercase, replace hyphens/underscores with spaces, trim extra spaces
    RETURN LOWER(TRIM(REGEXP_REPLACE(REPLACE(REPLACE(input, '-', ' '), '_', ' '), '\s+', ' ', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Create trigger function to build search_text on insert/update
CREATE OR REPLACE FUNCTION update_vault_search_text() RETURNS TRIGGER AS $$
DECLARE
    v_tag_text TEXT := '';
    v_tags_text TEXT := '';
BEGIN
    -- Convert tag_brand array to text
    IF NEW.tag_brand IS NOT NULL AND array_length(NEW.tag_brand, 1) > 0 THEN
        v_tag_text := array_to_string(NEW.tag_brand, ' ');
    END IF;
    
    -- Convert tags array to text
    IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN
        v_tags_text := array_to_string(NEW.tags, ' ');
    END IF;
    
    -- Build normalized search text combining all fields
    NEW.search_text := 
        normalize_search_text(COALESCE(NEW.subject, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.title, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.brand, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.description, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.category, '')) || ' ' ||
        normalize_search_text(COALESCE(v_tag_text, '')) || ' ' ||
        normalize_search_text(COALESCE(v_tags_text, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.body_type, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.year, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.stitch_type, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.origin, ''));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
DROP TRIGGER IF EXISTS vault_search_text_update ON the_vault;
CREATE TRIGGER vault_search_text_update
  BEFORE INSERT OR UPDATE ON the_vault
  FOR EACH ROW EXECUTE FUNCTION update_vault_search_text();

-- 6. Create GIN trigram index for fast fuzzy/ILIKE matching
DROP INDEX IF EXISTS idx_vault_search_trgm;
CREATE INDEX idx_vault_search_trgm ON the_vault USING GIN(search_text gin_trgm_ops);

-- 7. Additional trigram indexes on key individual fields
CREATE INDEX IF NOT EXISTS idx_vault_subject_trgm ON the_vault USING GIN(subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vault_brand_trgm ON the_vault USING GIN(brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vault_title_trgm ON the_vault USING GIN(title gin_trgm_ops);

-- 8. Populate search_text for all existing rows
UPDATE the_vault SET search_text = 
    normalize_search_text(COALESCE(subject, '')) || ' ' ||
    normalize_search_text(COALESCE(title, '')) || ' ' ||
    normalize_search_text(COALESCE(brand, '')) || ' ' ||
    normalize_search_text(COALESCE(description, '')) || ' ' ||
    normalize_search_text(COALESCE(category, '')) || ' ' ||
    normalize_search_text(COALESCE(array_to_string(tag_brand, ' '), '')) || ' ' ||
    normalize_search_text(COALESCE(array_to_string(tags, ' '), '')) || ' ' ||
    normalize_search_text(COALESCE(body_type, '')) || ' ' ||
    normalize_search_text(COALESCE(year, '')) || ' ' ||
    normalize_search_text(COALESCE(stitch_type, '')) || ' ' ||
    normalize_search_text(COALESCE(origin, ''));

-- 9. Grant execute on normalize function
GRANT EXECUTE ON FUNCTION normalize_search_text TO authenticated, anon;

-- 10. Comment
COMMENT ON COLUMN the_vault.search_text IS 'Normalized plaintext for searching - combines all searchable fields with hyphens replaced by spaces';
