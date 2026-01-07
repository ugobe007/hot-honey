#!/usr/bin/env node
/**
 * Add Premium Startup/VC Sources
 * 
 * Adds high-quality sources for startup discovery:
 * - Y Combinator company pages (web scraping)
 * - Sequoia Capital (Medium + stories)
 * - a16z news content
 * - HAX startups
 * 
 * Usage: node add-premium-sources.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Premium sources to add
const PREMIUM_SOURCES = [
  // Y Combinator - Company directories (web scraping, not RSS)
  {
    name: 'Y Combinator - Summer 2025 Batch',
    url: 'https://www.ycombinator.com/companies?batch=Summer%202025',
    feed_url: null, // Web scraping required
    category: 'startup_directory',
    type: 'web', // 'rss' or 'web'
    enabled: true,
    description: 'Y Combinator Summer 2025 batch companies'
  },
  {
    name: 'Y Combinator - All Companies',
    url: 'https://www.ycombinator.com/companies',
    feed_url: null,
    category: 'startup_directory',
    type: 'web',
    enabled: true,
    description: 'All Y Combinator portfolio companies'
  },
  {
    name: 'Y Combinator - Collaboration Industry',
    url: 'https://www.ycombinator.com/companies/industry/collaboration',
    feed_url: null,
    category: 'startup_directory',
    type: 'web',
    enabled: true,
    description: 'YC companies in collaboration industry'
  },
  
  // Sequoia Capital
  {
    name: 'Sequoia Capital - Medium',
    url: 'https://sequoia.medium.com',
    feed_url: 'https://sequoia.medium.com/feed', // Try RSS feed
    category: 'vc_blog',
    type: 'rss',
    enabled: true,
    description: 'Sequoia Capital blog on Medium'
  },
  {
    name: 'Sequoia Capital - Stories',
    url: 'https://sequoiacap.com/stories/',
    feed_url: null, // May need web scraping
    category: 'vc_blog',
    type: 'web',
    enabled: true,
    description: 'Sequoia Capital stories and insights'
  },
  {
    name: 'Sequoia Capital - News',
    url: 'https://sequoiacap.com/stories/?_story-category=news',
    feed_url: null,
    category: 'vc_news',
    type: 'web',
    enabled: true,
    description: 'Sequoia Capital news and announcements'
  },
  
  // a16z
  {
    name: 'a16z - News Content',
    url: 'https://a16z.com/news-content/',
    feed_url: 'https://a16z.com/feed/', // Try RSS feed
    category: 'vc_news',
    type: 'rss',
    enabled: true,
    description: 'Andreessen Horowitz news and content'
  },
  
  // HAX
  {
    name: 'HAX - Startups',
    url: 'https://hax.co/startups/',
    feed_url: null,
    category: 'startup_directory',
    type: 'web',
    enabled: true,
    description: 'HAX accelerator portfolio companies'
  }
];

async function addSources() {
  console.log('🚀 Adding Premium Startup/VC Sources\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const source of PREMIUM_SOURCES) {
    try {
      // Check if already exists (by URL or name)
      const { data: existing } = await supabase
        .from('rss_sources')
        .select('id')
        .or(`url.eq."${source.url}",name.eq."${source.name}"`)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log(`⏭️  Skipped (exists): ${source.name}`);
        skipped++;
        continue;
      }
      
      // Insert new source (only fields that exist in schema)
      const insertData = {
        name: source.name,
        url: source.url,
        category: source.category,
        active: source.enabled !== false // Use 'active' instead of 'enabled'
      };
      
      // Note: feed_url column doesn't exist in schema, so we skip it
      // For RSS feeds, the URL itself is the feed URL
      
      const { data, error } = await supabase
        .from('rss_sources')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error adding ${source.name}:`, error.message);
        errors++;
        continue;
      }
      
      console.log(`✅ Added: ${source.name}`);
      console.log(`   Category: ${source.category}`);
      if (source.feed_url) {
        console.log(`   RSS Feed: ${source.feed_url}`);
      } else {
        console.log(`   Type: Web scraping (${source.type || 'web'})`);
      }
      console.log('');
      added++;
      
    } catch (err) {
      console.error(`❌ Error processing ${source.name}:`, err.message);
      errors++;
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Added: ${added}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('');
  console.log('💡 Next Steps:');
  console.log('   1. For RSS sources: They will be picked up by simple-rss-scraper.js');
  console.log('   2. For web sources: Create dedicated scrapers (e.g., yc-companies-scraper.js)');
  console.log('   3. Run: node unified-scraper-orchestrator.js');
}

addSources().catch(console.error);

