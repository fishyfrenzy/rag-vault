-- Migration: Replace year with year_start/year_end and add price guidance
-- Run this on Supabase SQL Editor

-- Step 1: Add new columns
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS year_start INTEGER;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS year_end INTEGER;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS estimated_value_low INTEGER;
ALTER TABLE the_vault ADD COLUMN IF NOT EXISTS estimated_value_high INTEGER;

-- Step 2: Migrate data from existing year column
-- Handle formats like: "1988", "1985, 1986, 1987, 1988", "1985-1988"

-- First, handle simple single years (e.g., "1988")
UPDATE the_vault SET
    year_start = (regexp_match(year, '^(\d{4})$'))[1]::INTEGER
WHERE year IS NOT NULL 
  AND year ~ '^\d{4}$';

-- Handle comma-separated years (e.g., "1985, 1986, 1987, 1988")
-- Extract first year as start, last as end
UPDATE the_vault SET
    year_start = (regexp_match(year, '(\d{4})'))[1]::INTEGER,
    year_end = (regexp_match(year, '(\d{4})[^0-9]*$'))[1]::INTEGER
WHERE year IS NOT NULL 
  AND year LIKE '%,%'
  AND year_start IS NULL;

-- Handle range format (e.g., "1985-1988" or "1985–1988")
UPDATE the_vault SET
    year_start = (regexp_match(year, '^(\d{4})'))[1]::INTEGER,
    year_end = (regexp_match(year, '[-–]\s*(\d{4})'))[1]::INTEGER
WHERE year IS NOT NULL 
  AND year ~ '\d{4}\s*[-–]\s*\d{4}'
  AND year_start IS NULL;

-- Handle remaining years that have at least one 4-digit number
UPDATE the_vault SET
    year_start = (regexp_match(year, '(\d{4})'))[1]::INTEGER
WHERE year IS NOT NULL 
  AND year ~ '\d{4}'
  AND year_start IS NULL;

-- If year_end equals year_start, set year_end to NULL (single year)
UPDATE the_vault SET year_end = NULL WHERE year_end = year_start;

-- Step 3: Verify migration (run this query to check before dropping)
-- SELECT id, year, year_start, year_end FROM the_vault WHERE year IS NOT NULL LIMIT 30;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN the_vault.year_start IS 'First year the shirt was produced';
COMMENT ON COLUMN the_vault.year_end IS 'Last year produced (null if single year)';
COMMENT ON COLUMN the_vault.estimated_value_low IS 'Low estimate in USD';
COMMENT ON COLUMN the_vault.estimated_value_high IS 'High estimate in USD';

-- Step 5: Drop old year column (ONLY after verifying migration worked!)
-- Uncomment this line after checking the data:
-- ALTER TABLE the_vault DROP COLUMN year;
