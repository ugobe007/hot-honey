-- ============================================
-- Add Authentication Support to RSS Sources
-- ============================================
-- This adds username/password authentication support for RSS feeds
-- that require login credentials (e.g., Wired, Bloomberg Premium)
-- Run this in Supabase SQL Editor

-- Add authentication columns to rss_sources table
ALTER TABLE rss_sources ADD COLUMN IF NOT EXISTS requires_auth BOOLEAN DEFAULT false;
ALTER TABLE rss_sources ADD COLUMN IF NOT EXISTS auth_username TEXT;
ALTER TABLE rss_sources ADD COLUMN IF NOT EXISTS auth_password TEXT;

-- Add comments for documentation
COMMENT ON COLUMN rss_sources.requires_auth IS 'Whether this RSS source requires authentication';
COMMENT ON COLUMN rss_sources.auth_username IS 'Username or email for authenticated RSS feeds';
COMMENT ON COLUMN rss_sources.auth_password IS 'Password for authenticated RSS feeds (stored securely)';

-- Create index for sources requiring authentication
CREATE INDEX IF NOT EXISTS idx_rss_sources_requires_auth ON rss_sources(requires_auth) WHERE requires_auth = true;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'rss_sources' 
  AND column_name IN ('requires_auth', 'auth_username', 'auth_password')
ORDER BY ordinal_position;
