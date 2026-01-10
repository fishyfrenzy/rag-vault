-- Contributions table to track karma-earning actions
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vault_item_id UUID REFERENCES the_vault(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'edit', 'verify', 'add_image')),
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add verification count and creator to vault if not exists
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Enable RLS on contributions
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Policies for contributions
CREATE POLICY "Users can view all contributions"
  ON contributions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own contributions"
  ON contributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_vault ON contributions(vault_item_id);
CREATE INDEX IF NOT EXISTS idx_vault_verification ON the_vault(verification_count DESC);

-- Function to update karma score when contribution is added
CREATE OR REPLACE FUNCTION update_karma_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET karma_score = COALESCE(karma_score, 0) + NEW.points
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update karma
DROP TRIGGER IF EXISTS trigger_update_karma ON contributions;
CREATE TRIGGER trigger_update_karma
  AFTER INSERT ON contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_karma_on_contribution();
