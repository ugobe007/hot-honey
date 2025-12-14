-- ============================================
-- Schema Cleanup & Standardization
-- ============================================
-- Fixes discovered_startups table schema conflicts
-- Run this in Supabase SQL Editor

-- Step 1: Remove conflicting columns that were incorrectly added
-- These columns were added by migrations but conflict with the original design
ALTER TABLE discovered_startups 
DROP COLUMN IF EXISTS url CASCADE,
DROP COLUMN IF EXISTS source CASCADE,
DROP COLUMN IF EXISTS imported_to_review CASCADE;

-- Step 2: Ensure all correct columns exist with proper defaults
-- (These should already exist from original table creation)
ALTER TABLE discovered_startups 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS article_url TEXT,
ADD COLUMN IF NOT EXISTS imported_to_startups BOOLEAN DEFAULT false;

-- Step 3: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovered_startups_name ON discovered_startups(name);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_website ON discovered_startups(website);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_imported ON discovered_startups(imported_to_startups);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_discovered_at ON discovered_startups(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_article_url ON discovered_startups(article_url);

-- Step 4: Add comments to document correct column usage
COMMENT ON COLUMN discovered_startups.website IS 'Startup website URL (NOT "url" column)';
COMMENT ON COLUMN discovered_startups.article_url IS 'Source article URL where startup was found (NOT "source" column)';
COMMENT ON COLUMN discovered_startups.imported_to_startups IS 'Whether imported to startup_uploads table (NOT "imported_to_review" column)';

-- Step 5: Optimize startup_uploads indexes
CREATE INDEX IF NOT EXISTS idx_startup_uploads_status ON startup_uploads(status);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_stage ON startup_uploads(stage);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_sectors ON startup_uploads USING GIN(sectors);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_god_score ON startup_uploads(total_god_score DESC);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_created_at ON startup_uploads(created_at DESC);

-- Step 6: Verify the schema is correct
SELECT 
  'discovered_startups' as table_name,
  column_name, 
  data_type,
  CASE 
    WHEN column_name IN ('website', 'article_url', 'imported_to_startups') THEN '✅ CORRECT'
    WHEN column_name IN ('url', 'source', 'imported_to_review') THEN '❌ WRONG - SHOULD NOT EXIST'
    ELSE '⚪ Other'
  END as status
FROM information_schema.columns 
WHERE table_name = 'discovered_startups' 
  AND table_schema = 'public'
  AND column_name IN ('url', 'website', 'source', 'article_url', 'imported_to_review', 'imported_to_startups')
ORDER BY ordinal_position;

-- Expected output should show ONLY:
-- ✅ website
-- ✅ article_url  
-- ✅ imported_to_startups
