-- ============================================================================
-- INVESTOR ENRICHMENT LIST QUERY
-- ============================================================================
-- This query identifies investors with missing or sparse data for manual enrichment.
-- Run this in Supabase SQL Editor.
--
-- Results are ordered by completeness (lowest first) and missing field count.
-- ============================================================================

WITH investor_completeness AS (
  SELECT 
    id,
    name,
    firm,
    
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
    ) AS missing_count,
    
    -- Individual field flags
    CASE WHEN bio IS NOT NULL AND LENGTH(bio) > 50 THEN true ELSE false END AS has_bio,
    CASE WHEN sectors IS NOT NULL AND jsonb_array_length(sectors::jsonb) > 0 THEN true ELSE false END AS has_sectors,
    CASE WHEN stage IS NOT NULL AND jsonb_array_length(stage::jsonb) > 0 THEN true ELSE false END AS has_stage,
    CASE WHEN url IS NOT NULL THEN true ELSE false END AS has_url,
    CASE WHEN linkedin_url IS NOT NULL THEN true ELSE false END AS has_linkedin,
    
    -- URLs for enrichment
    url,
    linkedin_url,
    blog_url,
    
    -- Other useful fields
    sectors,
    stage,
    check_size_min,
    check_size_max,
    geography_focus,
    notable_investments,
    total_investments,
    active_fund_size
  FROM investors
)

SELECT 
  id,
  name,
  firm,
  completeness_score,
  missing_count,
  
  -- Missing fields list
  CONCAT_WS(', ',
    CASE WHEN NOT has_bio THEN 'bio' END,
    CASE WHEN investment_thesis IS NULL OR LENGTH(investment_thesis) < 50 THEN 'investment_thesis' END,
    CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 'firm_description_normalized' END,
    CASE WHEN NOT has_sectors THEN 'sectors' END,
    CASE WHEN NOT has_stage THEN 'stage' END,
    CASE WHEN check_size_min IS NULL AND check_size_max IS NULL THEN 'check_size' END,
    CASE WHEN geography_focus IS NULL OR (
      CASE WHEN jsonb_typeof(geography_focus::jsonb) = 'array' 
      THEN jsonb_array_length(geography_focus::jsonb) = 0 
      ELSE geography_focus::text IS NULL END
    ) THEN 'geography_focus' END,
    CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN 'notable_investments' END,
    CASE WHEN NOT has_url THEN 'url' END,
    CASE WHEN NOT has_linkedin THEN 'linkedin_url' END
  ) AS missing_fields,
  
  -- What they have
  CONCAT_WS(', ',
    CASE WHEN has_bio THEN 'bio' END,
    CASE WHEN has_sectors THEN 'sectors' END,
    CASE WHEN has_stage THEN 'stage' END,
    CASE WHEN has_url THEN 'url' END,
    CASE WHEN has_linkedin THEN 'linkedin' END
  ) AS has_fields,
  
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
  total_investments,
  active_fund_size,
  
  created_at,
  updated_at

FROM investor_completeness
WHERE 
  -- Filter to investors needing enrichment
  completeness_score < 60 
  OR missing_count > 3
ORDER BY 
  completeness_score ASC,
  missing_count DESC,
  name ASC
LIMIT 500;

-- ============================================================================
-- SUMMARY STATISTICS (Run separately if needed)
-- ============================================================================
/*
SELECT 
  COUNT(*) AS total_investors,
  ROUND(AVG(completeness_score), 1) AS avg_completeness,
  MIN(completeness_score) AS min_completeness,
  MAX(completeness_score) AS max_completeness,
  COUNT(*) FILTER (WHERE completeness_score < 60 OR missing_count > 3) AS needs_enrichment,
  ROUND(100.0 * COUNT(*) FILTER (WHERE completeness_score < 60 OR missing_count > 3) / COUNT(*), 1) AS pct_needs_enrichment
FROM investor_completeness;
*/

