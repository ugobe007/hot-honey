-- =============================================================================
-- HOT MONEY HONEY - REACTIONS SYSTEM (Social Expression)
-- =============================================================================
-- Separate from voting system - thumbs up/down are social engagement only
-- Does NOT count toward stage advancement
-- Does NOT trigger notifications
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE REACTIONS TABLE (Social Thumbs Up/Down)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('thumbs_up', 'thumbs_down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One reaction per user per startup
  UNIQUE(user_id, startup_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_startup_id ON reactions(startup_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Everyone can read reactions (public)
DROP POLICY IF EXISTS "Public can read reactions" ON reactions;
CREATE POLICY "Public can read reactions"
  ON reactions FOR SELECT
  USING (true);

-- Users can insert their own reactions
DROP POLICY IF EXISTS "Users can insert own reactions" ON reactions;
CREATE POLICY "Users can insert own reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

-- Users can update their own reactions
DROP POLICY IF EXISTS "Users can update own reactions" ON reactions;
CREATE POLICY "Users can update own reactions"
  ON reactions FOR UPDATE
  USING (true);

-- Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete own reactions" ON reactions;
CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  USING (true);

-- -----------------------------------------------------------------------------
-- 3. CREATE REACTION COUNTS VIEW
-- -----------------------------------------------------------------------------
-- Aggregate reaction counts per startup for display
CREATE OR REPLACE VIEW reaction_counts AS
SELECT 
  startup_id,
  COUNT(*) FILTER (WHERE reaction_type = 'thumbs_up') AS thumbs_up_count,
  COUNT(*) FILTER (WHERE reaction_type = 'thumbs_down') AS thumbs_down_count,
  COUNT(*) AS total_reactions
FROM reactions
GROUP BY startup_id;

-- -----------------------------------------------------------------------------
-- 4. HELPER FUNCTION: UPDATE TIMESTAMP ON CHANGE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_reactions_timestamp ON reactions;
CREATE TRIGGER trigger_update_reactions_timestamp
  BEFORE UPDATE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_reactions_updated_at();

-- -----------------------------------------------------------------------------
-- 5. COMMENTS FOR DOCUMENTATION
-- -----------------------------------------------------------------------------
COMMENT ON TABLE reactions IS 'Social reactions (thumbs up/down) - NOT official votes. Does not affect stage advancement.';
COMMENT ON COLUMN reactions.reaction_type IS 'Either thumbs_up or thumbs_down - social expression only';
COMMENT ON VIEW reaction_counts IS 'Aggregated reaction counts per startup for display purposes';

-- -----------------------------------------------------------------------------
-- DONE! Reactions system is now separate from voting system.
-- =============================================================================
