-- Simple list: Name, Firm, ID, and what's missing
-- Copy results, paste into Excel/Sheets, go find the data

SELECT 
  name,
  firm,
  id,
  CASE WHEN url IS NULL OR url = '' THEN 'MISSING' ELSE url END AS url,
  CASE WHEN firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50 THEN 'MISSING' ELSE 'HAS' END AS value_prop,
  CASE WHEN notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0 THEN 'MISSING' ELSE 'HAS' END AS notable_investments,
  linkedin_url

FROM investors
WHERE 
  url IS NULL OR url = ''
  OR firm_description_normalized IS NULL OR LENGTH(firm_description_normalized) < 50
  OR notable_investments IS NULL OR jsonb_array_length(notable_investments::jsonb) = 0
ORDER BY name;


