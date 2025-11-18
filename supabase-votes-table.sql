-- =============================================================================
-- HOT MONEY HONEY - VOTES TABLE FOR STARTUP_UPLOADS
-- =============================================================================
-- This creates a votes table that works with your existing startup_uploads table
-- Run this in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE VOTES TABLE (uses UUID to match startup_uploads)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startup_uploads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(startup_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 2. CREATE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_votes_startup_id ON votes(startup_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. CREATE VOTE COUNTS VIEW
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vote_counts AS
SELECT 
  startup_id,
  COUNT(*) FILTER (WHERE vote_type = 'yes') as yes_votes,
  COUNT(*) FILTER (WHERE vote_type = 'no') as no_votes,
  COUNT(*) as total_votes
FROM votes
GROUP BY startup_id;

-- -----------------------------------------------------------------------------
-- 4. ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Anyone can view votes
DROP POLICY IF EXISTS "Anyone can view votes" ON votes;
CREATE POLICY "Anyone can view votes"
  ON votes FOR SELECT
  USING (true);

-- Anyone can insert votes
DROP POLICY IF EXISTS "Anyone can insert votes" ON votes;
CREATE POLICY "Anyone can insert votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Users can update their own votes
DROP POLICY IF EXISTS "Users can update own votes" ON votes;
CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE
  USING (true);

-- Users can delete their own votes
DROP POLICY IF EXISTS "Users can delete own votes" ON votes;
CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (true);

-- -----------------------------------------------------------------------------
-- 5. ENABLE REALTIME
-- -----------------------------------------------------------------------------
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
-- Test with: SELECT * FROM vote_counts;
-- =============================================================================
