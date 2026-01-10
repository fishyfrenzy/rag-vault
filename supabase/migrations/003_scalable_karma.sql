-- =====================================================
-- SCALABLE KARMA & REPUTATION SYSTEM
-- Migration 003 - Enhanced Schema
-- =====================================================

-- Add karma tier and stats to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS karma_tier TEXT DEFAULT 'newcomer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_contributions INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reputation_multiplier FLOAT DEFAULT 1.0;

-- =====================================================
-- VOTES TABLE
-- For upvoting/downvoting vault items and edits
-- =====================================================
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('vault_item', 'edit_proposal', 'contribution')),
  target_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

-- =====================================================
-- EDIT PROPOSALS TABLE
-- For permission-based editing workflow
-- =====================================================
CREATE TABLE IF NOT EXISTS edit_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_item_id UUID REFERENCES the_vault(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- =====================================================
-- KARMA TRANSACTIONS TABLE
-- Full audit log of all karma changes
-- =====================================================
CREATE TABLE IF NOT EXISTS karma_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- VOTE COUNTS ON VAULT (denormalized for performance)
-- =====================================================
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- =====================================================
-- INDEXES FOR SCALE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_tx_user ON karma_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_tx_created ON karma_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edit_proposals_status ON edit_proposals(status, created_at);
CREATE INDEX IF NOT EXISTS idx_edit_proposals_vault ON edit_proposals(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_profiles_karma ON profiles(karma_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(karma_tier);
CREATE INDEX IF NOT EXISTS idx_vault_score ON the_vault(score DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_transactions ENABLE ROW LEVEL SECURITY;

-- Votes policies
CREATE POLICY "Anyone can view votes" ON votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can change own votes" ON votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can remove own votes" ON votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Edit proposals policies
CREATE POLICY "Anyone can view edit proposals" ON edit_proposals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can propose edits" ON edit_proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending proposals" ON edit_proposals FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id AND status = 'pending');

-- Karma transactions policies (read-only for users, system writes)
CREATE POLICY "Users can view own karma history" ON karma_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTION: Calculate karma tier
-- =====================================================
CREATE OR REPLACE FUNCTION get_karma_tier(karma INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF karma >= 1000 THEN RETURN 'curator';
  ELSIF karma >= 500 THEN RETURN 'expert';
  ELSIF karma >= 200 THEN RETURN 'trusted';
  ELSIF karma >= 50 THEN RETURN 'contributor';
  ELSE RETURN 'newcomer';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCTION: Award karma (with audit log)
-- =====================================================
CREATE OR REPLACE FUNCTION award_karma(
  p_user_id UUID,
  p_action TEXT,
  p_points INTEGER,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert transaction log
  INSERT INTO karma_transactions (user_id, action, points, reference_type, reference_id, description)
  VALUES (p_user_id, p_action, p_points, p_reference_type, p_reference_id, p_description);
  
  -- Update user's karma and tier
  UPDATE profiles
  SET 
    karma_score = COALESCE(karma_score, 0) + p_points,
    karma_tier = get_karma_tier(COALESCE(karma_score, 0) + p_points),
    total_contributions = CASE WHEN p_points > 0 THEN COALESCE(total_contributions, 0) + 1 ELSE total_contributions END
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Handle vote (with karma effects)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Get the creator of the voted item
  IF NEW.target_type = 'vault_item' THEN
    SELECT created_by INTO v_creator_id FROM the_vault WHERE id = NEW.target_id;
    
    -- Update vault item vote counts
    IF NEW.vote_type = 'up' THEN
      UPDATE the_vault SET upvotes = upvotes + 1, score = upvotes - downvotes + 1 WHERE id = NEW.target_id;
    ELSE
      UPDATE the_vault SET downvotes = downvotes + 1, score = upvotes - downvotes - 1 WHERE id = NEW.target_id;
    END IF;
    
    -- Award/deduct karma to creator (not self-votes)
    IF v_creator_id IS NOT NULL AND v_creator_id != NEW.user_id THEN
      IF NEW.vote_type = 'up' THEN
        PERFORM award_karma(v_creator_id, 'vote_received', 1, 'vault_item', NEW.target_id, 'Upvote received');
      ELSE
        PERFORM award_karma(v_creator_id, 'vote_received', -1, 'vault_item', NEW.target_id, 'Downvote received');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for votes
DROP TRIGGER IF EXISTS trigger_handle_vote ON votes;
CREATE TRIGGER trigger_handle_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_vote();

-- =====================================================
-- FUNCTION: Handle vote removal
-- =====================================================
CREATE OR REPLACE FUNCTION handle_vote_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  IF OLD.target_type = 'vault_item' THEN
    SELECT created_by INTO v_creator_id FROM the_vault WHERE id = OLD.target_id;
    
    -- Reverse vault item vote counts
    IF OLD.vote_type = 'up' THEN
      UPDATE the_vault SET upvotes = upvotes - 1, score = upvotes - downvotes - 1 WHERE id = OLD.target_id;
    ELSE
      UPDATE the_vault SET downvotes = downvotes - 1, score = upvotes - downvotes + 1 WHERE id = OLD.target_id;
    END IF;
    
    -- Reverse karma (not self-votes)
    IF v_creator_id IS NOT NULL AND v_creator_id != OLD.user_id THEN
      IF OLD.vote_type = 'up' THEN
        PERFORM award_karma(v_creator_id, 'vote_removed', -1, 'vault_item', OLD.target_id, 'Upvote removed');
      ELSE
        PERFORM award_karma(v_creator_id, 'vote_removed', 1, 'vault_item', OLD.target_id, 'Downvote removed');
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_handle_vote_removal ON votes;
CREATE TRIGGER trigger_handle_vote_removal
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_vote_removal();
