-- =====================================================
-- ARTICLE SYSTEM
-- Migration 024 - Articles and Content Blocks
-- =====================================================

-- =====================================================
-- 1. ARTICLES TABLE
-- Core article metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    excerpt TEXT,
    hero_image_url TEXT,
    article_type TEXT DEFAULT 'find_of_the_week',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured_vault_id UUID REFERENCES the_vault(id) ON DELETE SET NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    view_count INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. ARTICLE BLOCKS TABLE
-- Flexible block-based content
-- =====================================================
CREATE TABLE IF NOT EXISTS article_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'vault_embed', 'quote', 'divider', 'heading')),
    content JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. ARTICLE TYPES REFERENCE
-- Normalize article types
-- =====================================================
CREATE TABLE IF NOT EXISTS article_types (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Seed default article types
INSERT INTO article_types (id, label, icon, description, display_order) VALUES
    ('find_of_the_week', 'Find of the Week', '🔥', 'Weekly featured vintage shirt discovery', 1),
    ('tag_guide', 'Tag Guide', '🏷️', 'Educational guide about vintage tag identification', 2),
    ('collection_spotlight', 'Collection Spotlight', '✨', 'Featured collector showcase', 3),
    ('authentication_tips', 'Authentication Tips', '🔍', 'Tips for authenticating vintage pieces', 4),
    ('market_trends', 'Market Trends', '📈', 'Vintage market analysis and trends', 5),
    ('general', 'General', '📝', 'General articles and announcements', 99)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. INDEXES
-- Optimize common queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(article_type);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured_vault_id) WHERE featured_vault_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_article_blocks_article ON article_blocks(article_id);
CREATE INDEX IF NOT EXISTS idx_article_blocks_order ON article_blocks(article_id, sort_order);

-- =====================================================
-- 5. TRIGGERS
-- Auto-update timestamps
-- =====================================================
DROP TRIGGER IF EXISTS update_articles_timestamp ON articles;
CREATE TRIGGER update_articles_timestamp 
    BEFORE UPDATE ON articles 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view published articles
CREATE POLICY "Anyone can view published articles" ON articles
    FOR SELECT USING (status = 'published');

-- Admins can do everything with articles
CREATE POLICY "Admins can manage all articles" ON articles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Authors can view and edit their own drafts
CREATE POLICY "Authors can manage own drafts" ON articles
    FOR ALL TO authenticated
    USING (author_id = auth.uid() AND status = 'draft')
    WITH CHECK (author_id = auth.uid());

-- Anyone can view blocks of published articles
CREATE POLICY "Anyone can view published article blocks" ON article_blocks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_blocks.article_id 
            AND articles.status = 'published'
        )
    );

-- Admins can manage all blocks
CREATE POLICY "Admins can manage all article blocks" ON article_blocks
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Authors can manage blocks of their own articles
CREATE POLICY "Authors can manage own article blocks" ON article_blocks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_blocks.article_id 
            AND articles.author_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM articles 
            WHERE articles.id = article_blocks.article_id 
            AND articles.author_id = auth.uid()
        )
    );

-- Everyone can view article types
CREATE POLICY "Anyone can view article types" ON article_types
    FOR SELECT USING (is_active = true);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Generate unique slug from title
CREATE OR REPLACE FUNCTION generate_article_slug(p_title TEXT)
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
    WHILE EXISTS (SELECT 1 FROM articles WHERE slug = v_slug) LOOP
        v_count := v_count + 1;
        v_slug := v_base_slug || '-' || v_count;
    END LOOP;
    
    RETURN v_slug;
END;
$$ LANGUAGE plpgsql;

-- Get latest published article by type
CREATE OR REPLACE FUNCTION get_latest_article(p_type TEXT DEFAULT NULL)
RETURNS SETOF articles AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM articles
    WHERE status = 'published'
      AND (p_type IS NULL OR article_type = p_type)
    ORDER BY published_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Increment view count
CREATE OR REPLACE FUNCTION increment_article_views(p_article_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE articles 
    SET view_count = view_count + 1 
    WHERE id = p_article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANTS
-- =====================================================
GRANT SELECT ON articles TO anon;
GRANT ALL ON articles TO authenticated;
GRANT SELECT ON article_blocks TO anon;
GRANT ALL ON article_blocks TO authenticated;
GRANT SELECT ON article_types TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_article_slug TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_article TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_article_views TO anon, authenticated;
