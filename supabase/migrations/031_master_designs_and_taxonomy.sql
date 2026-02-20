-- =====================================================
-- PILLAR 2: DATABASE OVERHAUL (TAXONOMY & MASTER DESIGNS)
-- Migration 031
-- =====================================================

-- =====================================================
-- 1. STANDARDIZED TAXONOMY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS shirt_cuts (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shirt_eras (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    year_start INTEGER,
    year_end INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS print_methods (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed basic taxonomy data based on common vintage shirt knowledge
INSERT INTO shirt_cuts (name, slug, description) VALUES
    ('Standard Tee', 'standard-tee', 'Standard short sleeve t-shirt cut.'),
    ('Long Sleeve', 'long-sleeve', 'Standard long sleeve t-shirt.'),
    ('Tank Top', 'tank-top', 'Sleeveless tank top or muscle tee.'),
    ('Baseball Tee', 'baseball-tee', 'Raglan sleeve 3/4 length tee.'),
    ('Ringer Tee', 'ringer-tee', 'T-shirt with contrast ribbing on collar and cuffs.'),
    ('Polo', 'polo', 'Collared short sleeve shirt.'),
    ('Sweatshirt', 'sweatshirt', 'Long sleeve fleece pullover.'),
    ('Hoodie', 'hoodie', 'Hooded sweatshirt.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO shirt_eras (name, slug, year_start, year_end) VALUES
    ('1960s', '1960s', 1960, 1969),
    ('1970s', '1970s', 1970, 1979),
    ('1980s', '1980s', 1980, 1989),
    ('1990s', '1990s', 1990, 1999),
    ('Y2K / 2000s', '2000s', 2000, 2009),
    ('Modern (2010+)', 'modern', 2010, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO print_methods (name, slug, description) VALUES
    ('Screen Print (Plastisol)', 'screen-print-plastisol', 'Thick, opaque ink that sits on top of the fabric.'),
    ('Screen Print (Water Based)', 'screen-print-water-based', 'Soft ink that dyes the fabric fibers.'),
    ('Flock', 'flock', 'Velvet-like textured print.'),
    ('Puff Print', 'puff-print', 'Raised, 3D foam-like print.'),
    ('Iron-On / Heat Transfer', 'heat-transfer', 'Printed vinyl or paper bonded with heat.'),
    ('Embroidery', 'embroidery', 'Stitched design.')
ON CONFLICT (slug) DO NOTHING;

-- RLS for public read
ALTER TABLE shirt_cuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shirt_cuts" ON shirt_cuts FOR SELECT USING (true);

ALTER TABLE shirt_eras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read shirt_eras" ON shirt_eras FOR SELECT USING (true);

ALTER TABLE print_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read print_methods" ON print_methods FOR SELECT USING (true);


-- =====================================================
-- 2. MASTER DESIGNS TABLE
-- Aggregates individual vault items into a definitive catalog entry
-- =====================================================

CREATE TABLE IF NOT EXISTS master_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    brand TEXT,
    title TEXT,
    slug TEXT UNIQUE,
    category TEXT, -- Or could reference categories table if that exists
    year_start INTEGER,
    year_end INTEGER,
    tag_brand TEXT,
    reference_image_url TEXT,
    description TEXT,
    search_vector TSVECTOR,
    average_price INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Search functionality on master designs
CREATE OR REPLACE FUNCTION master_designs_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER master_designs_search_trig
    BEFORE INSERT OR UPDATE ON master_designs
    FOR EACH ROW EXECUTE FUNCTION master_designs_search_update();

CREATE INDEX IF NOT EXISTS idx_master_designs_fts ON master_designs USING GIN(search_vector);

-- Automatic updated_at
CREATE TRIGGER update_master_designs_timestamp 
    BEFORE UPDATE ON master_designs 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- RLS for Master Designs
ALTER TABLE master_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read master_designs" ON master_designs FOR SELECT USING (true);


-- =====================================================
-- 3. LINKING THE VAULT TO THE NEW TAXONOMY & MASTER DESIGNS
-- =====================================================

ALTER TABLE the_vault 
    ADD COLUMN IF NOT EXISTS master_design_id UUID REFERENCES master_designs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cut_id INTEGER REFERENCES shirt_cuts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS era_id INTEGER REFERENCES shirt_eras(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS print_method_id INTEGER REFERENCES print_methods(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys to speed up joins
CREATE INDEX IF NOT EXISTS idx_vault_master_design ON the_vault(master_design_id);
CREATE INDEX IF NOT EXISTS idx_vault_cut ON the_vault(cut_id);
CREATE INDEX IF NOT EXISTS idx_vault_era ON the_vault(era_id);
CREATE INDEX IF NOT EXISTS idx_vault_print_method ON the_vault(print_method_id);
