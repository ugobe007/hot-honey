-- Hot Money Honey - Update Startups Table for OpenAI Integration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/riryeljaqxicdnuwilai/sql

-- Add columns for the 5-point data structure that OpenAI collects
ALTER TABLE startups ADD COLUMN IF NOT EXISTS value_proposition TEXT;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS problem TEXT;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS solution TEXT;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS investment TEXT;

-- Add status columns for review workflow
ALTER TABLE startups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published'));
ALTER TABLE startups ADD COLUMN IF NOT EXISTS scraped_by TEXT; -- OpenAI source URL
ALTER TABLE startups ADD COLUMN IF NOT EXISTS reviewed_by TEXT; -- Admin who reviewed
ALTER TABLE startups ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_startups_status ON startups(status);

-- Update comments
COMMENT ON COLUMN startups.value_proposition IS 'Point 1: What value does this startup provide?';
COMMENT ON COLUMN startups.problem IS 'Point 2: What problem are they solving?';
COMMENT ON COLUMN startups.solution IS 'Point 3: How do they solve it?';
COMMENT ON COLUMN startups.team IS 'Point 4: Team background and former employers';
COMMENT ON COLUMN startups.investment IS 'Point 5: Funding raised or needed';
COMMENT ON COLUMN startups.status IS 'Workflow: pending (OpenAI scraped) -> approved (reviewed) -> published (live on site)';

-- Create view for admin review queue
CREATE OR REPLACE VIEW pending_startups AS
SELECT 
  id,
  name,
  website,
  value_proposition,
  problem,
  solution,
  team,
  investment,
  scraped_by,
  scraped_at,
  created_at
FROM startups
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Create view for published startups (what users see)
CREATE OR REPLACE VIEW published_startups AS
SELECT 
  id,
  name,
  website,
  value_proposition,
  problem,
  solution,
  team,
  investment,
  logo,
  published_at
FROM startups
WHERE status = 'published'
ORDER BY published_at DESC;

COMMENT ON VIEW pending_startups IS 'Admin queue: Startups scraped by OpenAI awaiting review';
COMMENT ON VIEW published_startups IS 'Public view: Approved startups visible on Hot Honey site';
