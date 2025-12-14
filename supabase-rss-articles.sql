-- ============================================
-- RSS Articles Table Migration
-- ============================================
-- This creates the rss_articles table for storing scraped articles
-- Run this in Supabase SQL Editor

-- Create RSS Articles table
CREATE TABLE IF NOT EXISTS rss_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Article metadata
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  content TEXT,
  summary TEXT,
  
  -- Source information
  source TEXT NOT NULL,
  source_id UUID REFERENCES rss_sources(id) ON DELETE CASCADE,
  
  -- Publication info
  published_at TIMESTAMPTZ,
  author TEXT,
  categories TEXT[],
  
  -- AI-extracted data
  companies_mentioned TEXT[],
  investors_mentioned TEXT[],
  funding_amounts TEXT[],
  ai_analyzed BOOLEAN DEFAULT false,
  ai_summary TEXT,
  
  -- Timestamps
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rss_articles_source ON rss_articles(source);
CREATE INDEX IF NOT EXISTS idx_rss_articles_source_id ON rss_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_rss_articles_published_at ON rss_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_articles_scraped_at ON rss_articles(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_articles_url ON rss_articles(url);
CREATE INDEX IF NOT EXISTS idx_rss_articles_ai_analyzed ON rss_articles(ai_analyzed);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_rss_articles_content_search ON rss_articles USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Enable Row Level Security
ALTER TABLE rss_articles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to rss_articles" ON rss_articles;
DROP POLICY IF EXISTS "Allow authenticated users to manage rss_articles" ON rss_articles;

-- Allow public read access
CREATE POLICY "Allow public read access to rss_articles"
  ON rss_articles FOR SELECT
  USING (true);

-- Allow authenticated users to manage articles
CREATE POLICY "Allow authenticated users to manage rss_articles"
  ON rss_articles FOR ALL
  USING (auth.role() = 'authenticated');

-- Add table comment
COMMENT ON TABLE rss_articles IS 'Scraped articles from RSS feeds for news monitoring and AI analysis';

-- Grant permissions
GRANT SELECT ON rss_articles TO anon, authenticated;
GRANT ALL ON rss_articles TO authenticated, service_role;
