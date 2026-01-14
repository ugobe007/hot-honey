-- Add constraint to require source_url for company_blog snippets
-- Run this AFTER backfilling NULL URLs (see backfill_company_blog_null_urls.sql)

-- First verify no NULL URLs remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM pythia_speech_snippets
  WHERE source_type = 'company_blog'
    AND source_url IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot add constraint: % company_blog rows still have NULL source_url. Run backfill_company_blog_null_urls.sql first.', null_count;
  END IF;
END $$;

-- Add the constraint
ALTER TABLE pythia_speech_snippets
ADD CONSTRAINT company_blog_source_url_required
CHECK (source_type <> 'company_blog' OR source_url IS NOT NULL);

COMMENT ON CONSTRAINT company_blog_source_url_required ON pythia_speech_snippets IS 
'Requires source_url to be non-null for company_blog snippets. Ensures all blog snippets have a valid URL for deduplication and UX.';
