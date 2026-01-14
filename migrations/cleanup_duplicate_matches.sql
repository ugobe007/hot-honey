-- Cleanup Duplicate Matches
-- Finds and removes duplicate startup-investor matches
-- Keeps the highest scoring match (or most recent if scores are equal)

-- STEP 1: Preview duplicates (run this first to see what will be removed)
SELECT 
  startup_id,
  investor_id,
  COUNT(*) as duplicate_count,
  MAX(match_score) as max_score,
  MIN(created_at) as oldest_match,
  MAX(created_at) as newest_match
FROM startup_investor_matches
GROUP BY startup_id, investor_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 100;

-- STEP 2: See total duplicates
SELECT 
  COUNT(*) as total_duplicate_pairs,
  SUM(duplicate_count) as total_duplicate_matches
FROM (
  SELECT 
    startup_id,
    investor_id,
    COUNT(*) as duplicate_count
  FROM startup_investor_matches
  GROUP BY startup_id, investor_id
  HAVING COUNT(*) > 1
) duplicates;

-- STEP 3: Delete duplicates (keeps the best match - highest score, then most recent)
-- This deletes all duplicates, keeping only the best match for each startup-investor pair
DELETE FROM startup_investor_matches
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY startup_id, investor_id 
        ORDER BY match_score DESC NULLS LAST, created_at DESC
      ) as rn
    FROM startup_investor_matches
  ) ranked
  WHERE rn > 1
);

-- STEP 4: Verify cleanup (should return 0 or very few duplicates)
SELECT 
  startup_id,
  investor_id,
  COUNT(*) as match_count
FROM startup_investor_matches
GROUP BY startup_id, investor_id
HAVING COUNT(*) > 1
ORDER BY match_count DESC
LIMIT 20;
