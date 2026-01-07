#!/usr/bin/env node
/**
 * ADD URL AND INVESTMENT_FIRM_DESCRIPTION COLUMNS
 * ===============================================
 * Adds two new columns to the investors table:
 * - url: Primary website URL
 * - investment_firm_description: Firm description
 * 
 * Run: node add-investor-url-description.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MIGRATION_SQL = `
-- Add url column for website URL
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add investment_firm_description column for firm description
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS investment_firm_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN investors.url IS 'Primary website URL for the investor/firm';
COMMENT ON COLUMN investors.investment_firm_description IS 'Description of the investment firm, typically scraped from their website or manually curated';

-- Create index on url for faster lookups (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_investors_url ON investors(url) WHERE url IS NOT NULL;
`;

async function runMigration() {
  console.log('🔧 ADDING URL AND INVESTMENT_FIRM_DESCRIPTION COLUMNS');
  console.log('=====================================================\n');

  try {
    // Execute migration using RPC or direct SQL
    // Note: Supabase JS client doesn't support raw SQL directly
    // This needs to be run in Supabase SQL Editor or via Supabase CLI
    
    console.log('⚠️  This migration needs to be run in Supabase SQL Editor');
    console.log('\nSQL to execute:');
    console.log('─'.repeat(60));
    console.log(MIGRATION_SQL);
    console.log('─'.repeat(60));
    
    console.log('\n📋 INSTRUCTIONS:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Paste the SQL above');
    console.log('4. Click "Run"');
    console.log('\nAlternatively, use the SQL file:');
    console.log('   supabase/migrations/add_investor_url_and_description.sql');
    
    // Verify columns exist (after migration is run)
    console.log('\n🔍 Verifying columns...');
    const { data, error } = await supabase
      .from('investors')
      .select('id, name, url, investment_firm_description')
      .limit(1);
    
    if (error) {
      if (error.code === '42703') {
        console.log('❌ Columns not found. Please run the migration SQL first.');
      } else {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.log('✅ Columns exist! Migration successful.');
      console.log('   Sample data:', data?.[0] ? 'Found' : 'No data');
    }
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

runMigration();

