#!/usr/bin/env node

/**
 * Enhanced RSS & Web Scraper
 * Handles both RSS feeds AND regular web pages
 */

const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// Use service key for admin operations
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('\n❌ MISSING SUPABASE_SERVICE_KEY!');
  console.error('Add to .env: SUPABASE_SERVICE_KEY=your_service_key_here\n');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  serviceKey,
  {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'content'],
      ['description', 'description'],
    ]
  },
  timeout: 10000
});

/**
 * Try to parse as RSS, fallback to web scraping
 */
async function fetchArticles(source) {
  // First, try RSS parsing
  try {
    const feed = await parser.parseURL(source.url);
    if (feed.items && feed.items.length > 0) {
      console.log(`   ✅ RSS feed: ${feed.items.length} items`);
      return { type: 'rss', items: feed.items };
    }
  } catch (rssError) {
    console.log(`   ⚠️  Not a valid RSS feed, trying web scraping...`);
  }

  // Fallback to web scraping
  try {
    const response = await axios.get(source.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Strategy 1: Look for article tags
    $('article').each((i, elem) => {
      if (i >= 10) return false; // Limit to 10
      
      const $article = $(elem);
      const title = $article.find('h1, h2, h3').first().text().trim();
      const link = $article.find('a').first().attr('href');
      const content = $article.find('p').first().text().trim();
      
      if (title && link) {
        articles.push({
          title,
          link: link.startsWith('http') ? link : new URL(link, source.url).href,
          content: content || title,
          pubDate: new Date().toISOString()
        });
      }
    });

    // Strategy 2: Look for headlines (h2, h3 with links)
    if (articles.length === 0) {
      $('h2 a, h3 a').each((i, elem) => {
        if (i >= 10) return false;
        
        const $link = $(elem);
        const title = $link.text().trim();
        const href = $link.attr('href');
        
        if (title && href && title.length > 10) {
          articles.push({
            title,
            link: href.startsWith('http') ? href : new URL(href, source.url).href,
            content: title,
            pubDate: new Date().toISOString()
          });
        }
      });
    }

    // Strategy 3: Look for news-like divs
    if (articles.length === 0) {
      $('.post, .entry, .news-item, .article-item').each((i, elem) => {
        if (i >= 10) return false;
        
        const $elem = $(elem);
        const title = $elem.find('h2, h3, .title').first().text().trim();
        const link = $elem.find('a').first().attr('href');
        const content = $elem.find('p, .excerpt').first().text().trim();
        
        if (title && link) {
          articles.push({
            title,
            link: link.startsWith('http') ? link : new URL(link, source.url).href,
            content: content || title,
            pubDate: new Date().toISOString()
          });
        }
      });
    }

    if (articles.length > 0) {
      console.log(`   ✅ Web scraping: ${articles.length} articles extracted`);
      return { type: 'web', items: articles };
    }

    console.log(`   ⚠️  No articles found on page`);
    return { type: 'none', items: [] };

  } catch (webError) {
    console.log(`   ❌ Web scraping failed: ${webError.message}`);
    return { type: 'error', items: [], error: webError.message };
  }
}

async function scrapeAllSources() {
  console.log('🚀 Starting Enhanced RSS & Web Scraping...\n');

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
    console.log('⚠️  No active RSS sources found');
    return;
  }

  console.log(`📰 Found ${sources.length} active sources\n`);

  let totalArticles = 0;
  let successfulSources = 0;
  let failedSources = 0;

  for (const source of sources) {
    try {
      console.log(`\n📡 Processing: ${source.name}`);
      console.log(`   URL: ${source.url}`);

      const result = await fetchArticles(source);

      if (result.items && result.items.length > 0) {
        // Filter recent articles (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentItems = result.items.filter(item => {
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          return pubDate >= sevenDaysAgo;
        });

        console.log(`   📅 ${recentItems.length} articles from last 7 days`);

        // Insert articles into scraped_articles table (correct schema)
        let savedCount = 0;
        for (const item of recentItems.slice(0, 10)) {
          const articleData = {
            title: item.title || 'Untitled',
            url: item.link || item.url || source.url,
            summary: item.content || item.description || item.contentSnippet || item.title || '',
            full_content: item.content || item.description || '',
            source_id: source.id,
            published_at: item.pubDate || new Date().toISOString(),
            author: item.creator || item.author || null,
            topics: item.categories || [],
            companies_mentioned: [],
            is_processed: false,
            fetched_at: new Date().toISOString()
          };

          // Check if article already exists
          const { data: existing } = await supabase
            .from('scraped_articles')
            .select('id')
            .eq('url', articleData.url)
            .single();

          if (!existing) {
            const { error: insertError } = await supabase
              .from('scraped_articles')
              .insert([articleData]);

            if (!insertError) {
              savedCount++;
              totalArticles++;
            } else {
              console.log(`   ⚠️ Insert error: ${insertError.message}`);
            }
          }
        }

        console.log(`   ✅ Saved ${savedCount} new articles`);

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
        console.log(`   ⚠️  No articles found`);
      }

      // Be respectful - wait between sources
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failedSources++;

      // Update source with error
      await supabase
        .from('rss_sources')
        .update({ 
          last_checked: new Date().toISOString()
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

// Run the enhanced scraper
scrapeAllSources().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
