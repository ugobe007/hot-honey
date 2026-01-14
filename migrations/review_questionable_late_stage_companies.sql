-- Review Questionable Late-Stage Companies
-- Identifies companies with data quality issues or that appear to be invalid

-- STEP 1: Find companies with obvious data issues
SELECT 
  id,
  name,
  tagline,
  website,
  stage,
  CASE 
    WHEN stage = 5 THEN 'Series C+'
    WHEN stage IS NULL THEN 'Unknown/Null Stage'
    ELSE 'Stage ' || stage
  END as funding_stage_label,
  raise_type,
  raise_amount,
  status,
  total_god_score,
  created_at,
  admin_notes,
  CASE
    WHEN website IS NULL THEN '❌ No website'
    WHEN website LIKE '%paulgraham.com%' OR website LIKE '%blog%' OR website LIKE '%essay%' THEN '⚠️ Invalid website (blog/essay)'
    WHEN tagline IS NULL AND description IS NULL THEN '⚠️ No description/tagline'
    WHEN total_god_score < 15 THEN '⚠️ Very low GOD score (<15)'
    WHEN stage = 5 AND raise_amount ILIKE '%Seed%' THEN '⚠️ Data inconsistency: Series C+ but Seed funding'
    WHEN stage = 5 AND (raise_amount ILIKE '%$1M%' OR raise_amount ILIKE '%$2M%' OR raise_amount ILIKE '%$3M%') THEN '⚠️ Data inconsistency: Series C+ but early-stage amounts'
    ELSE '✅ Appears valid'
  END as issue_flag
FROM startup_uploads
WHERE status = 'approved'
  AND (
    stage >= 5 
    OR stage IS NULL
  )
  AND (
    -- Invalid websites
    website LIKE '%paulgraham.com%'
    OR website LIKE '%blog%'
    OR website LIKE '%essay%'
    -- Missing critical data
    OR website IS NULL
    OR (tagline IS NULL AND description IS NULL)
    -- Very low scores
    OR total_god_score < 15
    -- Data inconsistencies
    OR (stage = 5 AND raise_amount ILIKE '%Seed%')
    OR (stage = 5 AND raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$5M%']))
    -- Questionable names
    OR name ILIKE '%billionaire%'
    OR name = 'Subject'
  )
ORDER BY 
  CASE 
    WHEN website LIKE '%paulgraham.com%' THEN 1
    WHEN website IS NULL THEN 2
    WHEN total_god_score < 15 THEN 3
    WHEN stage = 5 AND raise_amount ILIKE '%Seed%' THEN 4
    ELSE 5
  END,
  name;

-- STEP 2: Summary of issues
SELECT 
  COUNT(*) FILTER (WHERE website IS NULL) as no_website_count,
  COUNT(*) FILTER (WHERE website LIKE '%paulgraham.com%' OR website LIKE '%blog%') as invalid_website_count,
  COUNT(*) FILTER (WHERE tagline IS NULL AND description IS NULL) as no_description_count,
  COUNT(*) FILTER (WHERE total_god_score < 15) as very_low_score_count,
  COUNT(*) FILTER (WHERE stage = 5 AND raise_amount ILIKE '%Seed%') as stage_funding_mismatch_count,
  COUNT(*) as total_questionable_count
FROM startup_uploads
WHERE status = 'approved'
  AND (
    stage >= 5 OR stage IS NULL
  )
  AND (
    website LIKE '%paulgraham.com%'
    OR website IS NULL
    OR total_god_score < 15
    OR (stage = 5 AND raise_amount ILIKE '%Seed%')
    OR name ILIKE '%billionaire%'
    OR name = 'Subject'
  );

-- STEP 3: Reject clearly invalid companies
-- This rejects companies that are clearly not valid startups
UPDATE startup_uploads
SET 
  status = 'rejected',
  admin_notes = COALESCE(admin_notes || ' | ', '') || CASE
    WHEN website LIKE '%paulgraham.com%' THEN 'Rejected: Invalid website (blog/essay, not a startup)'
    WHEN name ILIKE '%billionaire%' THEN 'Rejected: Not a startup company'
    WHEN name = 'Subject' AND website IS NULL THEN 'Rejected: Invalid entry - no website, no description'
    WHEN website IS NULL AND tagline IS NULL AND description IS NULL THEN 'Rejected: Missing critical data (no website, no description)'
    ELSE 'Rejected: Data quality issues (late-stage review)'
  END
WHERE status = 'approved'
  AND (
    -- Clearly invalid
    website LIKE '%paulgraham.com%'
    OR name ILIKE '%billionaire%'
    OR (name = 'Subject' AND website IS NULL)
    -- Missing critical data
    OR (website IS NULL AND tagline IS NULL AND description IS NULL)
  );

-- STEP 4: Review data inconsistencies (Series C+ but early-stage funding amounts)
-- These might just need stage correction, so we'll just flag them for review
SELECT 
  id,
  name,
  stage,
  raise_amount,
  raise_type,
  website,
  total_god_score,
  '⚠️ Stage/funding mismatch: Marked as Series C+ but seeking Seed/early amounts. Consider correcting stage to Seed/Series A.' as recommendation
FROM startup_uploads
WHERE status = 'approved'
  AND stage = 5
  AND (
    raise_amount ILIKE '%Seed%'
    OR raise_amount ILIKE ANY(ARRAY['%$1M%', '%$2M%', '%$3M%', '%$4M%', '%$5M%', '%Seeking $1.5M%', '%Seeking $3M%'])
  )
ORDER BY name;

-- STEP 5: Verify rejections
SELECT 
  id,
  name,
  website,
  status,
  admin_notes,
  updated_at
FROM startup_uploads
WHERE name ILIKE ANY(ARRAY['%billionaire%', 'Subject', '%merlin%energy%'])
   OR website LIKE '%paulgraham.com%'
ORDER BY name;
