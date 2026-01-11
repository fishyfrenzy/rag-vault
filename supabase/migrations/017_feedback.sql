-- =====================================================
-- FEEDBACK SYSTEM
-- Migration 017 - User feedback submissions
-- =====================================================

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    page_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can submit feedback
CREATE POLICY "Authenticated users can submit feedback"
    ON feedback FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only the user can see their own feedback (optional, mostly for admin)
CREATE POLICY "Users can view own feedback"
    ON feedback FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
