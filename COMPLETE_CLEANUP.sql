-- Complete Cleanup: Remove ALL Duplicates
-- Run this to clean up all duplicate funding rounds

-- Step 1: See what will be deleted
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

-- Step 2: Delete duplicates (keeps most recent, deletes older ones)
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
  WHERE t.rn > 1
);

-- Step 3: Verify results
SELECT 
  su.name as startup_name,
  fr.round_type,
  fr.amount,
  fr.date
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY su.name, fr.date DESC;

-- Step 4: Final count (should be 4)
SELECT COUNT(*) as total_rounds FROM funding_rounds;





