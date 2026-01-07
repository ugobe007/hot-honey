-- ============================================================================
-- INVESTOR ENRICHMENT SUMMARY STATISTICS
-- ============================================================================
-- Quick overview of investor data quality
-- ============================================================================

WITH investor_completeness AS (
  SELECT 
    id,
    name,
    -- Calculate completeness score (0-100)
    (
      -- Identity (20 points)
      CASE WHEN name IS NOT NULL THEN 10 ELSE 0 END +
      CASE WHEN firm IS NOT NULL THEN 10 ELSE 0 END +
      
      -- Core Information (30 points)
      CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 50 THEN 10 ELSE 0 END +
      CASE WHEN investment_thesis IS NOT NULL AND LENGTH(investment_thesis) > 50 THEN 10 ELSE 0 END +
      CASE WHEN firm_description_normalized IS NOT NULL AND LENGTH(firm_description_normalized) > 50 THEN 10 ELSE 0 END +
      
      -- Investment Criteria (25 points)
      CASE WHEN sectors IS NOT NULL AND jsonb_array_length(sectors::jsonb) > 0 THEN 5 ELSE 0 END +
      CASE WHEN stage IS NOT NULL AND jsonb_array_length(stage::jsonb) > 0 THEN 5 ELSE 0 END +
      CASE WHEN check_size_min IS NOT NULL OR check_size_max IS NOT NULL THEN 5 ELSE 0 END +
      CASE WHEN geography_focus IS NOT NULL AND (
        CASE WHEN jsonb_typeof(geography_focus::jsonb) = 'array' 
        THEN jsonb_array_length(geography_focus::jsonb) > 0 
        ELSE geography_focus::text IS NOT NULL END
      ) THEN 5 ELSE 0 END +
      CASE WHEN sectors IS NOT NULL AND stage IS NOT NULL AND (check_size_min IS NOT NULL OR check_size_max IS NOT NULL) THEN 5 ELSE 0 END +
      
      -- Portfolio & Credibility (15 points)
      CASE WHEN notable_investments IS NOT NULL AND jsonb_array_length(notable_investments::jsonb) > 0 THEN 8 ELSE 0 END +
      CASE WHEN total_investments IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN active_fund_size IS NOT NULL THEN 4 ELSE 0 END +
      
      -- Contact & Links (10 points)
      CASE WHEN url IS NOT NULL THEN 4 ELSE 0 END +
      CASE WHEN linkedin_url IS NOT NULL THEN 3 ELSE 0 END +
      CASE WHEN blog_url IS NOT NULL THEN 2 ELSE 0 END +
      CASE WHEN photo_url IS NOT NULL THEN 1 ELSE 0 END
    ) AS completeness_score,
    
    -- Count missing fields
    (
      CASE WHEN bio IS NULL OR LENGTH(bio) < 50 THEN 1 ELSE 0 END +
      CASE WHEN investment_thesis IS NULL OR LENGTH(investment_thesis) < 50 THEN 1 ELSE 0 END +
      CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 1 ELSE 0 END +
      CASE WHEN sectors IS NULL OR jsonb_array_length(sectors::jsonb) = 0 THEN 1 ELSE 0 END +
      CASE WHEN stage IS NULL OR jsonb_array_length(stage::jsonb) = 0 THEN 1 ELSE 0 END +
      CASE WHEN check_size_min IS NULL AND check_size_max IS NULL THEN 1 ELSE 0 END +
      CASE WHEN geography_focus IS NULL OR (
        CASE WHEN jsonb_typeof(geography_focus::jsonb) = 'array' 
        THEN jsonb_array_length(geography_focus::jsonb) = 0 
        ELSE geography_focus::text IS NULL END
      ) THEN 1 ELSE 0 END +
      CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN 1 ELSE 0 END +
      CASE WHEN url IS NULL THEN 1 ELSE 0 END +
      CASE WHEN linkedin_url IS NULL THEN 1 ELSE 0 END
    ) AS missing_count
  FROM investors
)

SELECT 
  COUNT(*) AS total_investors,
  ROUND(AVG(completeness_score), 1) AS avg_completeness,
  MIN(completeness_score) AS min_completeness,
  MAX(completeness_score) AS max_completeness,
  COUNT(*) FILTER (WHERE completeness_score < 60 OR missing_count > 3) AS needs_enrichment,
  ROUND(100.0 * COUNT(*) FILTER (WHERE completeness_score < 60 OR missing_count > 3) / COUNT(*), 1) AS pct_needs_enrichment,
  
  -- Distribution by completeness ranges
  COUNT(*) FILTER (WHERE completeness_score <= 20) AS range_0_20,
  COUNT(*) FILTER (WHERE completeness_score > 20 AND completeness_score <= 40) AS range_21_40,
  COUNT(*) FILTER (WHERE completeness_score > 40 AND completeness_score <= 60) AS range_41_60,
  COUNT(*) FILTER (WHERE completeness_score > 60 AND completeness_score <= 80) AS range_61_80,
  COUNT(*) FILTER (WHERE completeness_score > 80) AS range_81_100

FROM investor_completeness;

-- ============================================================================
-- MISSING FIELD SUMMARY
-- ============================================================================
SELECT 
  'Website URL' AS field_name,
  COUNT(*) FILTER (WHERE url IS NULL) AS missing_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE url IS NULL) / COUNT(*), 1) AS pct_missing
FROM investors

UNION ALL

SELECT 
  'Investment Thesis',
  COUNT(*) FILTER (WHERE investment_thesis IS NULL OR LENGTH(investment_thesis) < 50),
  ROUND(100.0 * COUNT(*) FILTER (WHERE investment_thesis IS NULL OR LENGTH(investment_thesis) < 50) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'Notable Investments',
  COUNT(*) FILTER (WHERE notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0),
  ROUND(100.0 * COUNT(*) FILTER (WHERE notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'Firm Description (Normalized)',
  COUNT(*) FILTER (WHERE firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50),
  ROUND(100.0 * COUNT(*) FILTER (WHERE firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'Bio/Description',
  COUNT(*) FILTER (WHERE bio IS NULL OR LENGTH(bio) < 50),
  ROUND(100.0 * COUNT(*) FILTER (WHERE bio IS NULL OR LENGTH(bio) < 50) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'Check Size',
  COUNT(*) FILTER (WHERE check_size_min IS NULL AND check_size_max IS NULL),
  ROUND(100.0 * COUNT(*) FILTER (WHERE check_size_min IS NULL AND check_size_max IS NULL) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'Geography Focus',
  COUNT(*) FILTER (WHERE geography_focus IS NULL OR (
    CASE WHEN jsonb_typeof(geography_focus::jsonb) = 'array' 
    THEN jsonb_array_length(geography_focus::jsonb) = 0 
    ELSE geography_focus::text IS NULL END
  )),
  ROUND(100.0 * COUNT(*) FILTER (WHERE geography_focus IS NULL OR (
    CASE WHEN jsonb_typeof(geography_focus::jsonb) = 'array' 
    THEN jsonb_array_length(geography_focus::jsonb) = 0 
    ELSE geography_focus::text IS NULL END
  )) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'LinkedIn URL',
  COUNT(*) FILTER (WHERE linkedin_url IS NULL),
  ROUND(100.0 * COUNT(*) FILTER (WHERE linkedin_url IS NULL) / COUNT(*), 1)
FROM investors

UNION ALL

SELECT 
  'Investment Stage',
  COUNT(*) FILTER (WHERE stage IS NULL OR jsonb_array_length(stage::jsonb) = 0),
  ROUND(100.0 * COUNT(*) FILTER (WHERE stage IS NULL OR jsonb_array_length(stage::jsonb) = 0) / COUNT(*), 1)
FROM investors

ORDER BY missing_count DESC;


