-- Migration: Add GitHub fields to startup_uploads
-- Description: Stores GitHub organization, repositories, and enrichment data with provenance
-- Created: 2025-01-10

-- Add GitHub fields
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS github_org TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS github_repo_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS github_primary_repo TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS github_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_startup_github_org ON startup_uploads(github_org) WHERE github_org IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_startup_github_primary_repo ON startup_uploads(github_primary_repo) WHERE github_primary_repo IS NOT NULL;

-- Comments
COMMENT ON COLUMN startup_uploads.github_org IS 'GitHub organization/username (e.g., "stripe" or "openai")';
COMMENT ON COLUMN startup_uploads.github_repo_urls IS 'Array of GitHub repository URLs discovered for this startup';
COMMENT ON COLUMN startup_uploads.github_primary_repo IS 'Primary repository URL (full URL, e.g., https://github.com/stripe/stripe-js)';
COMMENT ON COLUMN startup_uploads.github_metadata IS 'GitHub enrichment data: { stars, forks, contributors, languages, commit_velocity, last_updated, extraction_method, source_url, confidence, extracted_at }';
