-- List All Late-Stage Companies for Review
-- Shows the 15 companies identified as late-stage (3 Series C+, 12 unknown stage)

SELECT 
  id,
  name,
  tagline,
  stage,
  CASE 
    WHEN stage = 5 THEN 'Series C+'
    WHEN stage >= 6 THEN 'Series ' || stage || '+'
    WHEN stage IS NULL THEN 'Unknown/Null Stage'
    ELSE 'Stage ' || stage
  END as funding_stage_label,
  raise_type,
  raise_amount,
  website,
  status,
  total_god_score,
  created_at,
  updated_at,
  admin_notes
FROM startup_uploads
WHERE status = 'approved'
  AND (stage >= 5 OR stage IS NULL)
ORDER BY 
  CASE WHEN stage IS NULL THEN 999 ELSE stage END DESC,
  name;
