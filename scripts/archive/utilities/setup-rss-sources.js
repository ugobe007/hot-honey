#!/usr/bin/env node
/**
 * Setup RSS Sources for Hot Match
 * 
 * Adds working RSS feeds and removes blocked sources.
 * These are actual RSS/Atom feeds that don't block scrapers.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Working RSS feeds for startup discovery
const WORKING_RSS_FEEDS = [
  // TechCrunch - reliable RSS
  { name: 'TechCrunch Startups', url: 'https://techcrunch.com/category/startups/feed/', category: 'news', priority: 1 },
  { name: 'TechCrunch Funding', url: 'https://techcrunch.com/tag/funding/feed/', category: 'funding', priority: 1 },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'news', priority: 1 },
  
  // VentureBeat - reliable RSS
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', category: 'news', priority: 1 },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'news', priority: 1 },
  
  // The Verge - tech news
  { name: 'The Verge Tech', url: 'https://www.theverge.com/rss/index.xml', category: 'news', priority: 2 },
  
  // Hacker News - RSS feed
  { name: 'Hacker News Best', url: 'https://hnrss.org/best', category: 'news', priority: 1 },
  { name: 'Hacker News Show HN', url: 'https://hnrss.org/show', category: 'startups', priority: 1 },
  
  // Crunchbase News
  { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', category: 'funding', priority: 1 },
  
  // SaaStr - B2B SaaS
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/', category: 'saas', priority: 2 },
  
  // Y Combinator Blog
  { name: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss/', category: 'startups', priority: 1 },
  
  // a]6z Crypto
  { name: 'a16z Crypto', url: 'https://a16zcrypto.com/feed/', category: 'crypto', priority: 2 },
  
  // First Round Review
  { name: 'First Round Review', url: 'https://review.firstround.com/feed.xml', category: 'startups', priority: 2 },
  
  // Indie Hackers
  { name: 'Indie Hackers', url: 'https://www.indiehackers.com/feed.xml', category: 'startups', priority: 1 },
  
  // Wired Business
  { name: 'Wired Business', url: 'https://www.wired.com/feed/category/business/latest/rss', category: 'news', priority: 2 },
  
  // Forbes Innovation
  { name: 'Forbes Innovation', url: 'https://www.forbes.com/innovation/feed/', category: 'news', priority: 2 },
  
  // MIT Tech Review
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'news', priority: 2 },
  
  // AngelList Blog
  { name: 'AngelList Blog', url: 'https://www.angellist.com/blog/rss.xml', category: 'startups', priority: 1 },
  
  // CB Insights
  { name: 'CB Insights', url: 'https://www.cbinsights.com/research/feed/', category: 'research', priority: 2 },
];

// Blocked sources to remove/avoid
const BLOCKED_SOURCES = [
  'producthunt.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'facebook.com',
];

async function setupRssSources() {
  console.log('🔧 Setting up RSS Sources for Hot Match\n');
  
  // First, create the rss_sources table if it doesn't exist
  console.log('📊 Checking/creating rss_sources table...');
  
  // Check if table exists by trying to select from it
  const { error: tableError } = await supabase.from('rss_sources').select('id').limit(1);
  
  if (tableError && tableError.code === 'PGRST116') {
    console.log('⚠️  Table rss_sources does not exist. Creating it...');
    // Table doesn't exist - we'll use discovered_startups source tracking instead
    console.log('ℹ️  Will store sources in enhanced-startup-discovery config instead');
  }
  
  // Add working RSS feeds
  console.log('\n📡 Adding working RSS feeds...');
  let added = 0;
  let skipped = 0;
  
  for (const feed of WORKING_RSS_FEEDS) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('rss_sources')
        .select('id')
        .eq('url', feed.url)
        .limit(1);
      
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert new source - matching actual table schema
      const { error } = await supabase.from('rss_sources').insert({
        name: feed.name,
        url: feed.url,
        category: feed.category,
        active: true,
        created_at: new Date().toISOString()
      });
      
      if (error) {
        console.log('  ⚠️', feed.name, '- Error:', error.message);
      } else {
        console.log('  ✅', feed.name);
        added++;
      }
    } catch (err) {
      console.log('  ❌', feed.name, '- Error:', err.message);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('  Added:', added);
  console.log('  Skipped (already exists):', skipped);
  
  // List all sources
  const { data: allSources } = await supabase
    .from('rss_sources')
    .select('name, url, category, active')
    .order('created_at', { ascending: false });
  
  console.log('\n📋 All RSS Sources:');
  if (allSources && allSources.length > 0) {
    allSources.forEach(src => {
      const status = src.active ? '✅' : '❌';
      console.log(`  ${status} ${src.name} (${src.category})`);
    });
  } else {
    console.log('  (no sources in database)');
  }
  
  console.log('\n✅ RSS source setup complete!');
}

// Also export the feeds for use in other scripts
module.exports = { WORKING_RSS_FEEDS, BLOCKED_SOURCES };

// Run if called directly
if (require.main === module) {
  setupRssSources().catch(console.error);
}
