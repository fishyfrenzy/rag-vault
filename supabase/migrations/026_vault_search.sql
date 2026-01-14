-- =====================================================
-- VAULT FULL-TEXT SEARCH
-- Migration 026 - Improved Search with PostgreSQL FTS
-- =====================================================

-- 1. Add full-text search column
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create function to generate search vector with weighted fields
CREATE OR REPLACE FUNCTION vault_search_vector(r the_vault) 
RETURNS tsvector AS $$
BEGIN
  RETURN (
    -- Weight A: Most important (subject, title, brand)
    setweight(to_tsvector('english', coalesce(r.subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(r.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(r.brand, '')), 'A') ||
    -- Weight B: Important (description, category, tag_brand)
    setweight(to_tsvector('english', coalesce(r.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(r.category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(r.tag_brand, '')), 'B') ||
    -- Weight C: Secondary (body_type, year, stitch_type, origin)
    setweight(to_tsvector('english', coalesce(r.body_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(r.year, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(r.stitch_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(r.origin, '')), 'C')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Populate search_vector for all existing rows
UPDATE the_vault SET search_vector = vault_search_vector(the_vault.*);

-- 4. Create trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION update_vault_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := vault_search_vector(NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_search_vector_update ON the_vault;
CREATE TRIGGER vault_search_vector_update
  BEFORE INSERT OR UPDATE ON the_vault
  FOR EACH ROW EXECUTE FUNCTION update_vault_search_vector();

-- 5. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_vault_search ON the_vault USING GIN(search_vector);

-- 6. Create a search function for more flexible queries
CREATE OR REPLACE FUNCTION search_vault(search_query TEXT)
RETURNS SETOF the_vault AS $$
DECLARE
    tsquery_text TEXT;
BEGIN
    -- Handle empty search
    IF search_query IS NULL OR trim(search_query) = '' THEN
        RETURN QUERY SELECT * FROM the_vault ORDER BY verification_count DESC, created_at DESC;
        RETURN;
    END IF;
    
    -- Convert search query to tsquery format
    -- Replace hyphens and underscores with spaces, then join words with &
    tsquery_text := regexp_replace(trim(search_query), '[-_]+', ' ', 'g');
    tsquery_text := regexp_replace(tsquery_text, '\s+', ' & ', 'g');
    
    RETURN QUERY 
    SELECT * FROM the_vault 
    WHERE search_vector @@ to_tsquery('english', tsquery_text)
    ORDER BY 
        ts_rank(search_vector, to_tsquery('english', tsquery_text)) DESC,
        verification_count DESC
    LIMIT 100;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to simple ILIKE if tsquery parsing fails
        RETURN QUERY 
        SELECT * FROM the_vault 
        WHERE subject ILIKE '%' || search_query || '%'
           OR brand ILIKE '%' || search_query || '%'
           OR title ILIKE '%' || search_query || '%'
           OR body_type ILIKE '%' || search_query || '%'
        ORDER BY verification_count DESC
        LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_vault TO authenticated, anon;

-- 7. Add comment
COMMENT ON COLUMN the_vault.search_vector IS 'Full-text search vector combining all searchable fields';
