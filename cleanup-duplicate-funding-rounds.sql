-- Clean up duplicate funding rounds
-- Run this in Supabase SQL Editor

-- First, see duplicates
SELECT 
  su.name,
  fr.round_type,
  fr.amount,
  fr.date,
  COUNT(*) as duplicate_count
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
GROUP BY su.id, su.name, fr.round_type, fr.amount, fr.date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Remove duplicates, keeping the most recent one
-- This deletes duplicates based on startup_id, round_type, amount, and date
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

-- Verify cleanup
SELECT COUNT(*) as remaining_rounds FROM funding_rounds;

-- See final list
SELECT 
  su.name as startup_name,
  fr.round_type,
  fr.amount,
  fr.date,
  fr.source
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
ORDER BY fr.date DESC, su.name;





