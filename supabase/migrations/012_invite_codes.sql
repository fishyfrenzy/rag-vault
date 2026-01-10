-- Invite Code System
-- Enable/disable via NEXT_PUBLIC_INVITE_ONLY=true environment variable

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);

-- RLS policies
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (for signup)
DROP POLICY IF EXISTS "Anyone can check valid codes" ON invite_codes;
CREATE POLICY "Anyone can check valid codes"
    ON invite_codes FOR SELECT
    USING (used_by IS NULL);

-- Users can view their own codes
DROP POLICY IF EXISTS "Users can view own codes" ON invite_codes;
CREATE POLICY "Users can view own codes"
    ON invite_codes FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

-- Users can update codes they own (to mark as used)
DROP POLICY IF EXISTS "Users can claim codes" ON invite_codes;
CREATE POLICY "Users can claim codes"
    ON invite_codes FOR UPDATE
    TO authenticated
    USING (used_by IS NULL)
    WITH CHECK (used_by = auth.uid());

-- System can insert codes (via service role)
DROP POLICY IF EXISTS "Service role can insert codes" ON invite_codes;
CREATE POLICY "Service role can insert codes"
    ON invite_codes FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create invite codes for a user
CREATE OR REPLACE FUNCTION create_user_invite_codes(user_id UUID, num_codes INT DEFAULT 2)
RETURNS VOID AS $$
DECLARE
    i INT;
    new_code TEXT;
BEGIN
    FOR i IN 1..num_codes LOOP
        LOOP
            new_code := generate_invite_code();
            BEGIN
                INSERT INTO invite_codes (code, created_by)
                VALUES (new_code, user_id);
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- Try again with new code
            END;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate 10 admin invite codes (created_by = NULL means admin code)
DO $$
DECLARE
    i INT;
    new_code TEXT;
BEGIN
    FOR i IN 1..10 LOOP
        LOOP
            new_code := (
                SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1), '')
                FROM generate_series(1, 8)
            );
            BEGIN
                INSERT INTO invite_codes (code, created_by)
                VALUES (new_code, NULL);
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- Try again
            END;
        END LOOP;
    END LOOP;
END $$;
