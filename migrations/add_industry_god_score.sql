-- Migration: Add Industry GOD Score Support
-- Description: Adds columns to support industry-specific GOD scoring
-- Created: 2025-01-07

-- Add industry_god_score column (industry-adjusted score)
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS industry_god_score INTEGER DEFAULT NULL;

-- Add primary_industry column (stores the identified primary industry)
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS primary_industry TEXT DEFAULT NULL;

-- Add index for filtering/sorting by industry score
CREATE INDEX IF NOT EXISTS idx_startup_industry_god_score ON startup_uploads(industry_god_score DESC NULLS LAST);

-- Add index for industry filtering
CREATE INDEX IF NOT EXISTS idx_startup_primary_industry ON startup_uploads(primary_industry);

-- Add composite index for common query pattern (industry score + status)
CREATE INDEX IF NOT EXISTS idx_startup_industry_scored_approved 
ON startup_uploads(primary_industry, industry_god_score DESC NULLS LAST) 
WHERE status = 'approved';

-- Comment on columns
COMMENT ON COLUMN startup_uploads.industry_god_score IS 'Industry-adjusted GOD score (0-100). Same algorithm as total_god_score but adjusted for industry-specific benchmarks.';
COMMENT ON COLUMN startup_uploads.primary_industry IS 'Primary industry identified for scoring (e.g., Biotech, AI/ML, Fintech, Robotics). Used for industry-specific scoring adjustments.';

