-- Profile Enhancements Migration
-- Adds customizable profile fields, visibility settings, achievements, and display slots

-- Extend profiles table with new fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_visibility JSONB DEFAULT '{"bio": true, "location": true, "age": false}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_preference TEXT DEFAULT 'all';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Title selection (type_tier format, e.g., 'karma_3' for Respected)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_title TEXT;

-- Profile display slots (3 slots, each can be: collection, shirts, or iso)
-- Format: [{"type": "collection", "id": "uuid"}, {"type": "shirts", "ids": ["uuid1", "uuid2"]}, {"type": "iso"}]
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_slots JSONB DEFAULT '[]'::jsonb;

-- Create achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('karma', 'edits', 'collection', 'sales')),
    tier INT NOT NULL CHECK (tier >= 1 AND tier <= 5),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_type, tier)
);

-- Enable RLS on achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are viewable by everyone
DO $$ BEGIN
    CREATE POLICY "Achievements are viewable by everyone"
        ON user_achievements FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own achievements
DO $$ BEGIN
    CREATE POLICY "System can insert achievements"
        ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ISO (In Search Of) List - user's wishlist of vault items
CREATE TABLE IF NOT EXISTS user_iso_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    vault_id UUID REFERENCES the_vault(id) NOT NULL,
    priority INT DEFAULT 1, -- 1=low, 2=medium, 3=high
    sort_order INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, vault_id)
);

-- Enable RLS on ISO list
ALTER TABLE user_iso_list ENABLE ROW LEVEL SECURITY;

-- ISO list viewable by everyone
DO $$ BEGIN
    CREATE POLICY "ISO list is viewable by everyone"
        ON user_iso_list FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can manage their own ISO list
DO $$ BEGIN
    CREATE POLICY "Users can manage own ISO list"
        ON user_iso_list FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_karma INT;
    v_edits INT;
    v_collection INT;
    v_sales INT;
    karma_thresholds INT[] := ARRAY[50, 200, 500, 1000, 5000];
    edit_thresholds INT[] := ARRAY[5, 20, 50, 100, 500];
    collection_thresholds INT[] := ARRAY[5, 20, 50, 100, 250];
    sales_thresholds INT[] := ARRAY[1, 5, 15, 50, 100];
    i INT;
BEGIN
    -- Get current stats
    SELECT COALESCE(karma_score, 0) INTO v_karma FROM profiles WHERE id = p_user_id;
    
    SELECT COUNT(*) INTO v_edits 
    FROM edit_proposals 
    WHERE proposed_by = p_user_id AND status = 'approved';
    
    SELECT COUNT(*) INTO v_collection 
    FROM user_inventory 
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Sales count
    SELECT COUNT(*) INTO v_sales 
    FROM user_inventory 
    WHERE user_id = p_user_id AND for_sale = false AND price IS NOT NULL;

    -- Check karma achievements
    FOR i IN 1..5 LOOP
        IF v_karma >= karma_thresholds[i] THEN
            INSERT INTO user_achievements (user_id, achievement_type, tier)
            VALUES (p_user_id, 'karma', i)
            ON CONFLICT (user_id, achievement_type, tier) DO NOTHING;
        END IF;
    END LOOP;

    -- Check edit achievements
    FOR i IN 1..5 LOOP
        IF v_edits >= edit_thresholds[i] THEN
            INSERT INTO user_achievements (user_id, achievement_type, tier)
            VALUES (p_user_id, 'edits', i)
            ON CONFLICT (user_id, achievement_type, tier) DO NOTHING;
        END IF;
    END LOOP;

    -- Check collection achievements
    FOR i IN 1..5 LOOP
        IF v_collection >= collection_thresholds[i] THEN
            INSERT INTO user_achievements (user_id, achievement_type, tier)
            VALUES (p_user_id, 'collection', i)
            ON CONFLICT (user_id, achievement_type, tier) DO NOTHING;
        END IF;
    END LOOP;

    -- Check sales achievements
    FOR i IN 1..5 LOOP
        IF v_sales >= sales_thresholds[i] THEN
            INSERT INTO user_achievements (user_id, achievement_type, tier)
            VALUES (p_user_id, 'sales', i)
            ON CONFLICT (user_id, achievement_type, tier) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check achievements when karma changes
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM check_achievements(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_update_check_achievements ON profiles;
CREATE TRIGGER on_profile_update_check_achievements
    AFTER UPDATE OF karma_score ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_achievements();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_iso_list_user_id ON user_iso_list(user_id);
