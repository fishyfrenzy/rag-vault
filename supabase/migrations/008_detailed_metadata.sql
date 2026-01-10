-- =====================================================
-- DETAILED SHIRT METADATA
-- Migration 008 - Professional Metadata
-- =====================================================

-- 1. Enhance the_vault with more master record details
ALTER TABLE the_vault 
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS origin TEXT, -- Country of origin
ADD COLUMN IF NOT EXISTS body_type TEXT; -- e.g. Tubular, Side-seamed

-- 2. Enhance user_inventory with specific item details
ALTER TABLE user_inventory
ADD COLUMN IF NOT EXISTS measurements JSONB, -- { "length": 72, "pit_to_pit": 54 }
ADD COLUMN IF NOT EXISTS tag_condition TEXT; -- Condition of the physical tag

-- 3. Update stitch_type check to be more comprehensive or just allow text
-- Current check: ('Single', 'Double', 'Other')
-- We'll keep it as is or expand if needed.

-- 4. Notify about added columns
COMMENT ON COLUMN the_vault.material IS 'Fabric composition (e.g. 100% Cotton)';
COMMENT ON COLUMN the_vault.origin IS 'Country where the shirt was manufactured';
COMMENT ON COLUMN user_inventory.measurements IS 'Item measurements in cm/inches';
