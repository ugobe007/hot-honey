-- Remove Lovable Duplicates - Simple Version
-- This removes the 2 duplicate Lovable entries, keeping the most recent one

-- First, see what we're deleting
SELECT 
  id,
  startup_id,
  round_type,
  amount,
  date,
  created_at
FROM funding_rounds
WHERE startup_id = (SELECT id FROM startup_uploads WHERE name = 'Lovable')
ORDER BY created_at DESC;

-- Delete the 2 older Lovable entries (keeping the most recent one)
-- This deletes entries where Lovable has the same amount ($330M) but different dates/types
DELETE FROM funding_rounds
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY startup_id, amount 
        ORDER BY created_at DESC
      ) as rn
    FROM funding_rounds
    WHERE startup_id = (SELECT id FROM startup_uploads WHERE name = 'Lovable')
    AND amount = 330000000
  ) t
  WHERE t.rn > 1  -- Keep the first (most recent), delete the rest
);

-- Verify: Should show only 1 Lovable entry now
SELECT 
  su.name,
  fr.round_type,
  fr.amount,
  fr.date
FROM funding_rounds fr
JOIN startup_uploads su ON su.id = fr.startup_id
WHERE su.name = 'Lovable'
ORDER BY fr.created_at DESC;

-- Final count: Should be 4 rounds now
SELECT COUNT(*) as total_rounds FROM funding_rounds;



