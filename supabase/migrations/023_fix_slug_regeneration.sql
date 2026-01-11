-- =====================================================
-- FIX SLUG REGENERATION ON EDIT
-- Migration 023 - Regenerate slug when brand/title changes
-- =====================================================

-- Fix the trigger to regenerate when slug is NULL OR brand/title changed
CREATE OR REPLACE FUNCTION auto_generate_slug() RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
BEGIN
    -- Regenerate if slug is NULL/empty OR brand/title changed
    IF NEW.slug IS NULL OR NEW.slug = '' OR (
        TG_OP = 'UPDATE' AND (
            COALESCE(OLD.brand, '') != COALESCE(NEW.brand, '') OR 
            COALESCE(OLD.title, '') != COALESCE(NEW.title, '')
        )
    ) THEN
        IF NEW.brand IS NOT NULL AND NEW.brand != '' AND NEW.title IS NOT NULL AND NEW.title != '' THEN
            base_slug := generate_slug(NEW.brand || ' ' || NEW.title);
            NEW.subject := NEW.brand || ' ' || NEW.title;
        ELSIF NEW.brand IS NOT NULL AND NEW.brand != '' THEN
            base_slug := generate_slug(NEW.brand);
            NEW.subject := NEW.brand;
        ELSE
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

-- Regenerate all slugs that are NULL
UPDATE the_vault SET updated_at = now() WHERE slug IS NULL;
