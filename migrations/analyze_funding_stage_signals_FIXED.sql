-- Analyze Funding Stage Signals - Find Missing Series A/B Data (FIXED VERSION)
-- This will identify why startups aren't being tagged as Series A/B
-- FIXED: Uses correct column names (amount not amount_usd, handles missing tables)

-- ============================================================
-- 1. Current Funding Stage Distribution
-- ============================================================

SELECT 
  'CURRENT STAGE DISTRIBUTION' as section,
  COALESCE(stage::text, 'NULL') as stage_value,
  COALESCE(raise_type, 'NULL') as raise_type_value,
  COUNT(*)::bigint as count,
  ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM startup_uploads), 0))::numeric, 2) as percentage
FROM startup_uploads
GROUP BY stage, raise_type
ORDER BY count DESC;

-- ============================================================
-- 2. Check Funding Round Data in funding_rounds Table (if exists)
-- ============================================================

SELECT 
  'FUNDING ROUNDS TABLE CHECK' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'funding_rounds'
    )
    THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist'
  END as table_status;

-- If table exists, show funding rounds breakdown
SELECT 
  'FUNDING ROUNDS BY TYPE' as section,
  round_type,
  COUNT(*)::bigint as count_by_type,
  COUNT(DISTINCT startup_id)::bigint as unique_startups
FROM funding_rounds
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'funding_rounds'
)
GROUP BY round_type
ORDER BY count_by_type DESC;

-- ============================================================
-- 3. Check extracted_data for Funding Signals
-- ============================================================

SELECT 
  'FUNDING SIGNALS IN extracted_data' as section,
  COUNT(*)::bigint as startups_with_extracted_data,
  COUNT(*) FILTER (WHERE extracted_data->>'funding_stage' IS NOT NULL)::bigint as has_funding_stage,
  COUNT(*) FILTER (WHERE extracted_data->>'funding_amount' IS NOT NULL)::bigint as has_funding_amount,
  COUNT(*) FILTER (WHERE extracted_data->>'round_type' IS NOT NULL)::bigint as has_round_type,
  COUNT(*) FILTER (WHERE extracted_data->>'funding_round' IS NOT NULL)::bigint as has_funding_round,
  COUNT(*) FILTER (WHERE extracted_data->'investors' IS NOT NULL)::bigint as has_investors_field
FROM startup_uploads
WHERE extracted_data IS NOT NULL;

-- ============================================================
-- 4. Sample extracted_data to See What Signals Exist
-- ============================================================

SELECT 
  'SAMPLE: extracted_data with funding info' as section,
  id,
  name,
  stage,
  raise_type,
  extracted_data->>'funding_stage' as extracted_funding_stage,
  extracted_data->>'funding_amount' as extracted_funding_amount,
  extracted_data->>'round_type' as extracted_round_type,
  extracted_data->'investors' as extracted_investors,
  extracted_data->'funding' as extracted_funding_object
FROM startup_uploads
WHERE extracted_data IS NOT NULL
  AND (
    extracted_data->>'funding_stage' IS NOT NULL
    OR extracted_data->>'funding_amount' IS NOT NULL
    OR extracted_data->>'round_type' IS NOT NULL
    OR extracted_data->'investors' IS NOT NULL
  )
LIMIT 20;

-- ============================================================
-- 5. Check RSS Articles for Funding Mentions
-- ============================================================

SELECT 
  'RSS ARTICLES WITH FUNDING MENTIONS (Last 30 Days)' as section,
  COUNT(*)::bigint as total_articles,
  COUNT(*) FILTER (WHERE title ILIKE '%Series A%' OR content ILIKE '%Series A%')::bigint as mentions_series_a,
  COUNT(*) FILTER (WHERE title ILIKE '%Series B%' OR content ILIKE '%Series B%')::bigint as mentions_series_b,
  COUNT(*) FILTER (WHERE title ILIKE '%funding%' OR content ILIKE '%funding%')::bigint as mentions_funding,
  COUNT(*) FILTER (WHERE title ILIKE '%raised%' OR content ILIKE '%raised%')::bigint as mentions_raised
FROM rss_articles
WHERE created_at >= NOW() - INTERVAL '30 days';

-- ============================================================
-- 6. Check discovered_startups for Funding Info
-- ============================================================

SELECT 
  'DISCOVERED STARTUPS FUNDING INFO' as section,
  COUNT(*)::bigint as total_discovered,
  COUNT(*) FILTER (WHERE funding_stage IS NOT NULL)::bigint as has_funding_stage,
  COUNT(*) FILTER (WHERE funding_amount IS NOT NULL)::bigint as has_funding_amount,
  funding_stage,
  COUNT(*)::bigint as count_by_stage
FROM discovered_startups
GROUP BY funding_stage
ORDER BY count_by_stage DESC;

-- ============================================================
-- 7. Find Startups That Should Be Series A/B But Aren't
-- ============================================================
-- This identifies startups with Series A/B signals but wrong/missing stage

SELECT 
  'POTENTIAL SERIES A/B STARTUPS (Missing/Wrong Stage)' as section,
  su.id,
  su.name,
  su.stage as current_stage,
  su.raise_type,
  su.raise_amount,
  su.extracted_data->>'funding_stage' as extracted_stage,
  su.extracted_data->>'funding_amount' as extracted_amount,
  CASE 
    WHEN su.raise_type ILIKE '%Series A%' THEN 'raise_type has Series A'
    WHEN su.raise_type ILIKE '%Series B%' THEN 'raise_type has Series B'
    WHEN su.extracted_data->>'funding_stage' ILIKE '%Series A%' THEN 'extracted_data has Series A'
    WHEN su.extracted_data->>'funding_stage' ILIKE '%Series B%' THEN 'extracted_data has Series B'
    WHEN su.extracted_data->>'funding_amount' IS NOT NULL THEN 'has funding amount'
    WHEN su.raise_amount IS NOT NULL THEN 'has raise amount'
    ELSE 'other signal'
  END as signal_source
FROM startup_uploads su
WHERE (
  -- raise_type mentions Series A/B but stage is wrong
  (su.raise_type ILIKE '%Series A%' AND (su.stage IS NULL OR su.stage != 2))
  OR (su.raise_type ILIKE '%Series B%' AND (su.stage IS NULL OR su.stage != 3))
  -- extracted_data has Series A/B but stage is wrong
  OR (su.extracted_data->>'funding_stage' ILIKE '%Series A%' AND (su.stage IS NULL OR su.stage != 2))
  OR (su.extracted_data->>'funding_stage' ILIKE '%Series B%' AND (su.stage IS NULL OR su.stage != 3))
  -- Has funding amount but stage not set to Series A/B (might indicate Series A/B)
  OR (su.raise_amount IS NOT NULL AND (su.stage IS NULL OR su.stage < 2))
  OR (su.extracted_data->>'funding_amount' IS NOT NULL AND (su.stage IS NULL OR su.stage < 2))
)
LIMIT 50;

-- ============================================================
-- 8. Check What Stage Values Actually Exist
-- ============================================================

SELECT 
  'ALL UNIQUE STAGE VALUES' as section,
  COALESCE(stage::text, 'NULL') as stage_value,
  COUNT(*)::bigint as count,
  ROUND((COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM startup_uploads), 0))::numeric, 2) as percentage
FROM startup_uploads
GROUP BY stage
ORDER BY 
  CASE 
    WHEN stage IS NULL THEN 999
    ELSE stage
  END;

-- ============================================================
-- 9. Check What raise_type Values Actually Exist
-- ============================================================

SELECT 
  'ALL UNIQUE raise_type VALUES' as section,
  raise_type as raise_type_value,
  COUNT(*)::bigint as count
FROM startup_uploads
WHERE raise_type IS NOT NULL
GROUP BY raise_type
ORDER BY count DESC
LIMIT 20;

-- ============================================================
-- 10. Analyze Funding Signals in Article Content
-- ============================================================

SELECT 
  'FUNDING SIGNAL PATTERNS IN ARTICLES (Last 30 Days)' as section,
  CASE 
    WHEN title ILIKE '%Series A%' OR content ILIKE '%Series A%' THEN 'Series A Mention'
    WHEN title ILIKE '%Series B%' OR content ILIKE '%Series B%' THEN 'Series B Mention'
    WHEN title ILIKE '%Seed%' OR content ILIKE '%Seed%' THEN 'Seed Mention'
    WHEN title ILIKE '%raised%' OR content ILIKE '%raised%' THEN 'Funding Raised'
    ELSE 'Other'
  END as signal_type,
  COUNT(*)::bigint as count
FROM rss_articles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  CASE 
    WHEN title ILIKE '%Series A%' OR content ILIKE '%Series A%' THEN 'Series A Mention'
    WHEN title ILIKE '%Series B%' OR content ILIKE '%Series B%' THEN 'Series B Mention'
    WHEN title ILIKE '%Seed%' OR content ILIKE '%Seed%' THEN 'Seed Mention'
    WHEN title ILIKE '%raised%' OR content ILIKE '%raised%' THEN 'Funding Raised'
    ELSE 'Other'
  END
ORDER BY count DESC;
