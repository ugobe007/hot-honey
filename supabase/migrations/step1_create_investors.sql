-- STEP 1: Create the investors table
-- Run this first, then check for success before moving to step 2

CREATE TABLE IF NOT EXISTS investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vc_firm', 'accelerator', 'angel_network', 'corporate_vc')),
  tagline TEXT,
  description TEXT,
  website TEXT,
  logo TEXT,
  linkedin TEXT,
  twitter TEXT,
  contact_email TEXT,
  aum TEXT,
  fund_size TEXT,
  check_size TEXT,
  stage JSONB,
  sectors JSONB,
  geography TEXT,
  portfolio_count INTEGER DEFAULT 0,
  exits INTEGER DEFAULT 0,
  unicorns INTEGER DEFAULT 0,
  notable_investments JSONB,
  hot_honey_investments INTEGER DEFAULT 0,
  hot_honey_startups JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verify the table was created
SELECT 'investors table created successfully!' as status;
