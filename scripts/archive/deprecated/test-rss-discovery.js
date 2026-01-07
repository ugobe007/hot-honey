#!/usr/bin/env node
/**
 * Quick RSS Discovery Test
 * Tests if RSS feeds are being scraped and startups discovered
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n🔍 RSS DISCOVERY STATUS CHECK\n');
  console.log('═'.repeat(60));
  
  // Check RSS sources
  const { data: sources, error: sourcesError } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true);
  
  if (sourcesError) {
    console.error('❌ Error fetching RSS sources:', sourcesError.message);
    return;
  }
  
  console.log(`\n📡 RSS SOURCES: ${sources?.length || 0} active`);
  if (sources && sources.length > 0) {
    sources.forEach((source, i) => {
      console.log(`   ${i + 1}. ${source.name} (${source.category})`);
      console.log(`      URL: ${source.url}`);
      console.log(`      Last scraped: ${source.last_scraped || 'Never'}`);
    });
  } else {
    console.log('   ⚠️  No RSS sources configured!');
    console.log('   👉 Go to /admin/rss-manager to add sources');
  }
  
  // Check discovered startups
  const { data: discovered, error: discoveredError } = await supabase
    .from('discovered_startups')
    .select('*')
    .order('discovered_at', { ascending: false })
    .limit(10);
  
  if (discoveredError) {
    console.error('❌ Error fetching discovered startups:', discoveredError.message);
    return;
  }
  
  console.log(`\n🚀 DISCOVERED STARTUPS: ${discovered?.length || 0}`);
  if (discovered && discovered.length > 0) {
    const notImported = discovered.filter(s => !s.imported_to_startups).length;
    const imported = discovered.filter(s => s.imported_to_startups).length;
    
    console.log(`   📥 Ready to import: ${notImported}`);
    console.log(`   ✅ Already imported: ${imported}`);
    
    console.log('\n   Latest discoveries:');
    discovered.slice(0, 5).forEach((startup, i) => {
      console.log(`   ${i + 1}. ${startup.name}`);
      console.log(`      Source: ${startup.source}`);
      console.log(`      Status: ${startup.imported_to_startups ? '✅ Imported' : '📥 Ready'}`);
    });
  } else {
    console.log('   ⚠️  No startups discovered yet!');
    console.log('   🔄 RSS scraper will discover startups automatically');
    console.log('   ⏱️  Next scan in <30 minutes');
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Status check complete\n');
}

main().catch(console.error);
