-- Migration: Replace year with year_start/year_end and add price guidance
-- Run this on Supabase SQL Editor

-- Step 1: Add new columns
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS year_start INTEGER;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS year_end INTEGER;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS estimated_value_low INTEGER;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS estimated_value_high INTEGER;

-- Step 2: Migrate data from existing year column
-- Handle formats like: "1988", "1985, 1986, 1987, 1988", "1985-1988", "Late 80s" etc.
UPDATE the_vault SET
    year_start = CASE 
        -- Extract first 4-digit year found
        WHEN year ~ '\d{4}' THEN (regexp_match(year, '(\d{4})'))[1]::INTEGER
        ELSE NULL
    END,
    year_end = CASE 
        -- If comma-separated, get the last year
        WHEN year LIKE '%,%' THEN (
            SELECT MAX(y::INTEGER) 
            FROM regexp_matches(year, '(\d{4})', 'g') AS m(y)
        )
        -- If range with dash (1985-1988), get second year
        WHEN year ~ '\d{4}\s*[-–]\s*\d{4}' THEN (regexp_match(year, '\d{4}\s*[-–]\s*(\d{4})'))[1]::INTEGER
        ELSE NULL
    END
WHERE year IS NOT NULL;

-- Step 3: Verify migration (run this query first to check before dropping)
-- SELECT id, year, year_start, year_end FROM the_vault WHERE year IS NOT NULL LIMIT 20;

-- Step 4: Update search_text trigger to use new columns
CREATE OR REPLACE FUNCTION update_vault_search_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := 
        normalize_search_text(COALESCE(NEW.subject, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.brand, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.description, '')) || ' ' ||
        normalize_search_text(COALESCE(NEW.origin, '')) || ' ' ||
        normalize_search_text(COALESCE(array_to_string(NEW.tags, ' '), '')) || ' ' ||
        normalize_search_text(COALESCE(array_to_string(NEW.tag_brand, ' '), '')) || ' ' ||
        COALESCE(NEW.year_start::TEXT, '') || ' ' ||
        COALESCE(NEW.year_end::TEXT, '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Rebuild search_text for all rows
UPDATE the_vault SET updated_at = NOW();

-- Step 6: Add comments for documentation
COMMENT ON COLUMN the_vault.year_start IS 'First year the shirt was produced';
COMMENT ON COLUMN the_vault.year_end IS 'Last year produced (null if single year)';
COMMENT ON COLUMN the_vault.estimated_value_low IS 'Low estimate in USD';
COMMENT ON COLUMN the_vault.estimated_value_high IS 'High estimate in USD';

-- Step 7: Drop old year column (ONLY after verifying migration worked!)
-- Uncomment this line after checking the data:
-- ALTER TABLE the_vault DROP COLUMN year;
