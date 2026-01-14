-- Find Late-Stage Companies
-- Identifies companies at Series C, D, E, F, or later funding stages
-- Late-stage companies may not be suitable for early-stage investor matching

-- STEP 1: Find late-stage companies by stage field
-- Stage values: 0=Pre-Seed, 1=Pre-Seed, 2=Seed, 3=Series A, 4=Series B, 5=Series C+, 6+=Later stages
SELECT 
  id,
  name,
  tagline,
  stage,
  CASE 
    WHEN stage = 0 THEN 'Pre-Seed'
    WHEN stage = 1 THEN 'Pre-Seed'
    WHEN stage = 2 THEN 'Seed'
    WHEN stage = 3 THEN 'Series A'
    WHEN stage = 4 THEN 'Series B'
    WHEN stage = 5 THEN 'Series C+'
    WHEN stage >= 6 THEN 'Series ' || stage || '+' 
    WHEN stage IS NULL THEN 'Unknown'
    ELSE 'Stage ' || stage
  END as funding_stage_label,
  website,
  status,
  total_god_score,
  created_at,
  updated_at
FROM startup_uploads
WHERE status = 'approved'
  AND (
    stage >= 5  -- Series C or later
    OR stage IS NULL  -- Include null stages for review
  )
ORDER BY stage DESC NULLS LAST, name
LIMIT 100;

-- STEP 2: Count late-stage companies by stage
SELECT 
  CASE 
    WHEN stage = 5 THEN 'Series C+'
    WHEN stage >= 6 THEN 'Series ' || stage || '+'
    WHEN stage IS NULL THEN 'Unknown/Null'
    ELSE 'Stage ' || stage
  END as funding_stage,
  COUNT(*) as company_count,
  ROUND(AVG(total_god_score)::numeric, 2) as avg_god_score,
  MIN(total_god_score) as min_score,
  MAX(total_god_score) as max_score
FROM startup_uploads
WHERE status = 'approved'
  AND (stage >= 5 OR stage IS NULL)
GROUP BY stage
ORDER BY 
  CASE 
    WHEN stage IS NULL THEN 999
    ELSE stage
  END DESC;

-- STEP 3: Find late-stage companies with additional context (tagline/keywords)
SELECT 
  id,
  name,
  tagline,
  stage,
  CASE 
    WHEN stage = 5 THEN 'Series C+'
    WHEN stage >= 6 THEN 'Series ' || stage || '+'
    WHEN stage IS NULL THEN 'Unknown'
    ELSE 'Stage ' || stage
  END as funding_stage_label,
  website,
  status,
  total_god_score,
  CASE
    WHEN tagline ILIKE ANY(ARRAY[
      '%Series C%', '%Series D%', '%Series E%', '%Series F%', '%Series G%',
      '%$100M%', '%$100 million%', '%$500M%', '%$500 million%', '%$1B%', '%$1 billion%',
      '%unicorn%', '%decacorn%', '%IPO%', '%public%', '%listed%'
    ]) THEN 'Late-stage indicators in tagline'
    WHEN name ILIKE ANY(ARRAY[
      '%Series C%', '%Series D%', '%Series E%'
    ]) THEN 'Stage mentioned in name'
    ELSE NULL
  END as late_stage_indicators,
  created_at
FROM startup_uploads
WHERE status = 'approved'
  AND (
    stage >= 5  -- Series C or later
    OR stage IS NULL
    OR tagline ILIKE ANY(ARRAY[
      '%Series C%', '%Series D%', '%Series E%', '%Series F%', '%Series G%',
      '%$100M%', '%$100 million%', '%$500M%', '%$500 million%', '%$1B%', '%$1 billion%',
      '%unicorn%', '%decacorn%'
    ])
  )
ORDER BY 
  CASE WHEN stage IS NULL THEN 999 ELSE stage END DESC,
  name
LIMIT 200;

-- STEP 4: Summary statistics
SELECT 
  COUNT(*) FILTER (WHERE stage >= 5) as series_c_plus_count,
  COUNT(*) FILTER (WHERE stage IS NULL) as unknown_stage_count,
  COUNT(*) FILTER (WHERE stage >= 5 OR stage IS NULL) as total_late_stage_count,
  COUNT(*) as total_approved_startups,
  ROUND(
    COUNT(*) FILTER (WHERE stage >= 5 OR stage IS NULL)::numeric / 
    NULLIF(COUNT(*), 0)::numeric * 100, 
    2
  ) as late_stage_percentage,
  AVG(total_god_score) FILTER (WHERE stage >= 5) as avg_god_score_series_c_plus,
  AVG(total_god_score) as avg_god_score_all_approved
FROM startup_uploads
WHERE status = 'approved';
