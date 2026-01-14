-- Fix Stage Mismatches
-- Corrects companies marked as Series C+ (stage 5) but seeking Seed/Series A amounts
-- Updates stage based on funding amounts and raise_amount text

-- STEP 1: Preview companies with stage mismatches (Series C+ but early-stage amounts)
SELECT 
  id,
  name,
  stage,
  CASE 
    WHEN stage = 5 THEN 'Series C+' 
    ELSE 'Stage ' || stage 
  END as current_stage_label,
  raise_amount,
  raise_type,
  website,
  total_god_score,
  CASE
    WHEN raise_amount IS NULL THEN NULL
    WHEN raise_amount ILIKE '%Seed%' THEN 2  -- Seed
    WHEN raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$1.5M%', '%$2.5M%', '%$3.5M%']) THEN 2  -- Seed (<$5M)
    WHEN raise_amount ILIKE ANY(ARRAY['%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%']) THEN 3  -- Series A ($5M-$15M)
    WHEN raise_amount ILIKE ANY(ARRAY['%$20M%', '%$25M%', '%$30M%']) THEN 4  -- Series B ($20M-$30M)
    ELSE NULL  -- Unknown, leave as-is
  END as suggested_stage,
  CASE
    WHEN raise_amount IS NULL THEN 'No raise_amount data'
    WHEN raise_amount ILIKE '%Seed%' THEN 'Seed'
    WHEN raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$1.5M%', '%$2.5M%', '%$3.5M%']) THEN 'Seed (<$5M)'
    WHEN raise_amount ILIKE ANY(ARRAY['%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%']) THEN 'Series A ($5M-$15M)'
    WHEN raise_amount ILIKE ANY(ARRAY['%$20M%', '%$25M%', '%$30M%']) THEN 'Series B ($20M-$30M)'
    ELSE 'Unknown - review manually'
  END as suggested_stage_label
FROM startup_uploads
WHERE status = 'approved'
  AND stage = 5  -- Currently marked as Series C+
  AND raise_amount IS NOT NULL
  AND (
    raise_amount ILIKE '%Seed%'
    OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%', '%$1.5M%', '%$2.5M%', '%$3.5M%', '%$20M%', '%$25M%', '%$30M%'])
  )
ORDER BY name;

-- STEP 2: Count how many will be updated
SELECT 
  COUNT(*) FILTER (WHERE raise_amount ILIKE '%Seed%' OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$1.5M%', '%$2.5M%', '%$3.5M%'])) as seed_count,
  COUNT(*) FILTER (WHERE raise_amount ILIKE ANY(ARRAY['%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%'])) as series_a_count,
  COUNT(*) FILTER (WHERE raise_amount ILIKE ANY(ARRAY['%$20M%', '%$25M%', '%$30M%'])) as series_b_count,
  COUNT(*) as total_to_update
FROM startup_uploads
WHERE status = 'approved'
  AND stage = 5
  AND (
    raise_amount ILIKE '%Seed%'
    OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%', '%$1.5M%', '%$2.5M%', '%$3.5M%', '%$20M%', '%$25M%', '%$30M%'])
  );

-- STEP 3: Update stages based on funding amounts
UPDATE startup_uploads
SET 
  stage = CASE
    WHEN raise_amount ILIKE '%Seed%' THEN 2  -- Seed
    WHEN raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$1.5M%', '%$2.5M%', '%$3.5M%']) THEN 2  -- Seed (<$5M)
    WHEN raise_amount ILIKE ANY(ARRAY['%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%']) THEN 3  -- Series A ($5M-$15M)
    WHEN raise_amount ILIKE ANY(ARRAY['%$20M%', '%$25M%', '%$30M%']) THEN 4  -- Series B ($20M-$30M)
    ELSE stage  -- Keep current stage if amount doesn't match patterns
  END,
  admin_notes = COALESCE(admin_notes || ' | ', '') || 'Stage corrected: Was Series C+ but funding amount indicates earlier stage'
WHERE status = 'approved'
  AND stage = 5  -- Currently marked as Series C+
  AND (
    raise_amount ILIKE '%Seed%'
    OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%', '%$1.5M%', '%$2.5M%', '%$3.5M%', '%$20M%', '%$25M%', '%$30M%'])
  )
  AND (
    -- Only update if we can determine a valid stage
    raise_amount ILIKE '%Seed%'
    OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$5M%', '%$6M%', '%$7M%', '%$8M%', '%$9M%', '%$10M%', '%$12M%', '%$15M%', '%$1.5M%', '%$2.5M%', '%$3.5M%', '%$20M%', '%$25M%', '%$30M%'])
  );

-- STEP 4: Verify the updates
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
  END as corrected_stage_label,
  raise_amount,
  raise_type,
  website,
  admin_notes,
  updated_at
FROM startup_uploads
WHERE id IN (
  SELECT id 
  FROM startup_uploads 
  WHERE status = 'approved'
    AND admin_notes LIKE '%Stage corrected: Was Series C+%'
)
ORDER BY name;

-- STEP 5: Final check - should be no Series C+ companies with Seed amounts
SELECT 
  COUNT(*) as remaining_mismatches
FROM startup_uploads
WHERE status = 'approved'
  AND stage = 5
  AND (
    raise_amount ILIKE '%Seed%'
    OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$1.5M%', '%$2.5M%', '%$3.5M%'])
  );
