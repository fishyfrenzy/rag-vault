-- =====================================================
-- SEO FOUNDATIONS
-- Migration 020 - Slugs for Clean URLs
-- =====================================================

-- Add slug column
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index (slugs must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_slug ON the_vault(slug) WHERE slug IS NOT NULL;

-- Function to generate a slug from text
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT) RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Lowercase
    result := lower(input_text);
    
    -- Replace common special chars
    result := replace(result, '&', 'and');
    result := replace(result, '''', '');
    result := replace(result, '"', '');
    
    -- Replace non-alphanumeric with hyphens
    result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
    
    -- Remove leading/trailing hyphens
    result := trim(both '-' from result);
    
    -- Limit length
    result := left(result, 100);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create unique slug (appends number if duplicate)
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

-- Backfill slugs for existing items
DO $$
DECLARE
    rec RECORD;
    base_slug TEXT;
    final_slug TEXT;
BEGIN
    FOR rec IN SELECT id, subject, year FROM the_vault WHERE slug IS NULL LOOP
        -- Create slug from subject + year
        base_slug := generate_slug(rec.subject);
        IF rec.year IS NOT NULL AND rec.year != '' THEN
            base_slug := base_slug || '-' || regexp_replace(rec.year, '[^0-9]', '', 'g');
        END IF;
        
        -- Make it unique
        final_slug := create_unique_slug(base_slug, rec.id);
        
        -- Update the record
        UPDATE the_vault SET slug = final_slug WHERE id = rec.id;
    END LOOP;
END $$;

-- Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION auto_generate_slug() RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        base_slug := generate_slug(NEW.subject);
        IF NEW.year IS NOT NULL AND NEW.year != '' THEN
            base_slug := base_slug || '-' || regexp_replace(NEW.year, '[^0-9]', '', 'g');
        END IF;
        NEW.slug := create_unique_slug(base_slug, NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vault_auto_slug ON the_vault;
CREATE TRIGGER vault_auto_slug
    BEFORE INSERT ON the_vault
    FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
