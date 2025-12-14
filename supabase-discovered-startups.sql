-- ============================================
-- Discovered Startups Table Migration
-- ============================================
-- This creates the discovered_startups table for storing startups found via RSS scraping
-- These can be bulk imported into the main startups table
-- Run this in Supabase SQL Editor

-- Create Discovered Startups table
CREATE TABLE IF NOT EXISTS discovered_startups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Company basic info
  name TEXT NOT NULL,
  website TEXT,
  description TEXT,
  
  -- Funding information (from RSS article)
  funding_amount TEXT,
  funding_stage TEXT,
  investors_mentioned TEXT[], -- Array of investor names from article
  
  -- Source tracking
  discovered_from_article_id UUID REFERENCES rss_articles(id) ON DELETE SET NULL,
  article_url TEXT,
  article_title TEXT,
  article_date TIMESTAMPTZ,
  rss_source TEXT,
  
  -- Status tracking
  imported_to_startups BOOLEAN DEFAULT false,
  imported_at TIMESTAMPTZ,
  startup_id UUID, -- Reference to startups table if imported
  
  -- Verification
  website_verified BOOLEAN DEFAULT false,
  website_status TEXT, -- 'active', 'error', 'not_checked'
  
  -- Timestamps
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_discovered_startups_name ON discovered_startups(name);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_website ON discovered_startups(website);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_imported ON discovered_startups(imported_to_startups);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_discovered_at ON discovered_startups(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_rss_source ON discovered_startups(rss_source);
CREATE INDEX IF NOT EXISTS idx_discovered_startups_article_id ON discovered_startups(discovered_from_article_id);

-- Unique constraint to prevent duplicates (by name and website)
CREATE UNIQUE INDEX IF NOT EXISTS idx_discovered_startups_unique ON discovered_startups(LOWER(name), COALESCE(LOWER(website), ''));

-- Enable Row Level Security
ALTER TABLE discovered_startups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to discovered startups" ON discovered_startups;
DROP POLICY IF EXISTS "Allow authenticated users to read discovered startups" ON discovered_startups;
DROP POLICY IF EXISTS "Allow authenticated users to insert discovered startups" ON discovered_startups;
DROP POLICY IF EXISTS "Allow authenticated users to update discovered startups" ON discovered_startups;
DROP POLICY IF EXISTS "Allow service role full access to discovered startups" ON discovered_startups;

-- Policy: Allow public (anon) to read - so admin panel works without login
CREATE POLICY "Allow public read access to discovered startups"
  ON discovered_startups
  FOR SELECT
  TO public
  USING (true);

-- Policy: Allow public (anon) to insert
CREATE POLICY "Allow public insert to discovered startups"
  ON discovered_startups
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert discovered startups"
  ON discovered_startups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow public (anon) to update - needed for marking as imported
CREATE POLICY "Allow public update to discovered startups"
  ON discovered_startups
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update discovered startups"
  ON discovered_startups
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access to discovered startups"
  ON discovered_startups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discovered_startups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_discovered_startups_updated_at ON discovered_startups;
CREATE TRIGGER set_discovered_startups_updated_at
  BEFORE UPDATE ON discovered_startups
  FOR EACH ROW
  EXECUTE FUNCTION update_discovered_startups_updated_at();

-- Indexes for full text search
CREATE INDEX IF NOT EXISTS idx_discovered_startups_search 
  ON discovered_startups 
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

COMMENT ON TABLE discovered_startups IS 'Stores startups discovered through RSS feed scraping, ready for bulk import into the main startups table';
COMMENT ON COLUMN discovered_startups.imported_to_startups IS 'True if this startup has been imported into the main startups table';
COMMENT ON COLUMN discovered_startups.startup_id IS 'Reference to the startups table record if imported';
