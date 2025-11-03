-- Data Intelligence Tables
-- Run these SQL commands in your Supabase SQL editor

-- Table for funding data
CREATE TABLE IF NOT EXISTS funding_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  round_type TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  investors TEXT[] DEFAULT '{}',
  valuation TEXT,
  description TEXT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for crawled startups
CREATE TABLE IF NOT EXISTS crawled_startups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  description TEXT NOT NULL,
  industry TEXT[] DEFAULT '{}',
  founded_year TEXT,
  location TEXT,
  team_size TEXT,
  founders TEXT[] DEFAULT '{}',
  founder_backgrounds TEXT[] DEFAULT '{}',
  recent_news TEXT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for investor data
CREATE TABLE IF NOT EXISTS investor_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vc_firm', 'angel', 'accelerator')),
  recent_investments TEXT[] DEFAULT '{}',
  investment_count INTEGER DEFAULT 0,
  focus_stages TEXT[] DEFAULT '{}',
  focus_industries TEXT[] DEFAULT '{}',
  portfolio_size INTEGER,
  notable_exits TEXT[] DEFAULT '{}',
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for hot deals
CREATE TABLE IF NOT EXISTS hot_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('funding', 'acquisition', 'ipo', 'hot_news')),
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  amount TEXT,
  significance TEXT NOT NULL CHECK (significance IN ('high', 'medium', 'low')),
  trending_score NUMERIC DEFAULT 0,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for daily reports
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metrics
  total_funding_announcements INTEGER DEFAULT 0,
  total_funding_amount TEXT,
  new_startups_discovered INTEGER DEFAULT 0,
  active_investors INTEGER DEFAULT 0,
  hot_deals INTEGER DEFAULT 0,
  
  -- Top items (stored as JSONB)
  top_fundings JSONB DEFAULT '[]',
  top_startups JSONB DEFAULT '[]',
  top_investors JSONB DEFAULT '[]',
  hot_deals_list JSONB DEFAULT '[]',
  
  -- Trends
  trending_industries JSONB DEFAULT '[]',
  trending_investors JSONB DEFAULT '[]',
  average_round_size JSONB DEFAULT '{}',
  
  -- Insights
  insights TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_funding_data_date ON funding_data(date DESC);
CREATE INDEX IF NOT EXISTS idx_funding_data_crawled_at ON funding_data(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawled_startups_crawled_at ON crawled_startups(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_investor_data_crawled_at ON investor_data(crawled_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_deals_published_date ON hot_deals(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_hot_deals_trending_score ON hot_deals(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE funding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policies (allow read for all authenticated users, write for admins only)
-- Note: Adjust these policies based on your authentication setup

-- Read policies (everyone can read)
CREATE POLICY "Allow read access to funding_data" ON funding_data FOR SELECT USING (true);
CREATE POLICY "Allow read access to crawled_startups" ON crawled_startups FOR SELECT USING (true);
CREATE POLICY "Allow read access to investor_data" ON investor_data FOR SELECT USING (true);
CREATE POLICY "Allow read access to hot_deals" ON hot_deals FOR SELECT USING (true);
CREATE POLICY "Allow read access to daily_reports" ON daily_reports FOR SELECT USING (true);

-- Write policies (admin only - adjust based on your auth setup)
-- Example: Check if user email contains 'admin' or specific domain
CREATE POLICY "Allow admin insert to funding_data" ON funding_data 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%admin%' OR 
    auth.jwt() ->> 'email' LIKE '%@yourdomain.com'
  );

CREATE POLICY "Allow admin insert to crawled_startups" ON crawled_startups 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%admin%' OR 
    auth.jwt() ->> 'email' LIKE '%@yourdomain.com'
  );

CREATE POLICY "Allow admin insert to investor_data" ON investor_data 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%admin%' OR 
    auth.jwt() ->> 'email' LIKE '%@yourdomain.com'
  );

CREATE POLICY "Allow admin insert to hot_deals" ON hot_deals 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%admin%' OR 
    auth.jwt() ->> 'email' LIKE '%@yourdomain.com'
  );

CREATE POLICY "Allow admin insert to daily_reports" ON daily_reports 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%admin%' OR 
    auth.jwt() ->> 'email' LIKE '%@yourdomain.com'
  );

-- Grant permissions
GRANT ALL ON funding_data TO authenticated;
GRANT ALL ON crawled_startups TO authenticated;
GRANT ALL ON investor_data TO authenticated;
GRANT ALL ON hot_deals TO authenticated;
GRANT ALL ON daily_reports TO authenticated;

-- Create a function to clean up old crawled data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_crawled_data()
RETURNS void AS $$
BEGIN
  -- Delete data older than 90 days
  DELETE FROM funding_data WHERE crawled_at < NOW() - INTERVAL '90 days';
  DELETE FROM crawled_startups WHERE crawled_at < NOW() - INTERVAL '90 days';
  DELETE FROM investor_data WHERE crawled_at < NOW() - INTERVAL '90 days';
  DELETE FROM hot_deals WHERE crawled_at < NOW() - INTERVAL '90 days';
  
  -- Keep daily reports for 1 year
  DELETE FROM daily_reports WHERE date < CURRENT_DATE - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run monthly) - requires pg_cron extension
-- SELECT cron.schedule('cleanup-crawled-data', '0 0 1 * *', 'SELECT cleanup_old_crawled_data()');
