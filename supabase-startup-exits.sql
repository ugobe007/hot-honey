-- ============================================
-- Startup Exits Table
-- ============================================
-- Tracks mergers, acquisitions, and IPOs
-- Links to startups and investors for portfolio performance tracking

CREATE TABLE IF NOT EXISTS startup_exits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Startup reference
  startup_id UUID REFERENCES startup_uploads(id) ON DELETE SET NULL,
  startup_name TEXT NOT NULL,
  
  -- Exit details
  exit_type TEXT NOT NULL CHECK (exit_type IN ('acquisition', 'merger', 'ipo', 'spac', 'direct_listing')),
  exit_date DATE,
  exit_value TEXT, -- e.g., "$1.2B", "$500M", "Undisclosed"
  exit_value_numeric NUMERIC, -- Numeric value in USD for sorting/analysis
  currency TEXT DEFAULT 'USD',
  
  -- Acquirer/Merger partner (for acquisitions/mergers)
  acquirer_name TEXT,
  acquirer_type TEXT, -- 'public_company', 'private_company', 'pe_firm', 'other'
  
  -- IPO details (for IPOs)
  exchange TEXT, -- 'NYSE', 'NASDAQ', etc.
  ticker_symbol TEXT,
  ipo_price NUMERIC,
  market_cap_at_ipo NUMERIC,
  
  -- Transaction details
  transaction_structure TEXT, -- 'cash', 'stock', 'cash_and_stock', 'all_stock'
  deal_status TEXT DEFAULT 'completed' CHECK (deal_status IN ('announced', 'completed', 'failed', 'pending')),
  
  -- Source tracking
  source_url TEXT,
  source_title TEXT,
  source_date TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Investor correlation
  investors_involved UUID[], -- Array of investor IDs from investors table
  lead_investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  
  -- Analysis fields
  exit_notes TEXT, -- What made this startup attractive (AI-generated insights)
  key_factors TEXT[], -- Array of factors: 'product_market_fit', 'strong_team', 'rapid_growth', etc.
  valuation_multiple NUMERIC, -- If available: exit_value / last_valuation
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_startup_exits_startup_id ON startup_exits(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_exits_startup_name ON startup_exits(startup_name);
CREATE INDEX IF NOT EXISTS idx_startup_exits_exit_type ON startup_exits(exit_type);
CREATE INDEX IF NOT EXISTS idx_startup_exits_exit_date ON startup_exits(exit_date DESC);
CREATE INDEX IF NOT EXISTS idx_startup_exits_acquirer_name ON startup_exits(acquirer_name);
CREATE INDEX IF NOT EXISTS idx_startup_exits_investors ON startup_exits USING GIN(investors_involved);
CREATE INDEX IF NOT EXISTS idx_startup_exits_lead_investor ON startup_exits(lead_investor_id);

-- Add comment
COMMENT ON TABLE startup_exits IS 'Tracks startup exits: acquisitions, mergers, and IPOs. Links to investors for portfolio performance tracking.';

-- ============================================
-- Investor Portfolio Performance View
-- ============================================
-- Aggregates exit data for investor portfolio tracking

CREATE OR REPLACE VIEW investor_portfolio_performance AS
SELECT 
  i.id AS investor_id,
  i.name AS investor_name,
  COUNT(DISTINCT se.id) AS total_exits,
  COUNT(DISTINCT CASE WHEN se.exit_type = 'acquisition' THEN se.id END) AS acquisitions,
  COUNT(DISTINCT CASE WHEN se.exit_type = 'merger' THEN se.id END) AS mergers,
  COUNT(DISTINCT CASE WHEN se.exit_type = 'ipo' THEN se.id END) AS ipos,
  SUM(CASE WHEN se.exit_value_numeric IS NOT NULL THEN se.exit_value_numeric ELSE 0 END) AS total_exit_value,
  MAX(se.exit_date) AS most_recent_exit,
  COUNT(DISTINCT CASE WHEN se.verified = true THEN se.id END) AS verified_exits
FROM investors i
LEFT JOIN startup_exits se ON i.id = ANY(se.investors_involved) OR i.id = se.lead_investor_id
GROUP BY i.id, i.name;



