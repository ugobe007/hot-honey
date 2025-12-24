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
  },
  timeout: 60000, // 60 second timeout per feed (increased for slow feeds)
  maxRedirects: 5 // More redirects for reliability
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

  // Retry function with exponential backoff
  async function scrapeFeedWithRetry(source, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        // Try to parse the RSS feed with timeout
        const feedPromise = parser.parseURL(source.url);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`RSS feed timeout after 60 seconds`)), 60000)
        );
        
        const feed = await Promise.race([feedPromise, timeoutPromise]);
        return feed; // Success!
        
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }
        
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`);
        console.log(`   ⏳ Retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Process feeds in parallel batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} feeds)...`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (source) => {
      try {
        console.log(`\n📡 Scraping: ${source.name}`);
        console.log(`   URL: ${source.url}`);

        const feed = await scrapeFeedWithRetry(source);
      
        console.log(`   ✅ Found ${feed.items?.length || 0} items`);

        if (feed.items && feed.items.length > 0) {
          // Filter recent articles (last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const recentItems = feed.items.filter(item => {
            const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
            return pubDate >= sevenDaysAgo;
          });

          console.log(`   📅 ${recentItems.length} articles from last 7 days`);

          // Insert articles into database (increased limit for more data)
          let batchArticles = 0;
          for (const item of recentItems.slice(0, 20)) { // Increased to 20 most recent
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
              } else {
                batchArticles++;
                totalArticles++;
              }
            }
          }
          
          console.log(`   ✅ Saved ${batchArticles} new articles from ${source.name}`);

          // Update source last_scraped timestamp
          await supabase
            .from('rss_sources')
            .update({ 
              last_scraped: new Date().toISOString(),
              last_checked: new Date().toISOString(),
              connection_status: 'success',
              last_error: null
            })
            .eq('id', source.id);

          successfulSources++;
          return { success: true, articles: batchArticles };
        } else {
          console.log(`   ⚠️  No items found in feed`);
          successfulSources++; // Still count as success (feed worked, just no items)
          return { success: true, articles: 0 };
        }

      } catch (error) {
        console.error(`   ❌ Failed after retries: ${error.message}`);
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
        
        return { success: false, error: error.message };
      }
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Small delay between batches to be respectful
    if (i + BATCH_SIZE < sources.length) {
      console.log(`\n⏳ Waiting 2s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
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
