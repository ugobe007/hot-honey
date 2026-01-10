#!/usr/bin/env node
/**
 * CHECK RSS SOURCES
 * =================
 * Shows current RSS sources in the database and their status.
 * 
 * Usage:
 *   node scripts/check-rss-sources.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSources() {
  console.log('📡 Checking RSS Sources in Database...\n');
  
  // Get all sources
  const { data: allSources, error: allError } = await supabase
    .from('rss_sources')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (allError) {
    console.error('❌ Error fetching sources:', allError.message);
    process.exit(1);
  }
  
  // Get active sources
  const { data: activeSources, error: activeError } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true)
    .order('last_scraped', { ascending: true, nullsFirst: true });
  
  if (activeError) {
    console.error('❌ Error fetching active sources:', activeError.message);
    process.exit(1);
  }
  
  // Get inactive sources
  const inactiveSources = allSources?.filter(s => !s.active) || [];
  
  // Get never scraped
  const neverScraped = activeSources?.filter(s => !s.last_scraped) || [];
  
  // Get recently scraped (last 24 hours)
  const recentlyScraped = activeSources?.filter(s => {
    if (!s.last_scraped) return false;
    const lastScraped = new Date(s.last_scraped);
    const now = new Date();
    const hoursSince = (now - lastScraped) / (1000 * 60 * 60);
    return hoursSince < 24;
  }) || [];
  
  console.log('📊 SUMMARY');
  console.log('─'.repeat(60));
  console.log(`   Total Sources: ${allSources?.length || 0}`);
  console.log(`   Active: ${activeSources?.length || 0}`);
  console.log(`   Inactive: ${inactiveSources.length}`);
  console.log(`   Never Scraped: ${neverScraped.length}`);
  console.log(`   Scraped in Last 24h: ${recentlyScraped.length}`);
  console.log();
  
  if (activeSources && activeSources.length > 0) {
    console.log('✅ ACTIVE SOURCES');
    console.log('─'.repeat(60));
    
    // Group by category
    const byCategory = {};
    activeSources.forEach(s => {
      const cat = s.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    });
    
    Object.entries(byCategory).forEach(([category, sources]) => {
      console.log(`\n📁 ${category} (${sources.length}):`);
      sources.forEach(s => {
        const lastScraped = s.last_scraped 
          ? new Date(s.last_scraped).toLocaleString() 
          : 'Never';
        const status = s.last_scraped ? '✅' : '⚠️';
        console.log(`   ${status} ${s.name}`);
        console.log(`      URL: ${s.url}`);
        console.log(`      Last Scraped: ${lastScraped}`);
      });
    });
  } else {
    console.log('⚠️  No active sources found!');
  }
  
  if (inactiveSources.length > 0) {
    console.log('\n\n❌ INACTIVE SOURCES');
    console.log('─'.repeat(60));
    inactiveSources.forEach(s => {
      console.log(`   ${s.name}`);
      console.log(`      URL: ${s.url}`);
    });
  }
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\n💡 To add more sources, run:`);
  console.log(`   node scripts/add-hundreds-rss-sources.js\n`);
}

checkSources()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

