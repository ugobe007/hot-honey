-- ============================================
-- INVESTOR NEWS & ENRICHMENT SCHEMA
-- ============================================
-- Add news feed capabilities to investors table
-- Run this in Supabase SQL Editor

-- 1. Add news-related columns to investors table
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS news_feed_url TEXT,
ADD COLUMN IF NOT EXISTS last_news_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS blog_url TEXT,
ADD COLUMN IF NOT EXISTS crunchbase_url TEXT,
ADD COLUMN IF NOT EXISTS partners JSONB, -- Array of partner objects with name, title, linkedin, focus areas
ADD COLUMN IF NOT EXISTS focus_areas JSONB, -- Array of detailed focus areas/thesis
ADD COLUMN IF NOT EXISTS portfolio_companies JSONB, -- Array of portfolio companies with details
ADD COLUMN IF NOT EXISTS startup_advice JSONB, -- Array of advice/insights from partners
ADD COLUMN IF NOT EXISTS last_enrichment_date TIMESTAMP WITH TIME ZONE;

-- 2. Create investor_news table for storing scraped news articles
CREATE TABLE IF NOT EXISTS investor_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Article details
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  published_date TIMESTAMP WITH TIME ZONE,
  scraped_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  source TEXT, -- 'TechCrunch', 'VentureBeat', 'Twitter', 'Blog', etc.
  source_type TEXT, -- 'news', 'blog', 'press_release', 'social'
  author TEXT,
  image_url TEXT,
  
  -- Sentiment & Analysis (for AI enrichment)
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  topics JSONB, -- ['funding', 'new_hire', 'portfolio_update']
  entities JSONB, -- ['startup_name', 'person_name', 'round_type']
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate articles
  UNIQUE(investor_id, url)
);

-- 3. Create investor_activity table for tracking recent actions
CREATE TABLE IF NOT EXISTS investor_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL, -- 'investment', 'exit', 'hire', 'announcement'
  title TEXT NOT NULL,
  description TEXT,
  startup_id UUID REFERENCES startup_uploads(id), -- If related to a startup
  
  -- Metadata
  amount TEXT, -- Investment amount
  round_type TEXT, -- 'Seed', 'Series A', etc.
  date TIMESTAMP WITH TIME ZONE,
  source_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for fast lookups
  CONSTRAINT investor_activity_type_check 
    CHECK (activity_type IN ('investment', 'exit', 'hire', 'announcement', 'fund_raise', 'portfolio_update'))
);

-- 3b. Create investor_partners table for detailed partner information
CREATE TABLE IF NOT EXISTS investor_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Partner details
  name TEXT NOT NULL,
  title TEXT, -- 'Managing Partner', 'General Partner', 'Venture Partner'
  bio TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  email TEXT,
  
  -- Investment focus
  focus_areas JSONB, -- ['AI/ML', 'Healthcare', 'Fintech']
  stage_preference JSONB, -- ['Seed', 'Series A']
  geography_focus JSONB, -- ['US West Coast', 'Europe']
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  joined_date DATE,
  image_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(investor_id, name)
);

-- 3c. Create investor_investments table for portfolio tracking
CREATE TABLE IF NOT EXISTS investor_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES investor_partners(id), -- Which partner led
  startup_id UUID REFERENCES startup_uploads(id), -- If startup is in our system
  
  -- Investment details
  company_name TEXT NOT NULL,
  company_description TEXT,
  company_url TEXT,
  investment_date DATE,
  round_type TEXT, -- 'Seed', 'Series A', 'Series B'
  amount TEXT, -- '$5M', 'Undisclosed'
  valuation TEXT,
  
  -- Investment metadata
  is_lead BOOLEAN DEFAULT false,
  co_investors JSONB, -- Array of co-investor names
  industries JSONB, -- ['AI', 'Healthcare']
  status TEXT DEFAULT 'active', -- 'active', 'exited', 'acquired', 'failed'
  exit_date DATE,
  exit_details TEXT,
  
  -- Source tracking
  source_url TEXT,
  scraped_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(investor_id, company_name, investment_date)
);

-- 3d. Create investor_advice table for startup advice/insights
CREATE TABLE IF NOT EXISTS investor_advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES investor_partners(id), -- Which partner gave advice
  
  -- Advice details
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'fundraising', 'product', 'hiring', 'growth', 'general'
  tags JSONB, -- ['pitch-deck', 'metrics', 'term-sheet']
  
  -- Source
  source_type TEXT, -- 'blog', 'interview', 'podcast', 'tweet', 'linkedin'
  source_url TEXT,
  published_date DATE,
  
  -- Engagement
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_investor_news_investor_id ON investor_news(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_news_published_date ON investor_news(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_investor_news_source ON investor_news(source);
CREATE INDEX IF NOT EXISTS idx_investor_activity_investor_id ON investor_activity(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_activity_date ON investor_activity(date DESC);
CREATE INDEX IF NOT EXISTS idx_investor_activity_startup_id ON investor_activity(startup_id);
CREATE INDEX IF NOT EXISTS idx_investor_partners_investor_id ON investor_partners(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_partners_active ON investor_partners(is_active);
CREATE INDEX IF NOT EXISTS idx_investor_investments_investor_id ON investor_investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_investments_date ON investor_investments(investment_date DESC);
CREATE INDEX IF NOT EXISTS idx_investor_investments_status ON investor_investments(status);
CREATE INDEX IF NOT EXISTS idx_investor_advice_investor_id ON investor_advice(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_advice_category ON investor_advice(category);
CREATE INDEX IF NOT EXISTS idx_investor_advice_featured ON investor_advice(is_featured);

-- 5. Drop existing view if it exists, then create fresh view
DROP VIEW IF EXISTS investor_profile_enriched CASCADE;

-- Create view for investor profile with latest news
CREATE VIEW investor_profile_enriched AS
SELECT 
  i.*,
  (
    SELECT json_agg(
      json_build_object(
        'id', n.id,
        'title', n.title,
        'url', n.url,
        'summary', n.summary,
        'published_date', n.published_date,
        'source', n.source,
        'sentiment', n.sentiment
      ) ORDER BY n.published_date DESC
    )
    FROM (
      SELECT * FROM investor_news 
      WHERE investor_id = i.id 
        AND is_published = true
      ORDER BY published_date DESC 
      LIMIT 10
    ) n
  ) AS recent_news,
  (
    SELECT json_agg(
      json_build_object(
        'id', a.id,
        'type', a.activity_type,
        'title', a.title,
        'description', a.description,
        'date', a.date,
        'amount', a.amount,
        'round_type', a.round_type
      ) ORDER BY a.date DESC
    )
    FROM (
      SELECT * FROM investor_activity 
      WHERE investor_id = i.id 
      ORDER BY date DESC 
      LIMIT 5
    ) a
  ) AS recent_activity
FROM investors i;

-- 6. Create function to update last_news_update timestamp
CREATE OR REPLACE FUNCTION update_investor_news_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE investors 
  SET last_news_update = NOW() 
  WHERE id = NEW.investor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- 8. Enable RLS (Row Level Security)
ALTER TABLE investor_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_advice ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies and create fresh ones
DROP POLICY IF EXISTS "Enable read access for all users" ON investor_news;
DROP POLICY IF EXISTS "Enable read access for all users" ON investor_activity;
DROP POLICY IF EXISTS "Enable read access for all users" ON investor_partners;
DROP POLICY IF EXISTS "Enable read access for all users" ON investor_investments;
DROP POLICY IF EXISTS "Enable read access for all users" ON investor_advice;

-- Create policies for public read access
CREATE POLICY "Enable read access for all users" ON investor_news
  FOR SELECT USING (is_published = true);

CREATE POLICY "Enable read access for all users" ON investor_activity
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON investor_partners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Enable read access for all users" ON investor_investments
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON investor_advice
  FOR SELECT USING (true);

-- 10. Insert sample data for testing
INSERT INTO investor_partners (investor_id, name, title, bio, focus_areas, stage_preference)
SELECT 
  i.id,
  'Keith Rabois',
  'General Partner',
  'Former COO of Square, VP at LinkedIn. Focus on fintech and consumer applications.',
  '["Fintech", "Consumer", "Marketplace"]'::jsonb,
  '["Seed", "Series A"]'::jsonb
FROM investors i 
WHERE i.name = 'Founders Fund'
LIMIT 1
ON CONFLICT (investor_id, name) DO NOTHING;

INSERT INTO investor_investments (investor_id, company_name, company_description, investment_date, round_type, amount, industries)
SELECT 
  i.id,
  'Stripe',
  'Online payment processing platform',
  '2012-07-09',
  'Series A',
  '$20M',
  '["Fintech", "Payments"]'::jsonb
FROM investors i 
WHERE i.name = 'Founders Fund'
LIMIT 1
ON CONFLICT (investor_id, company_name, investment_date) DO NOTHING;

INSERT INTO investor_advice (investor_id, title, content, category, tags, source_type, source_url)
SELECT 
  i.id,
  'What to Look for in a Pitch Deck',
  'The most important thing in a pitch deck is clarity of thought. We want to see that you understand your market, your customers, and your unique advantage. Focus on the problem you''re solving and why now is the right time.',
  'fundraising',
  '["pitch-deck", "fundraising", "storytelling"]'::jsonb,
  'blog',
  'https://foundersfund.com/blog/pitch-deck-advice'
FROM investors i 
WHERE i.name = 'Founders Fund'
LIMIT 1;

-- 12. Verify the setup
SELECT 
  'investors table columns' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'investors'
  AND column_name IN ('news_feed_url', 'last_news_update', 'twitter_handle', 'linkedin_url', 'partners', 'focus_areas')
ORDER BY column_name;

SELECT 'investor_news table' as check_name, COUNT(*) as count FROM investor_news;
SELECT 'investor_activity table' as check_name, COUNT(*) as count FROM investor_activity;
SELECT 'investor_partners table' as check_name, COUNT(*) as count FROM investor_partners;
SELECT 'investor_investments table' as check_name, COUNT(*) as count FROM investor_investments;
SELECT 'investor_advice table' as check_name, COUNT(*) as count FROM investor_advice;

-- Success message
SELECT '✅ Enhanced investor schema with partners, investments, and advice created successfully!' as status;
