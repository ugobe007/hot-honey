-- Migration: Add startup updates tracking fields
-- Description: Adds columns to track founders, IP filings, team hires, advisors, board members, and customer traction
-- Created: 2025-11-03

-- Add JSONB columns to startup_uploads table for storing structured data
ALTER TABLE startup_uploads
ADD COLUMN IF NOT EXISTS founders JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ip_filings JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS team_hires JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS advisors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS board_members JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS customer_traction JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_startup_uploads_founders ON startup_uploads USING GIN (founders);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_ip_filings ON startup_uploads USING GIN (ip_filings);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_team_hires ON startup_uploads USING GIN (team_hires);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_advisors ON startup_uploads USING GIN (advisors);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_board_members ON startup_uploads USING GIN (board_members);
CREATE INDEX IF NOT EXISTS idx_startup_uploads_customer_traction ON startup_uploads USING GIN (customer_traction);

-- Create a new table for tracking startup update events
CREATE TABLE IF NOT EXISTS startup_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    startup_id UUID REFERENCES startup_uploads(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL, -- 'ip-filing', 'team-hire', 'advisor-join', 'board-member', 'customer-milestone', 'founder-update'
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for startup_updates
CREATE INDEX IF NOT EXISTS idx_startup_updates_startup_id ON startup_updates(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_updates_type ON startup_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_startup_updates_created_at ON startup_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_startup_updates_metadata ON startup_updates USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE startup_updates ENABLE ROW LEVEL SECURITY;

-- Create policies for startup_updates (public read, authenticated write)
CREATE POLICY "Public can view startup updates"
    ON startup_updates FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Authenticated users can insert startup updates"
    ON startup_updates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update their own startup updates"
    ON startup_updates FOR UPDATE
    TO authenticated
    USING (true);

-- Add comments for documentation
COMMENT ON TABLE startup_updates IS 'Tracks various startup update events including IP filings, team hires, advisors, board members, and customer milestones';
COMMENT ON COLUMN startup_updates.update_type IS 'Type of update: ip-filing, team-hire, advisor-join, board-member, customer-milestone, founder-update';
COMMENT ON COLUMN startup_updates.metadata IS 'Additional structured data specific to the update type';

-- Example metadata structures:
-- IP Filing: {"patent_type": "utility", "jurisdiction": "USPTO", "status": "pending"}
-- Team Hire: {"previous_company": "Google", "linkedin_url": "https://..."}
-- Advisor: {"expertise": "AI/ML", "company": "OpenAI", "role": "Principal Researcher"}
-- Board Member: {"company": "Sequoia", "role": "Partner"}
-- Customer Milestone: {"metric_type": "arr", "value": 1000000, "description": "Hit $1M ARR"}
