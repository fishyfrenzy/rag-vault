-- =====================================================
-- BRAND + TITLE SCHEMA
-- Migration 021 - Structured naming for SEO
-- =====================================================

-- Add brand and title columns
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS title TEXT;

-- Index for brand lookups (for brand pages)
CREATE INDEX IF NOT EXISTS idx_vault_brand ON the_vault(brand);
CREATE INDEX IF NOT EXISTS idx_vault_brand_title ON the_vault(brand, title);

-- Update slug generation to use brand-title instead of subject-year
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT) RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := lower(input_text);
    result := replace(result, '&', 'and');
    result := replace(result, '''', '');
    result := replace(result, '"', '');
    result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
    result := trim(both '-' from result);
    result := left(result, 100);
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update unique slug function
CREATE OR REPLACE FUNCTION create_unique_slug(base_slug TEXT, item_id UUID) RETURNS TEXT AS $$
DECLARE
    new_slug TEXT;
    counter INTEGER := 0;
BEGIN
    new_slug := base_slug;
    
    WHILE EXISTS (
        SELECT 1 FROM the_vault 
        WHERE slug = new_slug AND id != item_id
    ) LOOP
        counter := counter + 1;
        new_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Update auto-slug trigger to use brand + title
CREATE OR REPLACE FUNCTION auto_generate_slug() RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Prefer brand + title for slug
        IF NEW.brand IS NOT NULL AND NEW.brand != '' AND NEW.title IS NOT NULL AND NEW.title != '' THEN
            base_slug := generate_slug(NEW.brand || ' ' || NEW.title);
        ELSIF NEW.brand IS NOT NULL AND NEW.brand != '' THEN
            base_slug := generate_slug(NEW.brand);
        ELSE
            -- Fallback to subject
            base_slug := generate_slug(NEW.subject);
        END IF;
        
        NEW.slug := create_unique_slug(base_slug, COALESCE(NEW.id, gen_random_uuid()));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_auto_slug ON the_vault;
CREATE TRIGGER vault_auto_slug
    BEFORE INSERT OR UPDATE ON the_vault
    FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();

-- =====================================================
-- BACKFILL: Extract brand/title from existing subject
-- This is a best-effort extraction
-- =====================================================
-- For items without brand, try to extract from subject
-- This sets brand to first word(s) before common separators
UPDATE the_vault
SET 
    brand = CASE 
        -- If subject contains common patterns, extract brand
        WHEN subject ~ '^[A-Za-z0-9\-]+\s' THEN 
            -- Take first "word" (up to first space or separator)
            regexp_replace(subject, '\s.*$', '')
        ELSE subject
    END,
    title = CASE 
        WHEN subject ~ '^[A-Za-z0-9\-]+\s' THEN 
            -- Take everything after first word
            regexp_replace(subject, '^[A-Za-z0-9\-]+\s+', '')
        ELSE NULL
    END
WHERE brand IS NULL;

-- Regenerate slugs for items that now have brand+title
UPDATE the_vault
SET slug = NULL
WHERE brand IS NOT NULL AND title IS NOT NULL;

-- The trigger will regenerate slugs when we touch the rows
UPDATE the_vault
SET updated_at = now()
WHERE slug IS NULL;
