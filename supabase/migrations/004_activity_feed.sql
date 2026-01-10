-- =====================================================
-- ACTIVITY FEED SYSTEM
-- Migration 004 - Unified Activity Feed
-- =====================================================

-- Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  -- Action types: 'create_entry', 'verify', 'upvote', 'downvote', 'edit_proposed', 
  --               'edit_approved', 'edit_rejected', 'list_for_sale', 'add_image'
  target_type TEXT NOT NULL, -- 'vault_item', 'inventory', 'edit_proposal'
  target_id UUID NOT NULL,
  target_name TEXT, -- Cached name for display (e.g., shirt subject)
  metadata JSONB DEFAULT '{}', -- Extra data (old/new values, points, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_target ON activity_feed(target_type, target_id);

-- RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view activity" ON activity_feed FOR SELECT USING (true);

-- =====================================================
-- TRIGGER: Log vault item creation
-- =====================================================
CREATE OR REPLACE FUNCTION log_vault_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name)
  VALUES (NEW.created_by, 'create_entry', 'vault_item', NEW.id, NEW.subject);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_vault_creation ON the_vault;
CREATE TRIGGER trigger_log_vault_creation
  AFTER INSERT ON the_vault
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION log_vault_creation();

-- =====================================================
-- TRIGGER: Log votes
-- =====================================================
CREATE OR REPLACE FUNCTION log_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_target_name TEXT;
BEGIN
  -- Get the name of what was voted on
  IF NEW.target_type = 'vault_item' THEN
    SELECT subject INTO v_target_name FROM the_vault WHERE id = NEW.target_id;
  END IF;

  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (
    NEW.user_id, 
    CASE WHEN NEW.vote_type = 'up' THEN 'upvote' ELSE 'downvote' END,
    NEW.target_type, 
    NEW.target_id, 
    v_target_name,
    jsonb_build_object('vote_type', NEW.vote_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_vote ON votes;
CREATE TRIGGER trigger_log_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION log_vote();

-- =====================================================
-- TRIGGER: Log contributions (verify, edit, add_image)
-- =====================================================
CREATE OR REPLACE FUNCTION log_contribution()
RETURNS TRIGGER AS $$
DECLARE
  v_target_name TEXT;
BEGIN
  SELECT subject INTO v_target_name FROM the_vault WHERE id = NEW.vault_item_id;

  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (
    NEW.user_id, 
    NEW.action,
    'vault_item', 
    NEW.vault_item_id, 
    v_target_name,
    jsonb_build_object('points', NEW.points)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_contribution ON contributions;
CREATE TRIGGER trigger_log_contribution
  AFTER INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION log_contribution();

-- =====================================================
-- TRIGGER: Log edit proposals
-- =====================================================
CREATE OR REPLACE FUNCTION log_edit_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_target_name TEXT;
BEGIN
  SELECT subject INTO v_target_name FROM the_vault WHERE id = NEW.vault_item_id;

  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (
    NEW.user_id, 
    'edit_proposed',
    'edit_proposal', 
    NEW.id, 
    v_target_name,
    jsonb_build_object('field', NEW.field_name, 'new_value', NEW.new_value)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_edit_proposal ON edit_proposals;
CREATE TRIGGER trigger_log_edit_proposal
  AFTER INSERT ON edit_proposals
  FOR EACH ROW
  EXECUTE FUNCTION log_edit_proposal();

-- =====================================================
-- TRIGGER: Log inventory listings
-- =====================================================
CREATE OR REPLACE FUNCTION log_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_target_name TEXT;
BEGIN
  SELECT subject INTO v_target_name FROM the_vault WHERE id = NEW.vault_item_id;

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

DROP TRIGGER IF EXISTS trigger_log_inventory ON user_inventory;
CREATE TRIGGER trigger_log_inventory
  AFTER INSERT ON user_inventory
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory();
