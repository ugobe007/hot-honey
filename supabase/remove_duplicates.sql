-- Remove duplicate investors from the database
-- This keeps only the oldest entry for each investor name

-- First, let's see what duplicates exist
SELECT 
  name, 
  COUNT(*) as count,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM investors 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- To actually remove duplicates, uncomment and run this:
-- (It keeps the oldest record for each name and deletes the newer ones)

-- DELETE FROM investors
-- WHERE id IN (
--   SELECT id
--   FROM (
--     SELECT 
--       id,
--       name,
--       created_at,
--       ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as row_num
--     FROM investors
--   ) as ranked
--   WHERE row_num > 1
-- );

-- After running the DELETE, verify no duplicates remain:
-- SELECT 
--   name, 
--   COUNT(*) as count
-- FROM investors 
-- GROUP BY name 
-- HAVING COUNT(*) > 1;


-- ============================================
-- ALTERNATIVE: More aggressive approach
-- ============================================
-- If the above doesn't work, use this:

-- Step 1: Create a temporary table with IDs to keep (oldest for each name)
-- CREATE TEMP TABLE ids_to_keep AS
-- SELECT DISTINCT ON (name) id
-- FROM investors
-- ORDER BY name, created_at ASC;

-- Step 2: Delete everything NOT in that list
-- DELETE FROM investors
-- WHERE id NOT IN (SELECT id FROM ids_to_keep);

-- Step 3: Drop the temp table
-- DROP TABLE ids_to_keep;
