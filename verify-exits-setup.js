#!/usr/bin/env node
/**
 * VERIFY STARTUP EXITS SETUP
 * 
 * Checks if startup_exits table and related structures exist
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

async function verifySetup() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        ✅ VERIFY STARTUP EXITS SETUP                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  let allGood = true;

  // 1. Check startup_exits table
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  CHECKING STARTUP_EXITS TABLE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data, error } = await supabase
      .from('startup_exits')
      .select('*')
      .limit(0);

    if (error) {
      console.log(`❌ startup_exits table: NOT FOUND`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Action: Run migration in Supabase SQL Editor`);
      allGood = false;
    } else {
      console.log(`✅ startup_exits table: EXISTS`);
      
      // Check count
      const { count } = await supabase
        .from('startup_exits')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   Current exits: ${count || 0}`);
    }
  } catch (error) {
    console.log(`❌ startup_exits table: ERROR`);
    console.log(`   ${error.message}`);
    allGood = false;
  }

  // 2. Check portfolio_performance column
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  CHECKING INVESTORS TABLE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const { data, error } = await supabase
      .from('investors')
      .select('portfolio_performance')
      .limit(1);

    if (error && error.message.includes('portfolio_performance')) {
      console.log(`❌ portfolio_performance column: NOT FOUND`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Action: Add column with: ALTER TABLE investors ADD COLUMN portfolio_performance JSONB;`);
      allGood = false;
    } else {
      console.log(`✅ portfolio_performance column: EXISTS`);
    }
  } catch (error) {
    console.log(`⚠️  Could not verify portfolio_performance column`);
  }

  // 3. Check investor_portfolio_performance view
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  CHECKING INVESTOR_PORTFOLIO_PERFORMANCE VIEW');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Try to query the view
    const { data, error } = await supabase
      .from('investor_portfolio_performance')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`⚠️  investor_portfolio_performance view: May not exist`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Note: View is optional, can be created later`);
    } else {
      console.log(`✅ investor_portfolio_performance view: EXISTS`);
    }
  } catch (error) {
    console.log(`⚠️  Could not verify view (may not exist yet)`);
  }

  // 4. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4️⃣  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (allGood) {
    console.log('✅ All required structures exist!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run exit detection: node detect-startup-exits.js');
    console.log('   2. Update portfolio performance: node update-investor-portfolio-performance.js');
  } else {
    console.log('⚠️  Some structures are missing');
    console.log('\n📋 Action required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of supabase-startup-exits.sql');
    console.log('   3. Run the SQL');
    console.log('   4. Run this verification again: node verify-exits-setup.js');
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Verification complete\n');
}

verifySetup().catch(console.error);



