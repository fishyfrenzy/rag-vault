-- =====================================================
-- FORUM SYSTEM
-- Migration 025 - Forum Categories, Threads, and Posts
-- =====================================================

-- 1. FORUM CATEGORIES
CREATE TABLE IF NOT EXISTS public.forum_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FORUM THREADS
CREATE TABLE IF NOT EXISTS public.forum_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL, -- The original post content
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    linked_vault_id UUID REFERENCES public.the_vault(id) ON DELETE SET NULL,
    last_post_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. FORUM POSTS (Replies)
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. UPDATE VOTES TABLE CHECK CONSTRAINT
-- We need to add 'forum_post' to the target_type check constraint
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_target_type_check;
ALTER TABLE public.votes ADD CONSTRAINT votes_target_type_check CHECK (target_type IN ('vault_item', 'edit_proposal', 'contribution', 'forum_post'));

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_forum_categories_slug ON forum_categories(slug);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_slug ON forum_threads(slug);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_post ON forum_threads(last_post_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON forum_posts(parent_post_id);

-- 6. RLS POLICIES
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Categories: Read for everyone, Write for admins
CREATE POLICY "Anyone can view active categories" ON forum_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON forum_categories
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Threads: Read for everyone, Write for authenticated
CREATE POLICY "Anyone can view threads" ON forum_threads
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create threads" ON forum_threads
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads" ON forum_threads
    FOR UPDATE TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can manage all threads" ON forum_threads
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Posts: Read for everyone, Write for authenticated
CREATE POLICY "Anyone can view posts" ON forum_posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON forum_posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts" ON forum_posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can manage all posts" ON forum_posts
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 7. TRIGGERS FOR TIMESTAMPS
CREATE TRIGGER update_forum_categories_timestamp BEFORE UPDATE ON forum_categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_forum_threads_timestamp BEFORE UPDATE ON forum_threads FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_forum_posts_timestamp BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 8. KARMA INTEGRATION (Extend handle_vote function)
CREATE OR REPLACE FUNCTION handle_forum_post_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- We only handle forum_post here, the rest is handled by handle_vote
  IF NEW.target_type = 'forum_post' THEN
    SELECT author_id INTO v_creator_id FROM forum_posts WHERE id = NEW.target_id;
    
    -- Update post vote counts
    IF NEW.vote_type = 'up' THEN
      UPDATE forum_posts SET upvotes = upvotes + 1, score = upvotes - downvotes + 1 WHERE id = NEW.target_id;
    ELSE
      UPDATE forum_posts SET downvotes = downvotes + 1, score = upvotes - downvotes - 1 WHERE id = NEW.target_id;
    END IF;
    
    -- Award/deduct karma to creator (not self-votes)
    IF v_creator_id IS NOT NULL AND v_creator_id != NEW.user_id THEN
      IF NEW.vote_type = 'up' THEN
        PERFORM award_karma(v_creator_id, 'forum_upvote', 2, 'forum_post', NEW.target_id, 'Forum post upvote RECEIVED');
      ELSE
        PERFORM award_karma(v_creator_id, 'forum_downvote', -1, 'forum_post', NEW.target_id, 'Forum post downvote RECEIVED');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_forum_post_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_forum_post_vote();

-- Handle forum vote removal
CREATE OR REPLACE FUNCTION handle_forum_post_vote_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  IF OLD.target_type = 'forum_post' THEN
    SELECT author_id INTO v_creator_id FROM forum_posts WHERE id = OLD.target_id;
    
    -- Reverse post vote counts
    IF OLD.vote_type = 'up' THEN
      UPDATE forum_posts SET upvotes = upvotes - 1, score = upvotes - downvotes - 1 WHERE id = OLD.target_id;
    ELSE
      UPDATE forum_posts SET downvotes = downvotes - 1, score = upvotes - downvotes + 1 WHERE id = OLD.target_id;
    END IF;
    
    -- Reverse karma (not self-votes)
    IF v_creator_id IS NOT NULL AND v_creator_id != OLD.user_id THEN
      IF OLD.vote_type = 'up' THEN
        PERFORM award_karma(v_creator_id, 'forum_vote_removed', -2, 'forum_post', OLD.target_id, 'Forum post upvote REMOVED');
      ELSE
        PERFORM award_karma(v_creator_id, 'forum_vote_removed', 1, 'forum_post', OLD.target_id, 'Forum post downvote REMOVED');
      END IF;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_handle_forum_post_vote_removal
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_forum_post_vote_removal();

-- 10. HELPER FUNCTIONS

-- Function to increment thread view count
CREATE OR REPLACE FUNCTION public.increment_thread_views(t_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE forum_threads 
    SET view_count = view_count + 1 
    WHERE id = t_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate unique slug from thread title
CREATE OR REPLACE FUNCTION generate_thread_slug(p_title TEXT)
RETURNS TEXT AS $$
DECLARE
    v_slug TEXT;
    v_count INTEGER := 0;
    v_base_slug TEXT;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    v_base_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9\s-]', '', 'g'));
    v_base_slug := regexp_replace(v_base_slug, '\s+', '-', 'g');
    v_base_slug := regexp_replace(v_base_slug, '-+', '-', 'g');
    v_base_slug := trim(both '-' from v_base_slug);
    
    v_slug := v_base_slug;
    
    -- Check for uniqueness
    WHILE EXISTS (SELECT 1 FROM forum_threads WHERE slug = v_slug) LOOP
        v_count := v_count + 1;
        v_slug := v_base_slug || '-' || v_count;
    END LOOP;
    
    RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- 11. ACTIVITY FEED INTEGRATION

-- Function to log forum thread creation
CREATE OR REPLACE FUNCTION log_forum_thread_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name)
  VALUES (NEW.author_id, 'thread_created', 'forum_thread', NEW.id, NEW.title);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_forum_thread_creation
  AFTER INSERT ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION log_forum_thread_creation();

-- Function to log forum post creation and update thread's last_post_at
CREATE OR REPLACE FUNCTION log_forum_post_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_title TEXT;
BEGIN
  SELECT title INTO v_thread_title FROM forum_threads WHERE id = NEW.thread_id;

  INSERT INTO activity_feed (user_id, action_type, target_type, target_id, target_name)
  VALUES (NEW.author_id, 'post_created', 'forum_post', NEW.id, v_thread_title);
  
  -- Update thread's last_post_at
  UPDATE forum_threads 
  SET last_post_at = NEW.created_at 
  WHERE id = NEW.thread_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_forum_post_creation
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION log_forum_post_creation();

-- Update log_vote to handle forum_post target name
CREATE OR REPLACE FUNCTION log_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_target_name TEXT;
BEGIN
  -- Get the name of what was voted on
  IF NEW.target_type = 'vault_item' THEN
    SELECT subject INTO v_target_name FROM the_vault WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'forum_post' THEN
    SELECT t.title INTO v_target_name 
    FROM forum_threads t 
    JOIN forum_posts p ON t.id = p.thread_id 
    WHERE p.id = NEW.target_id;
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

GRANT EXECUTE ON FUNCTION increment_thread_views TO authenticated, anon;
GRANT EXECUTE ON FUNCTION generate_thread_slug TO authenticated;

-- 12. SEED CATEGORIES
INSERT INTO forum_categories (name, slug, description, icon, color, display_order) VALUES
    ('General Discussion', 'general', 'General talk about vintage t-shirts and the community.', '💬', 'blue', 1),
    ('Authentication Help', 'authentication', 'Post photos and ask for help authenticating your vintage pieces.', '🔍', 'purple', 2),
    ('Buy/Sell/Trade', 'marketplace', 'The place to find your next grail or move some inventory.', '🤝', 'green', 3),
    ('Collection Showcase', 'showcase', 'Show off your curated collection and recent finds.', '✨', 'yellow', 4),
    ('Tag ID Guide', 'tag-id', 'Deep dives into tag dating and brand identification.', '🏷️', 'red', 5),
    ('Market Talk', 'market', 'Discuss pricing, trends, and the vintage business.', '📈', 'orange', 6)
ON CONFLICT (slug) DO NOTHING;
