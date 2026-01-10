#!/usr/bin/env node
/**
 * TEST SCRAPER DATABASE
 * =====================
 * Verifies the scraper_selectors table is set up correctly
 * and tests saving a selector.
 * 
 * Usage:
 *   node scripts/test-scraper-database.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🧪 Testing Scraper Database Connection...\n');
  
  // Test 1: Check if table exists
  console.log('1️⃣  Checking if table exists...');
  try {
    const { data, error } = await supabase
      .from('scraper_selectors')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.error('   ❌ Table does not exist!');
        console.error('   Please run: migrations/create_scraper_selectors_table.sql');
        process.exit(1);
      } else {
        throw error;
      }
    }
    
    console.log('   ✅ Table exists and is accessible!\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    process.exit(1);
  }
  
  // Test 2: Check current record count
  console.log('2️⃣  Checking current record count...');
  try {
    const { count, error } = await supabase
      .from('scraper_selectors')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    console.log(`   📊 Current records: ${count || 0}\n`);
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    process.exit(1);
  }
  
  // Test 3: Insert a test record
  console.log('3️⃣  Inserting test selector...');
  try {
    const testSelector = {
      domain: 'ycombinator.com',
      data_type: 'startup',
      field: 'name',
      selector: 'h1',
      strategy: 'css',
      success_rate: 100,
      usage_count: 1,
      active: true,
      metadata: { test: true }
    };
    
    const { data, error } = await supabase
      .from('scraper_selectors')
      .insert(testSelector)
      .select();
    
    if (error) {
      // If duplicate, that's OK - it means the unique constraint works
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        console.log('   ℹ️  Test selector already exists (unique constraint working!)\n');
      } else {
        throw error;
      }
    } else {
      console.log('   ✅ Test selector inserted successfully!');
      console.log(`   ID: ${data[0].id}\n`);
      
      // Clean up test record
      await supabase
        .from('scraper_selectors')
        .delete()
        .eq('id', data[0].id);
      console.log('   🧹 Cleaned up test record\n');
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    process.exit(1);
  }
  
  // Test 4: Query test
  console.log('4️⃣  Testing queries...');
  try {
    const { data, error } = await supabase
      .from('scraper_selectors')
      .select('domain, data_type, field, selector, success_rate')
      .eq('domain', 'ycombinator.com')
      .eq('active', true)
      .order('success_rate', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`   ✅ Found ${data.length} selector(s) for ycombinator.com:`);
      data.forEach((s, i) => {
        console.log(`      ${i + 1}. ${s.field}: "${s.selector}" (${s.success_rate}% success)`);
      });
    } else {
      console.log('   ℹ️  No selectors found yet (this is normal - table is empty)\n');
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed! Database is ready.');
  console.log('\n📋 Next Steps:');
  console.log('   1. Run the scraper to populate the table:');
  console.log('      node scripts/scrapers/resilient-scraper.js https://ycombinator.com/companies/airbnb startup');
  console.log('   2. Check the table in Supabase Dashboard');
  console.log('   3. Watch selectors being saved automatically! 🎉\n');
}

testDatabase()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

