#!/usr/bin/env node

/**
 * Manual RSS Scraper Trigger
 * Run this to scrape all RSS sources immediately
 */

const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
require('dotenv').config();

// Check for service key first (required for inserting data)
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!serviceKey) {
  console.error('\n❌ MISSING SUPABASE_SERVICE_KEY!');
  console.error('\nThe RSS scraper needs the SERVICE KEY to insert articles.');
  console.error('The anon key has Row Level Security restrictions.\n');
  console.error('To fix this:');
  console.error('1. Go to https://supabase.com/dashboard');
  console.error('2. Select your project');
  console.error('3. Go to Settings > API');
  console.error('4. Copy the "service_role" key (NOT the anon key)');
  console.error('5. Add to .env file: SUPABASE_SERVICE_KEY=your_service_key_here\n');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  serviceKey  // Use service key for admin operations
);

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description'],
    ]
  }
});

async function scrapeRSSSources() {
  console.log('🚀 Starting RSS Scraping...\n');

  // Get all active RSS sources
  const { data: sources, error: sourcesError } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true)
    .order('name');

  if (sourcesError) {
    console.error('❌ Error loading RSS sources:', sourcesError.message);
    return;
  }

  if (!sources || sources.length === 0) {
    console.log('⚠️  No enabled RSS sources found');
    return;
  }

  console.log(`📰 Found ${sources.length} enabled RSS sources\n`);

  let totalArticles = 0;
  let successfulSources = 0;
  let failedSources = 0;

  for (const source of sources) {
    try {
      console.log(`\n📡 Scraping: ${source.name}`);
      console.log(`   URL: ${source.url}`);

      // Try to parse the RSS feed
      const feed = await parser.parseURL(source.url);
      
      console.log(`   ✅ Found ${feed.items?.length || 0} items`);

      if (feed.items && feed.items.length > 0) {
        // Filter recent articles (last 7 days for testing)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentItems = feed.items.filter(item => {
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          return pubDate >= sevenDaysAgo;
        });

        console.log(`   📅 ${recentItems.length} articles from last 7 days`);

        // Insert articles into database
        for (const item of recentItems.slice(0, 10)) { // Limit to 10 most recent
          const articleData = {
            title: item.title,
            url: item.link,
            content: item.content || item.description || item.contentSnippet || '',
            source: source.name,
            source_id: source.id,
            published_at: item.pubDate || new Date().toISOString(),
            author: item.creator || item.author || null,
            categories: item.categories || []
          };

          // Check if article already exists
          const { data: existing } = await supabase
            .from('rss_articles')
            .select('id')
            .eq('url', item.link)
            .single();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('rss_articles')
              .insert([articleData]);

            if (insertError) {
              console.log(`   ⚠️  Failed to save: ${item.title?.substring(0, 50)}...`);
              console.log(`   Error: ${insertError.message}`);
            } else {
              totalArticles++;
              console.log(`   ✅ Saved: ${item.title?.substring(0, 50)}...`);
            }
          }
        }

        // Update source last_scraped timestamp
        await supabase
          .from('rss_sources')
          .update({ 
            last_scraped: new Date().toISOString(),
            last_checked: new Date().toISOString()
          })
          .eq('id', source.id);

        successfulSources++;
      } else {
        console.log(`   ⚠️  No items found in feed`);
      }

      // Be respectful - wait between feeds
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failedSources++;

      // Update source with error
      await supabase
        .from('rss_sources')
        .update({ 
          last_checked: new Date().toISOString(),
          connection_status: 'error',
          last_error: error.message
        })
        .eq('id', source.id);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SCRAPING COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successful sources: ${successfulSources}`);
  console.log(`❌ Failed sources: ${failedSources}`);
  console.log(`📄 Total new articles saved: ${totalArticles}`);
  console.log('='.repeat(60) + '\n');
}

// Run the scraper
scrapeRSSSources().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
