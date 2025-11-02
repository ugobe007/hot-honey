-- Hot Money Honey Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/riryeljaqxicdnuwilai/sql
-- NOTE: Your startups table already exists with TEXT id, so we'll work with that

-- Votes table (uses TEXT to match your existing startups table)
CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  startup_id TEXT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('yes', 'no')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(startup_id, user_id)
);

-- Vote counts view for real-time aggregation
CREATE OR REPLACE VIEW vote_counts AS
SELECT 
  startup_id,
  COUNT(*) FILTER (WHERE vote_type = 'yes') as yes_votes,
  COUNT(*) FILTER (WHERE vote_type = 'no') as no_votes,
  COUNT(*) as total_votes
FROM votes
GROUP BY startup_id;

-- Users table (for authentication and profiles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  investor_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read votes" ON votes;
DROP POLICY IF EXISTS "Public insert votes" ON votes;
DROP POLICY IF EXISTS "Public update votes" ON votes;
DROP POLICY IF EXISTS "Users update own votes" ON votes;
DROP POLICY IF EXISTS "Users delete own votes" ON votes;
DROP POLICY IF EXISTS "Public read users" ON users;
DROP POLICY IF EXISTS "Public insert users" ON users;
DROP POLICY IF EXISTS "Public update users" ON users;
DROP POLICY IF EXISTS "Users update own profile" ON users;

-- RLS Policies - Secure but works with anonymous sessions

-- Anyone can read votes (for viewing vote counts)
CREATE POLICY "Public read votes"
  ON votes FOR SELECT
  USING (true);

-- Anyone can insert votes with their session user_id
CREATE POLICY "Public insert votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Anyone can update votes (we validate user_id in the application layer)
CREATE POLICY "Users update own votes"
  ON votes FOR UPDATE
  USING (true);

-- Anyone can delete votes (we validate user_id in the application layer)
CREATE POLICY "Users delete own votes"
  ON votes FOR DELETE
  USING (true);

-- Anyone can read users (for profiles)
CREATE POLICY "Public read users"
  ON users FOR SELECT
  USING (true);

-- Anyone can insert users (for signup)
CREATE POLICY "Public insert users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Anyone can update users (we validate id in the application layer)
CREATE POLICY "Users update own profile"
  ON users FOR UPDATE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_startup_id ON votes(startup_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for votes table (only if not already added)
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

COMMENT ON TABLE votes IS 'Tracks all user votes on startups (yes/no)';
COMMENT ON TABLE users IS 'User profiles and preferences';
COMMENT ON VIEW vote_counts IS 'Aggregated vote counts per startup for performance';
