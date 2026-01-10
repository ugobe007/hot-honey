-- Migration: Create startup_investor_matches Table (Robust Version - FIXED)
-- Description: Creates the table for storing pre-calculated matches between startups and investors
-- Created: 2025-01-09
-- IMPORTANT: Run this migration via Supabase Dashboard SQL Editor

-- Step 1: Drop table if it exists (to avoid conflicts)
-- Uncomment the line below if you want to recreate the table from scratch
-- DROP TABLE IF EXISTS startup_investor_matches CASCADE;

-- Step 2: Create the table WITHOUT foreign keys first (to avoid dependency issues)
CREATE TABLE IF NOT EXISTS startup_investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (as UUIDs, will add constraints later)
  startup_id UUID NOT NULL,
  investor_id UUID NOT NULL,
  
  -- Match Quality Metrics
  match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  confidence_level VARCHAR(20) CHECK (confidence_level IN ('high', 'medium', 'low')),
  similarity_score DECIMAL(5,2),
  success_score DECIMAL(5,2),
  
  -- Match Reasoning
  reasoning TEXT,
  why_you_match TEXT[],
  fit_analysis JSONB,
  
  -- Match Status
  status VARCHAR(50) DEFAULT 'suggested' CHECK (status IN (
    'suggested', 
    'viewed', 
    'saved', 
    'contacted', 
    'meeting_scheduled', 
    'rejected',
    'interested',
    'not_interested',
    'funded'
  )),
  
  -- Engagement Tracking
  viewed_at TIMESTAMPTZ,
  intro_requested_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  last_interaction TIMESTAMPTZ,
  
  -- Email Content
  intro_email_subject TEXT,
  intro_email_body TEXT,
  
  -- Metadata
  feedback_received BOOLEAN DEFAULT FALSE,
  user_id UUID, -- Make sure this column exists
  created_by VARCHAR(50) DEFAULT 'god_algorithm',
  algorithm_version VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate matches
  UNIQUE(startup_id, investor_id)
);

-- Step 3: Add foreign key constraints (only if referenced tables exist AND columns exist)
DO $$
BEGIN
  -- Check if startup_uploads table exists and add FK constraint
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'startup_uploads') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fk_startup_investor_matches_startup'
    ) THEN
      ALTER TABLE startup_investor_matches
      ADD CONSTRAINT fk_startup_investor_matches_startup 
      FOREIGN KEY (startup_id) REFERENCES startup_uploads(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint for startup_uploads';
    END IF;
  ELSE
    RAISE WARNING 'startup_uploads table does not exist. Foreign key constraint not added.';
  END IF;

  -- Check if investors table exists and add FK constraint
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'investors') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fk_startup_investor_matches_investor'
    ) THEN
      ALTER TABLE startup_investor_matches
      ADD CONSTRAINT fk_startup_investor_matches_investor 
      FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint for investors';
    END IF;
  ELSE
    RAISE WARNING 'investors table does not exist. Foreign key constraint not added.';
  END IF;

  -- Check if auth.users exists AND user_id column exists, then add FK constraint
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'startup_investor_matches' 
      AND column_name = 'user_id'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_startup_investor_matches_user'
      ) THEN
        ALTER TABLE startup_investor_matches
        ADD CONSTRAINT fk_startup_investor_matches_user 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint for auth.users';
      END IF;
    ELSE
      RAISE WARNING 'user_id column does not exist in startup_investor_matches. Skipping FK constraint.';
    END IF;
  ELSE
    RAISE WARNING 'auth.users table does not exist. Foreign key constraint not added.';
  END IF;
END $$;

-- Step 4: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_startup_investor_matches_startup_id 
ON startup_investor_matches(startup_id);

CREATE INDEX IF NOT EXISTS idx_startup_investor_matches_investor_id 
ON startup_investor_matches(investor_id);

CREATE INDEX IF NOT EXISTS idx_startup_investor_matches_match_score 
ON startup_investor_matches(match_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_startup_investor_matches_status 
ON startup_investor_matches(status) WHERE status = 'suggested';

CREATE INDEX IF NOT EXISTS idx_startup_investor_matches_created_at 
ON startup_investor_matches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_startup_investor_matches_status_score 
ON startup_investor_matches(status, match_score DESC NULLS LAST) 
WHERE status = 'suggested';

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE startup_investor_matches ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to matches" ON startup_investor_matches;
DROP POLICY IF EXISTS "Allow public insert on matches" ON startup_investor_matches;
DROP POLICY IF EXISTS "Allow public update on matches" ON startup_investor_matches;

-- Step 7: Create RLS Policies
CREATE POLICY "Allow public read access to matches"
  ON startup_investor_matches FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on matches"
  ON startup_investor_matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on matches"
  ON startup_investor_matches FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 8: Add comments
COMMENT ON TABLE startup_investor_matches IS 'Stores pre-calculated matches between startups and investors, generated by the queue processor';
COMMENT ON COLUMN startup_investor_matches.match_score IS 'Match score from 0-100, calculated by the matching algorithm';
COMMENT ON COLUMN startup_investor_matches.status IS 'Match status: suggested, viewed, saved, contacted, meeting_scheduled, rejected, funded';

-- Success message
SELECT 'startup_investor_matches table created successfully!' as status;
