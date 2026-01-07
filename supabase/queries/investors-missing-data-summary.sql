-- ============================================================================
-- INVESTORS MISSING DATA - SUMMARY
-- ============================================================================
-- Quick count of how many investors are missing each field
-- ============================================================================

SELECT 
  COUNT(*) AS total_investors,
  
  -- Missing URL
  COUNT(*) FILTER (WHERE url IS NULL OR url = '') AS missing_url,
  ROUND(100.0 * COUNT(*) FILTER (WHERE url IS NULL OR url = '') / COUNT(*), 1) AS pct_missing_url,
  
  -- Missing Value Proposition
  COUNT(*) FILTER (WHERE firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50) AS missing_value_prop,
  ROUND(100.0 * COUNT(*) FILTER (WHERE firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50) / COUNT(*), 1) AS pct_missing_value_prop,
  
  -- Missing Focus (Sectors)
  COUNT(*) FILTER (WHERE sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0) AS missing_focus,
  ROUND(100.0 * COUNT(*) FILTER (WHERE sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0) / COUNT(*), 1) AS pct_missing_focus,
  
  -- Missing Notable Investments
  COUNT(*) FILTER (WHERE notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0) AS missing_notable_investments,
  ROUND(100.0 * COUNT(*) FILTER (WHERE notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0) / COUNT(*), 1) AS pct_missing_notable_investments,
  
  -- Missing all 4
  COUNT(*) FILTER (
    WHERE (url IS NULL OR url = '')
    AND (firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50)
    AND (sectors IS NULL OR array_length(sectors, 1) IS NULL OR array_length(sectors, 1) = 0)
    AND (notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0)
  ) AS missing_all_four

FROM investors;


