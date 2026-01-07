-- ============================================================================
-- INVESTORS MISSING DATA - CSV FORMAT
-- ============================================================================
-- Export-friendly format for manual enrichment
-- Copy results and paste into Excel/Sheets
-- ============================================================================

SELECT 
  name AS "Name",
  firm AS "Firm",
  id AS "ID",
  CASE WHEN url IS NULL OR url = '' THEN 'MISSING' ELSE url END AS "URL",
  CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 'MISSING' ELSE LEFT(firm_description_normalized, 100) END AS "Value Proposition",
  CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN 'MISSING' ELSE 'HAS DATA' END AS "Notable Investments",
  linkedin_url AS "LinkedIn",
  bio AS "Bio",
  sectors::text AS "Sectors",
  stage::text AS "Stage"

FROM investors
WHERE 
  -- Missing at least one of: URL, Value Prop, Notable Investments
  (
    url IS NULL OR url = ''
    OR firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50
    OR notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0
  )
ORDER BY 
  name ASC
LIMIT 1000;


