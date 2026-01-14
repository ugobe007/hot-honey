-- Cleanup Duplicate Matches in startup_investor_matches table
-- Run this in Supabase SQL Editor to remove duplicates

-- Step 1: Find duplicates (same startup_id + investor_id)
SELECT 
  startup_id, 
  investor_id, 
  COUNT(*) as duplicate_count,
  array_agg(id) as match_ids,
  array_agg(match_score) as scores
FROM startup_investor_matches
GROUP BY startup_id, investor_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Step 2: Delete duplicates, keeping only the highest scoring match for each pair
-- This uses a CTE to identify rows to delete
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY startup_id, investor_id 
      ORDER BY match_score DESC, created_at DESC
    ) as row_num
  FROM startup_investor_matches
)
DELETE FROM startup_investor_matches
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Step 3: Verify no more duplicates
SELECT 
  COUNT(*) as total_matches,
  COUNT(DISTINCT CONCAT(startup_id, '-', investor_id)) as unique_pairs
FROM startup_investor_matches;

-- Step 4: Add unique constraint to prevent future duplicates (OPTIONAL - run separately if needed)
-- ALTER TABLE startup_investor_matches 
-- ADD CONSTRAINT unique_startup_investor_pair UNIQUE (startup_id, investor_id);
