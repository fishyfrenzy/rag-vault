-- =====================================================
-- FIX: log_inventory function column name
-- Migration 009 - Bug Fix
-- =====================================================

-- The log_inventory() function references NEW.vault_item_id 
-- but user_inventory table has column named vault_id

CREATE OR REPLACE FUNCTION log_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_target_name TEXT;
BEGIN
  SELECT subject INTO v_target_name FROM the_vault WHERE id = NEW.vault_id;

  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (
    NEW.user_id, 
    CASE WHEN NEW.for_sale THEN 'list_for_sale' ELSE 'add_to_collection' END,
    'inventory', 
    NEW.id, 
    v_target_name,
    jsonb_build_object('size', NEW.size, 'condition', NEW.condition, 'price', NEW.price)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
