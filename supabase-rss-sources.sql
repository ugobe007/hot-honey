-- ============================================
-- RSS Sources Table Migration
-- ============================================
-- This creates the rss_sources table for managing news feeds
-- Run this in Supabase SQL Editor

-- Create RSS Sources table
CREATE TABLE IF NOT EXISTS rss_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Tech News',
  active BOOLEAN DEFAULT true,
  last_scraped TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for active sources
CREATE INDEX IF NOT EXISTS idx_rss_sources_active ON rss_sources(active);

-- Add index for last_scraped
CREATE INDEX IF NOT EXISTS idx_rss_sources_last_scraped ON rss_sources(last_scraped);

-- Insert default RSS sources
INSERT INTO rss_sources (name, url, category, active) VALUES
('TechCrunch', 'https://techcrunch.com/feed/', 'Tech News', true),
('VentureBeat', 'https://venturebeat.com/feed/', 'Tech News', true),
('The Information', 'https://www.theinformation.com/feed', 'Venture Capital', true),
('PitchBook', 'https://pitchbook.com/news/feed', 'Venture Capital', true),
('Crunchbase News', 'https://news.crunchbase.com/feed/', 'Startup News', true)
ON CONFLICT (url) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE rss_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to rss_sources" ON rss_sources;
DROP POLICY IF EXISTS "Allow authenticated users to manage rss_sources" ON rss_sources;

-- Allow public read access
CREATE POLICY "Allow public read access to rss_sources"
  ON rss_sources FOR SELECT
  USING (true);

-- Allow authenticated users to manage sources
CREATE POLICY "Allow authenticated users to manage rss_sources"
  ON rss_sources FOR ALL
  USING (auth.role() = 'authenticated');

-- Add table comment
COMMENT ON TABLE rss_sources IS 'RSS feed sources for news monitoring and article scraping';
