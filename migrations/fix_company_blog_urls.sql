-- Fix company_blog source_urls that are missing http/https scheme
-- One-time patch to normalize existing data

-- Preview what will be changed (run this first to verify)
SELECT id, source_url,
       CASE
         WHEN source_url IS NULL THEN NULL
         WHEN source_url ~* '^https?://' THEN source_url
         WHEN source_url ~* '^[a-z0-9.-]+\.[a-z]{2,}(/.*)?$' THEN 'https://' || source_url
         ELSE source_url
       END as normalized
FROM pythia_speech_snippets
WHERE source_type = 'company_blog'
  AND source_url IS NOT NULL
  AND source_url !~* '^https?://'
LIMIT 50;

-- Apply the fix: normalize URLs and convert empty strings to NULL
UPDATE pythia_speech_snippets
SET source_url =
  CASE
    WHEN source_url IS NULL OR source_url = '' THEN NULL
    WHEN source_url ~* '^https?://' THEN source_url
    WHEN source_url ~* '^[a-z0-9.-]+\.[a-z]{2,}(/.*)?$' THEN 'https://' || source_url
    ELSE NULL -- Convert invalid URLs to NULL (strict)
  END,
  updated_at = NOW()
WHERE source_type = 'company_blog'
  AND (source_url IS NOT NULL AND source_url != '')
  AND (source_url = '' OR source_url !~* '^https?://');

-- Verify fix: should show 0 non_http_urls for company_blog
SELECT source_type,
       COUNT(*) FILTER (WHERE source_url IS NOT NULL AND source_url !~* '^https?://') as non_http_urls,
       COUNT(*) as total
FROM pythia_speech_snippets
GROUP BY source_type
ORDER BY total DESC;
