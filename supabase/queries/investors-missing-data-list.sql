-- ============================================================================
-- INVESTORS MISSING DATA - ACTIONABLE LIST
-- ============================================================================
-- Simple list you can use to go find the missing information
-- ============================================================================

SELECT 
  name,
  firm,
  id,
  
  -- What's missing (comma-separated)
  CONCAT_WS(', ',
    CASE WHEN url IS NULL OR url = '' THEN 'URL' END,
    CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 'Value Proposition' END,
    CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN 'Notable Investments' END
  ) AS missing_fields,
  
  -- What we have (to help you find them)
  linkedin_url,
  bio,
  investment_thesis,
  sectors,
  stage,
  check_size_min,
  check_size_max

FROM investors
WHERE 
  -- Missing at least one of: URL, Value Prop, Notable Investments
  (
    url IS NULL OR url = ''
    OR firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50
    OR notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0
  )
ORDER BY 
  name ASC;


