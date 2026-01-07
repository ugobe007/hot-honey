-- ============================================================================
-- INVESTORS MISSING DATA
-- ============================================================================
-- Simple list of investors missing: url, value proposition, focus, notable investments
-- ============================================================================

SELECT 
  id,
  name,
  firm,
  
  -- Missing fields indicators
  CASE WHEN url IS NULL OR url = '' THEN '❌' ELSE '✅' END AS has_url,
  CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN '❌' ELSE '✅' END AS has_value_prop,
  CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN '❌' ELSE '✅' END AS has_focus,
  CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN '❌' ELSE '✅' END AS has_notable_investments,
  
  -- Missing count
  (
    CASE WHEN url IS NULL OR url = '' THEN 1 ELSE 0 END +
    CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 1 ELSE 0 END +
    CASE WHEN sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0 THEN 1 ELSE 0 END +
    CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN 1 ELSE 0 END
  ) AS missing_count,
  
  -- The actual values (if they exist)
  url,
  firm_description_normalized AS value_proposition,
  sectors AS focus,
  notable_investments,
  
  -- Additional helpful fields
  linkedin_url,
  bio,
  investment_thesis,
  
  created_at,
  updated_at

FROM investors
WHERE 
  -- Only show investors missing at least one of these fields
  (
    url IS NULL OR url = ''
    OR firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50
    OR sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0
    OR notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0
  )
ORDER BY 
  missing_count DESC,
  name ASC
LIMIT 500;


