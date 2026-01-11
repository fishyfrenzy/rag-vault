-- =====================================================
-- FIX SLUG REGENERATION ON EDIT
-- Migration 023 - Regenerate slug when brand/title changes
-- =====================================================

-- Update auto-slug trigger to regenerate when brand/title changes
CREATE OR REPLACE FUNCTION auto_generate_slug() RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    should_regenerate BOOLEAN := FALSE;
BEGIN
    -- Regenerate slug if:
    -- 1. It's a new row (INSERT) with no slug
    -- 2. Brand or title has changed (UPDATE)
    IF TG_OP = 'INSERT' THEN
        should_regenerate := (NEW.slug IS NULL OR NEW.slug = '');
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if brand or title changed
        IF (COALESCE(OLD.brand, '') != COALESCE(NEW.brand, '')) OR 
           (COALESCE(OLD.title, '') != COALESCE(NEW.title, '')) THEN
            should_regenerate := TRUE;
        END IF;
    END IF;

    IF should_regenerate THEN
        -- Generate slug from brand + title
        IF NEW.brand IS NOT NULL AND NEW.brand != '' AND NEW.title IS NOT NULL AND NEW.title != '' THEN
            base_slug := generate_slug(NEW.brand || ' ' || NEW.title);
            -- Also update subject to match brand + title
            NEW.subject := NEW.brand || ' ' || NEW.title;
        ELSIF NEW.brand IS NOT NULL AND NEW.brand != '' THEN
            base_slug := generate_slug(NEW.brand);
            NEW.subject := NEW.brand;
        ELSE
            -- Fallback to subject
            base_slug := generate_slug(NEW.subject);
        END IF;
        
        NEW.slug := create_unique_slug(base_slug, COALESCE(NEW.id, gen_random_uuid()));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS vault_auto_slug ON the_vault;
CREATE TRIGGER vault_auto_slug
    BEFORE INSERT OR UPDATE ON the_vault
    FOR EACH ROW EXECUTE FUNCTION auto_generate_slug();
