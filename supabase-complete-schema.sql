-- =============================================================================
-- HOT MONEY HONEY - COMPLETE DATABASE SCHEMA
-- =============================================================================
-- This combines the original voting schema + OpenAI integration
-- Run this ONCE in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: CORE TABLES (Votes, Users, Startups)
-- -----------------------------------------------------------------------------

-- Startups table (base structure)
CREATE TABLE IF NOT EXISTS startups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated BOOLEAN DEFAULT false
);

-- Add all startup columns
ALTER TABLE startups 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS five_points TEXT[5],
ADD COLUMN IF NOT EXISTS value_proposition TEXT,
ADD COLUMN IF NOT EXISTS problem TEXT,
ADD COLUMN IF NOT EXISTS solution TEXT,
ADD COLUMN IF NOT EXISTS team TEXT,
ADD COLUMN IF NOT EXISTS investment TEXT,
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS pitch TEXT,
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'Seed',
ADD COLUMN IF NOT EXISTS funding TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS pitch_deck_url TEXT,
ADD COLUMN IF NOT EXISTS scraped_by TEXT,
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'startup',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- Votes table (uses TEXT to match startups table)
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(startup_id, user_id)
);

-- Users table (for authentication and profiles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  investor_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- PART 2: VIEWS
-- -----------------------------------------------------------------------------

-- Drop existing views first to avoid type mismatch errors
DROP VIEW IF EXISTS published_startups CASCADE;
DROP VIEW IF EXISTS vote_counts CASCADE;

-- Vote counts view for real-time aggregation
CREATE VIEW vote_counts AS
SELECT 
  startup_id::TEXT as startup_id,
  COUNT(*) FILTER (WHERE vote_type = 'yes') as yes_votes,
  COUNT(*) FILTER (WHERE vote_type = 'no') as no_votes,
  COUNT(*) as total_votes
FROM votes
GROUP BY startup_id;

-- Pending startups (admin review queue)
CREATE OR REPLACE VIEW pending_startups AS
SELECT 
  id,
  name,
  website,
  logo,
  tagline,
  pitch,
  five_points,
  value_proposition,
  problem,
  solution,
  team,
  investment,
  stage,
  funding,
  industry,
  pitch_deck_url,
  scraped_by,
  scraped_at,
  entity_type,
  status
FROM startups
WHERE status = 'pending' AND entity_type = 'startup'
ORDER BY scraped_at DESC;

-- Published startups (live voting page)
CREATE VIEW published_startups AS
SELECT 
  s.id,
  s.name,
  s.website,
  s.logo,
  s.tagline,
  s.pitch,
  s.five_points,
  s.value_proposition,
  s.problem,
  s.solution,
  s.team,
  s.investment,
  s.stage,
  s.funding,
  s.industry,
  s.pitch_deck_url,
  s.published_at,
  s.scraped_by,
  COALESCE(vc.yes_votes, 0) AS yes_votes,
  COALESCE(vc.no_votes, 0) AS no_votes,
  COALESCE(vc.total_votes, 0) AS total_votes
FROM startups s
LEFT JOIN vote_counts vc ON s.id = vc.startup_id
WHERE s.status = 'published' AND s.entity_type = 'startup'
ORDER BY s.published_at DESC;

-- -----------------------------------------------------------------------------
-- PART 3: INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_votes_startup_id ON votes(startup_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startups_status ON startups(status);
CREATE INDEX IF NOT EXISTS idx_startups_entity_type ON startups(entity_type);
CREATE INDEX IF NOT EXISTS idx_startups_scraped_at ON startups(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_startups_published_at ON startups(published_at DESC);

-- -----------------------------------------------------------------------------
-- PART 4: ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read votes" ON votes;
DROP POLICY IF EXISTS "Public insert votes" ON votes;
DROP POLICY IF EXISTS "Users update own votes" ON votes;
DROP POLICY IF EXISTS "Users delete own votes" ON votes;
DROP POLICY IF EXISTS "Public read users" ON users;
DROP POLICY IF EXISTS "Public insert users" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view published startups" ON startups;
DROP POLICY IF EXISTS "Anyone can upload scraped startups" ON startups;
DROP POLICY IF EXISTS "Admins can update startups" ON startups;

-- Votes policies
CREATE POLICY "Public read votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Public insert votes"
  ON votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users update own votes"
  ON votes FOR UPDATE
  USING (true);

CREATE POLICY "Users delete own votes"
  ON votes FOR DELETE
  USING (true);

-- Users policies
CREATE POLICY "Public read users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Public insert users"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users update own profile"
  ON users FOR UPDATE
  USING (true);

-- Startups policies
CREATE POLICY "Anyone can view published startups"
  ON startups FOR SELECT
  USING (status = 'published');

CREATE POLICY "Anyone can upload scraped startups"
  ON startups FOR INSERT
  WITH CHECK (status = 'pending');

CREATE POLICY "Admins can update startups"
  ON startups FOR UPDATE
  USING (true);

-- -----------------------------------------------------------------------------
-- PART 5: FUNCTIONS
-- -----------------------------------------------------------------------------

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Approve and publish startup
CREATE OR REPLACE FUNCTION approve_and_publish_startup(
  startup_id_param TEXT,
  reviewed_by_param TEXT
)
RETURNS SETOF startups AS $$
BEGIN
  RETURN QUERY
  UPDATE startups
  SET 
    status = 'published',
    validated = true,
    reviewed_by = reviewed_by_param,
    reviewed_at = NOW(),
    published_at = NOW()
  WHERE id = startup_id_param
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject a scraped startup
CREATE OR REPLACE FUNCTION reject_startup(
  startup_id_param TEXT,
  reviewed_by_param TEXT
)
RETURNS SETOF startups AS $$
BEGIN
  RETURN QUERY
  UPDATE startups
  SET 
    status = 'rejected',
    reviewed_by = reviewed_by_param,
    reviewed_at = NOW()
  WHERE id = startup_id_param
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- PART 6: REALTIME
-- -----------------------------------------------------------------------------

-- Enable realtime for votes table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- COMPLETE! 
-- -----------------------------------------------------------------------------
-- Next steps:
-- 1. Update BulkImport.tsx to use OpenAIDataService
-- 2. Update Submit.tsx to use OpenAIDataService
-- 3. Update VotePage.tsx to fetch from published_startups view
-- 4. Create /admin/review page
-- =============================================================================
