-- =====================================================
-- SCHEMA REFINEMENTS
-- Migration 010 - User Feedback Updates
-- =====================================================

-- =====================================================
-- THE VAULT CHANGES
-- =====================================================

-- 1. Convert tag_brand from TEXT to TEXT[] for multiple tags
ALTER TABLE the_vault 
ALTER COLUMN tag_brand TYPE TEXT[] USING ARRAY[tag_brand]::TEXT[];

-- 2. Add original_contributor (creator who first added the entry)
-- Note: created_by already exists, we'll rename/clarify it
COMMENT ON COLUMN the_vault.created_by IS 'Original contributor who created this vault entry';

-- 3. Add maintainer (user with most approved edits)
ALTER TABLE the_vault 
ADD COLUMN IF NOT EXISTS maintainer_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN the_vault.maintainer_id IS 'User with the most approved edits for this entry';

-- 4. Update body_type to use specific allowed values
-- First drop the existing constraint if any
ALTER TABLE the_vault DROP CONSTRAINT IF EXISTS the_vault_body_type_check;

-- Clean up existing data: set invalid body_type values to NULL or map them
UPDATE the_vault 
SET body_type = CASE 
    WHEN LOWER(body_type) IN ('t-shirt', 'tshirt', 't shirt', 'tee') THEN 't-shirt'
    WHEN LOWER(body_type) IN ('long-sleeve', 'longsleeve', 'long sleeve', 'ls') THEN 'long-sleeve'
    WHEN LOWER(body_type) IN ('cutoff', 'cut-off', 'cut off') THEN 'cutoff'
    WHEN LOWER(body_type) IN ('jacket') THEN 'jacket'
    WHEN LOWER(body_type) IN ('hoodie', 'hoody') THEN 'hoodie'
    WHEN LOWER(body_type) IN ('sweater', 'sweatshirt') THEN 'sweater'
    WHEN LOWER(body_type) IN ('raglan', 'baseball') THEN 'raglan'
    WHEN body_type IS NOT NULL THEN 'other'
    ELSE NULL
END
WHERE body_type IS NOT NULL 
  AND body_type NOT IN ('t-shirt', 'long-sleeve', 'cutoff', 'jacket', 'hoodie', 'sweater', 'raglan', 'other');

-- Now add the constraint
ALTER TABLE the_vault 
ADD CONSTRAINT the_vault_body_type_check 
CHECK (body_type IS NULL OR body_type IN ('t-shirt', 'long-sleeve', 'cutoff', 'jacket', 'hoodie', 'sweater', 'raglan', 'other'));

-- 5. Remove material column from the_vault
ALTER TABLE the_vault DROP COLUMN IF EXISTS material;

-- =====================================================
-- USER INVENTORY CHANGES
-- =====================================================

-- 1. Remove tag_condition
ALTER TABLE user_inventory DROP COLUMN IF EXISTS tag_condition;

-- 2. Add new columns
ALTER TABLE user_inventory 
ADD COLUMN IF NOT EXISTS tag TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS body_type TEXT,
ADD COLUMN IF NOT EXISTS flaws TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add constraint for body_type on inventory matching vault options
ALTER TABLE user_inventory DROP CONSTRAINT IF EXISTS user_inventory_body_type_check;
ALTER TABLE user_inventory 
ADD CONSTRAINT user_inventory_body_type_check 
CHECK (body_type IS NULL OR body_type IN ('t-shirt', 'long-sleeve', 'cutoff', 'jacket', 'hoodie', 'sweater', 'raglan', 'other'));

-- =====================================================
-- FUNCTION: Update maintainer on edit approval
-- =====================================================

CREATE OR REPLACE FUNCTION update_vault_maintainer()
RETURNS TRIGGER AS $$
DECLARE
    v_top_contributor UUID;
BEGIN
    -- When an edit is approved, recalculate who has the most approved edits
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        SELECT user_id INTO v_top_contributor
        FROM edit_proposals
        WHERE vault_item_id = NEW.vault_item_id
          AND status = 'approved'
        GROUP BY user_id
        ORDER BY COUNT(*) DESC
        LIMIT 1;
        
        IF v_top_contributor IS NOT NULL THEN
            UPDATE the_vault 
            SET maintainer_id = v_top_contributor
            WHERE id = NEW.vault_item_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_maintainer ON edit_proposals;
CREATE TRIGGER trigger_update_maintainer
    AFTER UPDATE ON edit_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_maintainer();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN user_inventory.tag IS 'Tag brand on this specific item (may differ from vault reference)';
COMMENT ON COLUMN user_inventory.material IS 'Fabric composition of this specific item';
COMMENT ON COLUMN user_inventory.body_type IS 'Garment type: t-shirt, long-sleeve, cutoff, jacket, hoodie, sweater, raglan, other';
COMMENT ON COLUMN user_inventory.flaws IS 'Description of any flaws, damage, or wear';
COMMENT ON COLUMN user_inventory.description IS 'General notes about this specific item';
