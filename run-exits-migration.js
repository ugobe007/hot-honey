#!/usr/bin/env node
/**
 * RUN STARTUP EXITS MIGRATION
 * 
 * Creates startup_exits table and investor_portfolio_performance view
 * Also adds portfolio_performance column to investors table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MIGRATION_SQL = `
-- Create startup_exits table
CREATE TABLE IF NOT EXISTS startup_exits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Startup reference
  startup_id UUID REFERENCES startup_uploads(id) ON DELETE SET NULL,
  startup_name TEXT NOT NULL,
  
  -- Exit details
  exit_type TEXT NOT NULL CHECK (exit_type IN ('acquisition', 'merger', 'ipo', 'spac', 'direct_listing')),
  exit_date DATE,
  exit_value TEXT,
  exit_value_numeric NUMERIC,
  currency TEXT DEFAULT 'USD',
  
  -- Acquirer/Merger partner
  acquirer_name TEXT,
  acquirer_type TEXT,
  
  -- IPO details
  exchange TEXT,
  ticker_symbol TEXT,
  ipo_price NUMERIC,
  market_cap_at_ipo NUMERIC,
  
  -- Transaction details
  transaction_structure TEXT,
  deal_status TEXT DEFAULT 'completed' CHECK (deal_status IN ('announced', 'completed', 'failed', 'pending')),
  
  -- Source tracking
  source_url TEXT,
  source_title TEXT,
  source_date TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Investor correlation
  investors_involved UUID[],
  lead_investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  
  -- Analysis fields
  exit_notes TEXT,
  key_factors TEXT[],
  valuation_multiple NUMERIC,
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_startup_exits_startup_id ON startup_exits(startup_id);
CREATE INDEX IF NOT EXISTS idx_startup_exits_startup_name ON startup_exits(startup_name);
CREATE INDEX IF NOT EXISTS idx_startup_exits_exit_type ON startup_exits(exit_type);
CREATE INDEX IF NOT EXISTS idx_startup_exits_exit_date ON startup_exits(exit_date DESC);
CREATE INDEX IF NOT EXISTS idx_startup_exits_acquirer_name ON startup_exits(acquirer_name);
CREATE INDEX IF NOT EXISTS idx_startup_exits_investors ON startup_exits USING GIN(investors_involved);
CREATE INDEX IF NOT EXISTS idx_startup_exits_lead_investor ON startup_exits(lead_investor_id);

-- Add portfolio_performance column to investors table
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS portfolio_performance JSONB;

-- Create investor_portfolio_performance view
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
`;

async function runMigration() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🗄️  STARTUP EXITS MIGRATION                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  try {
    // DDL statements (CREATE TABLE, ALTER TABLE, etc.) cannot be run via RPC
    // They must be executed directly in Supabase SQL Editor
    console.log('📊 Migration requires manual execution in Supabase SQL Editor\n');
    console.log('⚠️  DDL statements (CREATE TABLE, ALTER TABLE) cannot be run via API');
    console.log('    They must be executed directly in the database.\n');
    
    console.log('📋 MIGRATION INSTRUCTIONS:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy the entire contents of: supabase-startup-exits.sql');
    console.log('   3. Paste into SQL Editor');
    console.log('   4. Click "Run"');
    console.log('\n   Alternative: Use psql with your connection string\n');

    // Verify table exists (if migration worked)
    const { data: tables, error: checkError } = await supabase
      .from('startup_exits')
      .select('*')
      .limit(0);

    if (!checkError) {
      console.log('✅ startup_exits table exists!');
    } else {
      console.log('⚠️  startup_exits table not found - run migration in Supabase SQL Editor');
    }

    // Check portfolio_performance column
    const { data: investors, error: invError } = await supabase
      .from('investors')
      .select('portfolio_performance')
      .limit(1);

    if (!invError) {
      console.log('✅ portfolio_performance column exists on investors table!');
    } else {
      console.log('⚠️  portfolio_performance column may need to be added manually');
    }

  } catch (error) {
    console.error(`❌ Migration error: ${error.message}`);
    console.log('\n📋 Please run the migration manually in Supabase SQL Editor');
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Migration check complete\n');
}

runMigration().catch(console.error);

