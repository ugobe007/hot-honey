-- Backfill NULL source_url for company_blog snippets
-- Step 1: Backfill from startup_uploads.website
UPDATE pythia_speech_snippets s
SET source_url = NULLIF(TRIM(u.website), ''),
    updated_at = NOW()
FROM startup_uploads u
WHERE s.source_type = 'company_blog'
  AND s.source_url IS NULL
  AND s.entity_id = u.id
  AND u.website IS NOT NULL
  AND TRIM(u.website) <> '';

-- Step 2: Backfill from startup_uploads.source_url (if website was missing)
UPDATE pythia_speech_snippets s
SET source_url = NULLIF(TRIM(u.source_url), ''),
    updated_at = NOW()
FROM startup_uploads u
WHERE s.source_type = 'company_blog'
  AND s.source_url IS NULL
  AND s.entity_id = u.id
  AND u.source_url IS NOT NULL
  AND TRIM(u.source_url) <> '';

-- Step 3: Normalize any backfilled URLs that are missing http/https
UPDATE pythia_speech_snippets
SET source_url =
  CASE
    WHEN source_url IS NULL OR source_url = '' THEN NULL
    WHEN source_url ~* '^https?://' THEN source_url
    WHEN source_url ~* '^[a-z0-9.-]+\.[a-z]{2,}(/.*)?$' THEN 'https://' || source_url
    ELSE NULL
  END,
  updated_at = NOW()
WHERE source_type = 'company_blog'
  AND source_url IS NOT NULL
  AND source_url !~* '^https?://';

-- Verify: Check remaining NULLs (should be 0 after backfill)
SELECT COUNT(*) as remaining_null_urls
FROM pythia_speech_snippets
WHERE source_type = 'company_blog'
  AND source_url IS NULL;

-- After verifying remaining_null_urls = 0, add constraint:
-- ALTER TABLE pythia_speech_snippets
-- ADD CONSTRAINT company_blog_source_url_required
-- CHECK (source_type <> 'company_blog' OR source_url IS NOT NULL);
