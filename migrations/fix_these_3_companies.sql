-- Fix the 3 Stage Mismatches
-- Updates Harmonic, Inversion Space, and RapidHub from Series C+ to Seed

-- STEP 1: Preview what will be changed
SELECT 
  id,
  name,
  stage as current_stage,
  'Series C+' as current_stage_label,
  raise_amount,
  2 as new_stage,
  'Seed' as new_stage_label
FROM startup_uploads
WHERE status = 'approved'
  AND stage = 5
  AND id IN (
    '68f9c770-94c2-475f-8d08-6d3a3d27a60a',  -- Harmonic
    'f2b239bb-3061-40ed-9c20-1a6e0c145d0f',  -- Inversion Space
    '0908c40d-c3b9-4e7e-b71a-0cd82fe28f2f'   -- RapidHub
  )
ORDER BY name;

-- STEP 2: Update all 3 companies to Seed (stage 2)
UPDATE startup_uploads
SET 
  stage = 2,  -- Seed
  admin_notes = COALESCE(admin_notes || ' | ', '') || 'Stage corrected: Was Series C+ but funding amount indicates Seed stage'
WHERE status = 'approved'
  AND stage = 5
  AND id IN (
    '68f9c770-94c2-475f-8d08-6d3a3d27a60a',  -- Harmonic
    'f2b239bb-3061-40ed-9c20-1a6e0c145d0f',  -- Inversion Space
    '0908c40d-c3b9-4e7e-b71a-0cd82fe28f2f'   -- RapidHub
  );

-- STEP 3: Verify the updates
SELECT 
  id,
  name,
  stage,
  CASE 
    WHEN stage = 2 THEN 'Seed'
    WHEN stage = 3 THEN 'Series A'
    WHEN stage = 4 THEN 'Series B'
    WHEN stage = 5 THEN 'Series C+'
    ELSE 'Stage ' || stage
  END as stage_label,
  raise_amount,
  website,
  admin_notes,
  updated_at
FROM startup_uploads
WHERE id IN (
    '68f9c770-94c2-475f-8d08-6d3a3d27a60a',  -- Harmonic
    'f2b239bb-3061-40ed-9c20-1a6e0c145d0f',  -- Inversion Space
    '0908c40d-c3b9-4e7e-b71a-0cd82fe28f2f'   -- RapidHub
  )
ORDER BY name;
