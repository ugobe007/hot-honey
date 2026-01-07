-- ============================================================================
-- INVESTOR ENRICHMENT LIST (FIXED FOR TEXT[] ARRAYS)
-- ============================================================================
-- Fixed query that handles text[] arrays correctly
-- Run this in Supabase SQL Editor
-- ============================================================================

SELECT 
  id,
  name,
  firm,
  
  -- Completeness indicators
  CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 50 THEN 'Yes' ELSE 'No' END AS has_bio,
  CASE WHEN investment_thesis IS NOT NULL AND LENGTH(investment_thesis) > 50 THEN 'Yes' ELSE 'No' END AS has_thesis,
  CASE WHEN firm_description_normalized IS NOT NULL AND LENGTH(firm_description_normalized) > 50 THEN 'Yes' ELSE 'No' END AS has_firm_desc,
  CASE WHEN sectors IS NOT NULL AND array_length(sectors, 1) > 0 THEN 'Yes' ELSE 'No' END AS has_sectors,
  CASE WHEN stage IS NOT NULL AND array_length(stage, 1) > 0 THEN 'Yes' ELSE 'No' END AS has_stage,
  CASE WHEN check_size_min IS NOT NULL OR check_size_max IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_check_size,
  CASE WHEN geography_focus IS NOT NULL AND array_length(geography_focus, 1) > 0 THEN 'Yes' ELSE 'No' END AS has_geography,
  CASE WHEN notable_investments IS NOT NULL AND (
    CASE 
      WHEN pg_typeof(notable_investments)::text LIKE '%[]' 
      THEN array_length(notable_investments::text[], 1) > 0
      WHEN pg_typeof(notable_investments)::text = 'jsonb' 
      THEN jsonb_array_length(notable_investments::jsonb) > 0
      ELSE false
    END
  ) THEN 'Yes' ELSE 'No' END AS has_notable,
  CASE WHEN url IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_url,
  CASE WHEN linkedin_url IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_linkedin,
  
  -- Missing count
  (
    CASE WHEN bio IS NULL OR LENGTH(bio) < 50 THEN 1 ELSE 0 END +
    CASE WHEN investment_thesis IS NULL OR LENGTH(investment_thesis) < 50 THEN 1 ELSE 0 END +
    CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 1 ELSE 0 END +
    CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN stage IS NULL OR array_length(stage, 1) IS NULL OR array_length(stage, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN check_size_min IS NULL AND check_size_max IS NULL THEN 1 ELSE 0 END +
    CASE WHEN geography_focus IS NULL OR array_length(geography_focus, 1) IS NULL OR array_length(geography_focus, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN notable_investments IS NULL OR (
      CASE 
        WHEN pg_typeof(notable_investments)::text LIKE '%[]' 
        THEN array_length(notable_investments::text[], 1) IS NULL OR array_length(notable_investments::text[], 1) = 0
        WHEN pg_typeof(notable_investments)::text = 'jsonb' 
        THEN jsonb_array_length(notable_investments::jsonb) = 0
        ELSE true
      END
    ) THEN 1 ELSE 0 END +
    CASE WHEN url IS NULL THEN 1 ELSE 0 END +
    CASE WHEN linkedin_url IS NULL THEN 1 ELSE 0 END
  ) AS missing_count,
  
  -- URLs for enrichment
  linkedin_url,
  url AS website_url,
  blog_url,
  
  -- Additional context
  sectors,
  stage,
  check_size_min,
  check_size_max,
  geography_focus,
  notable_investments,
  
  created_at,
  updated_at

FROM investors
WHERE 
  -- Filter to investors needing enrichment (missing > 3 fields)
  (
    CASE WHEN bio IS NULL OR LENGTH(bio) < 50 THEN 1 ELSE 0 END +
    CASE WHEN investment_thesis IS NULL OR LENGTH(investment_thesis) < 50 THEN 1 ELSE 0 END +
    CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 1 ELSE 0 END +
    CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN stage IS NULL OR array_length(stage, 1) IS NULL OR array_length(stage, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN check_size_min IS NULL AND check_size_max IS NULL THEN 1 ELSE 0 END +
    CASE WHEN geography_focus IS NULL OR array_length(geography_focus, 1) IS NULL OR array_length(geography_focus, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN notable_investments IS NULL OR (
      CASE 
        WHEN pg_typeof(notable_investments)::text LIKE '%[]' 
        THEN array_length(notable_investments::text[], 1) IS NULL OR array_length(notable_investments::text[], 1) = 0
        WHEN pg_typeof(notable_investments)::text = 'jsonb' 
        THEN jsonb_array_length(notable_investments::jsonb) = 0
        ELSE true
      END
    ) THEN 1 ELSE 0 END +
    CASE WHEN url IS NULL THEN 1 ELSE 0 END +
    CASE WHEN linkedin_url IS NULL THEN 1 ELSE 0 END
  ) > 3
ORDER BY 
  missing_count DESC,
  name ASC
LIMIT 500;


