-- Activities Table Migration
-- Tracks all user and admin activities for feed display
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL, -- 'user_voted', 'startup_approved', 'startup_submitted', 'funding_announced'
  startup_id VARCHAR(100), -- Can be NULL for non-startup events
  user_id VARCHAR(100), -- Can be 'anonymous' for anonymous users
  user_name VARCHAR(100), -- Display name (anonymized if needed)
  vote_type VARCHAR(10), -- 'yes' or 'no' for vote events
  metadata JSONB, -- Additional data (e.g., {"amount": "$1M"} for funding)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for faster queries
  CONSTRAINT activities_event_type_check CHECK (
    event_type IN ('user_voted', 'startup_approved', 'startup_submitted', 'startup_rejected', 'funding_announced', 'milestone_reached')
  )
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_event_type ON activities(event_type);
CREATE INDEX IF NOT EXISTS idx_activities_startup_id ON activities(startup_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read activities (public feed)
CREATE POLICY "Activities are viewable by everyone" ON activities
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert their own activities
CREATE POLICY "Users can insert their own activities" ON activities
  FOR INSERT WITH CHECK (true); -- We'll handle auth in the app layer

-- Sample queries to test (commented out):
-- Get recent activities:
--   SELECT * FROM activities ORDER BY created_at DESC LIMIT 20;

-- Get votes in last hour:
--   SELECT COUNT(*) FROM activities 
--   WHERE event_type = 'user_voted' 
--   AND created_at > NOW() - INTERVAL '1 hour';

-- Get activities for a specific startup:
--   SELECT * FROM activities 
--   WHERE startup_id = '123' 
--   ORDER BY created_at DESC;

-- Get user voting activity:
--   SELECT user_name, startup_id, vote_type, created_at 
--   FROM activities 
--   WHERE event_type = 'user_voted' 
--   ORDER BY created_at DESC 
--   LIMIT 10;

COMMENT ON TABLE activities IS 'Tracks all user and system activities for the activity feed';
COMMENT ON COLUMN activities.event_type IS 'Type of activity: user_voted, startup_approved, etc.';
COMMENT ON COLUMN activities.metadata IS 'Additional JSON data specific to the event type';
COMMENT ON COLUMN activities.user_name IS 'Display name for feed (can be anonymized)';
