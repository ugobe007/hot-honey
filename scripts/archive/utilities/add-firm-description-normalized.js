#!/usr/bin/env node
/**
 * ADD FIRM_DESCRIPTION_NORMALIZED COLUMN
 * ======================================
 * Adds the firm_description_normalized column to investors table
 * This stores standardized, third-person descriptions for consistent matching/display
 * 
 * Run: node add-firm-description-normalized.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MIGRATION_SQL = `
-- Add firm_description_normalized column to investors table
ALTER TABLE investors 
ADD COLUMN IF NOT EXISTS firm_description_normalized TEXT;

-- Add comment for documentation
COMMENT ON COLUMN investors.firm_description_normalized IS 'Standardized, third-person firm description following a consistent format. Used for matching and display. The investment_firm_description column contains the raw/authentic voice.';

-- Create index for faster searches (optional)
CREATE INDEX IF NOT EXISTS idx_investors_firm_description_normalized ON investors(firm_description_normalized) WHERE firm_description_normalized IS NOT NULL;
`;

async function runMigration() {
  console.log('🔧 ADDING FIRM_DESCRIPTION_NORMALIZED COLUMN');
  console.log('===========================================\n');

  try {
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
    console.log('   supabase/migrations/add_firm_description_normalized.sql');
    
    // Verify column exists (after migration is run)
    console.log('\n🔍 Verifying column...');
    const { data, error } = await supabase
      .from('investors')
      .select('id, name, firm_description_normalized')
      .limit(1);
    
    if (error) {
      if (error.code === '42703') {
        console.log('❌ Column not found. Please run the migration SQL first.');
      } else {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.log('✅ Column exists! Migration successful.');
      console.log('   Sample data:', data?.[0] ? 'Found' : 'No data');
    }
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

runMigration();

