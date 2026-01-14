-- Remove/Reject Merlin Energy
-- Company is not ready for [pyth] ai platform

-- STEP 1: Preview the company (verify it's the right one)
SELECT 
  id,
  name,
  tagline,
  website,
  status,
  total_god_score,
  created_at,
  admin_notes
FROM startup_uploads
WHERE name ILIKE '%merlin%energy%'
   OR website ILIKE '%merlinenergy%'
ORDER BY name;

-- STEP 2: Mark Merlin Energy as rejected
UPDATE startup_uploads
SET 
  status = 'rejected',
  admin_notes = COALESCE(admin_notes || ' | ', '') || 'Removed: Company not ready for [pyth] ai (owner request)'
WHERE name ILIKE '%merlin%energy%'
   OR website ILIKE '%merlinenergy%';

-- STEP 3: Verify the update
SELECT 
  id,
  name,
  website,
  status,
  admin_notes,
  updated_at
FROM startup_uploads
WHERE name ILIKE '%merlin%energy%'
   OR website ILIKE '%merlinenergy%';
