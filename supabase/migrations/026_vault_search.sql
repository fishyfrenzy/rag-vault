-- =====================================================
-- VAULT FULL-TEXT SEARCH
-- Migration 026 - Improved Search with PostgreSQL FTS
-- =====================================================

-- 1. Add full-text search column
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create function to generate search vector with weighted fields
-- Handle NULL values, arrays, and edge cases properly
CREATE OR REPLACE FUNCTION vault_search_vector_update() RETURNS TRIGGER AS $$
DECLARE
    v_search tsvector;
    v_tag_text TEXT;
BEGIN
    -- Convert tag_brand array to text if it exists
    IF NEW.tag_brand IS NOT NULL THEN
        v_tag_text := array_to_string(NEW.tag_brand, ' ');
    ELSE
        v_tag_text := '';
    END IF;

    -- Build search vector with proper null handling
    v_search := 
        -- Weight A: Most important (subject, title, brand)
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'A') ||
        -- Weight B: Important (description, category, tag_brand)
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
        setweight(to_tsvector('english', v_tag_text), 'B') ||
        -- Weight C: Secondary (body_type, year, stitch_type, origin)
        setweight(to_tsvector('english', COALESCE(NEW.body_type, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.year, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.stitch_type, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.origin, '')), 'C');
    
    NEW.search_vector := v_search;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger
DROP TRIGGER IF EXISTS vault_search_vector_update ON the_vault;
CREATE TRIGGER vault_search_vector_update
  BEFORE INSERT OR UPDATE ON the_vault
  FOR EACH ROW EXECUTE FUNCTION vault_search_vector_update();

-- 4. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_vault_search ON the_vault USING GIN(search_vector);

-- 5. Populate search_vector for all existing rows
-- Note: tag_brand is TEXT[] array, must be converted to text
UPDATE the_vault SET search_vector = 
    setweight(to_tsvector('english', COALESCE(subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(brand, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(tag_brand, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(body_type, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(year, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(stitch_type, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(origin, '')), 'C');

-- 6. Add comment
COMMENT ON COLUMN the_vault.search_vector IS 'Full-text search vector combining all searchable fields';
