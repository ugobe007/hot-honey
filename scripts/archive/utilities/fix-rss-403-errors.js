#!/usr/bin/env node
/**
 * Fix RSS 403 Errors
 * 
 * Some RSS feeds block scrapers. This script:
 * 1. Identifies blocked feeds
 * 2. Suggests alternatives or workarounds
 * 3. Updates feed URLs if needed
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const parser = new Parser({ 
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  }
});

async function checkRSSFeeds() {
  console.log('🔍 Checking RSS Feed Accessibility\n');
  console.log('═'.repeat(70));
  
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('id, name, url, active')
    .eq('active', true);
  
  if (!sources || sources.length === 0) {
    console.log('❌ No RSS sources found');
    return;
  }
  
  const results = {
    accessible: [],
    blocked: [],
    errors: []
  };
  
  for (const source of sources) {
    try {
      console.log(`\n📡 Testing: ${source.name}`);
      console.log(`   URL: ${source.url}`);
      
      const feed = await parser.parseURL(source.url);
      
      if (feed.items && feed.items.length > 0) {
        console.log(`   ✅ Accessible - ${feed.items.length} items`);
        results.accessible.push({ name: source.name, url: source.url, items: feed.items.length });
      } else {
        console.log(`   ⚠️  Accessible but empty`);
        results.accessible.push({ name: source.name, url: source.url, items: 0 });
      }
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        console.log(`   🚫 BLOCKED (403) - Feed requires authentication or blocks scrapers`);
        results.blocked.push({ name: source.name, url: source.url, error: '403 Forbidden' });
      } else {
        console.log(`   ❌ Error: ${error.message}`);
        results.errors.push({ name: source.name, url: source.url, error: error.message });
      }
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Accessible: ${results.accessible.length}`);
  console.log(`🚫 Blocked (403): ${results.blocked.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  if (results.blocked.length > 0) {
    console.log('\n🚫 BLOCKED FEEDS:');
    results.blocked.forEach(feed => {
      console.log(`   - ${feed.name}: ${feed.url}`);
      console.log(`     💡 Options:`);
      console.log(`        1. Deactivate this feed (set active=false)`);
      console.log(`        2. Try alternative URL or API endpoint`);
      console.log(`        3. Use Tier 2 (Browser) scraper instead`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERROR FEEDS:');
    results.errors.forEach(feed => {
      console.log(`   - ${feed.name}: ${feed.error}`);
    });
  }
}

checkRSSFeeds().catch(console.error);

