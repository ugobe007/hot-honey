-- SAFE Cleanup: Remove Duplicate Funding Rounds
-- Run each step separately in Supabase SQL Editor

-- STEP 1: See what duplicates exist (run this first to verify)
SELECT 
  su.name,
  fr.round_type,
  fr.amount,
  fr.date,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(fr.id) as duplicate_ids
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
GROUP BY su.id, su.name, fr.round_type, fr.amount, fr.date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- STEP 2: See which specific records will be deleted (review before deleting)
SELECT 
  fr.id,
  su.name,
  fr.round_type,
  fr.amount,
  fr.date,
  fr.created_at,
  ROW_NUMBER() OVER (
    PARTITION BY fr.startup_id, fr.round_type, fr.amount, fr.date 
    ORDER BY fr.created_at DESC
  ) as keep_rank
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
WHERE (fr.startup_id, fr.round_type, fr.amount, fr.date) IN (
  SELECT startup_id, round_type, amount, date
  FROM funding_rounds
  GROUP BY startup_id, round_type, amount, date
  HAVING COUNT(*) > 1
)
ORDER BY su.name, fr.date, keep_rank;

-- STEP 3: Delete duplicates (only run after reviewing STEP 2)
-- This keeps the most recent entry (highest created_at) and deletes the rest
DELETE FROM funding_rounds
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY startup_id, round_type, amount, date 
        ORDER BY created_at DESC
      ) as rn
    FROM funding_rounds
  ) t
  WHERE t.rn > 1  -- Keep row 1 (most recent), delete the rest
);

-- STEP 4: Verify cleanup worked
SELECT 
  su.name as startup_name,
  fr.round_type,
  fr.amount,
  fr.date,
  fr.source
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY su.name, fr.date DESC;

-- STEP 5: Final count
SELECT COUNT(*) as total_rounds FROM funding_rounds;





