/**
 * PYTH AI SCRAPER MANAGER
 * =========================
 * Manages continuous scraping operations.
 * Coordinates RSS fetching, startup discovery, and data enrichment.
 * 
 * Features:
 * - Rate limiting
 * - Error recovery
 * - Progress tracking
 * - Graceful shutdown
 */

const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const parser = new Parser({ timeout: 30000 });

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,
  DELAY_BETWEEN_SOURCES: 5000,  // 5 seconds
  DELAY_BETWEEN_ARTICLES: 1000, // 1 second
  MAX_ARTICLES_PER_SOURCE: 20,
  CYCLE_DELAY: 300000,          // 5 minutes between full cycles
};

let isRunning = true;
let currentSource = null;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  isRunning = false;
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  isRunning = false;
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getActiveRssSources() {
  const { data, error } = await supabase
    .from('rss_sources')
    .select('id, name, url, active, category, created_at')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching RSS sources:', error);
    return [];
  }

  return data || [];
}

async function fetchRssFeed(source) {
  try {
    console.log(`📡 Fetching: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    return feed.items || [];
  } catch (error) {
    console.error(`❌ Failed to fetch ${source.name}:`, error.message);
    return [];
  }
}

async function processArticle(article, sourceName) {
  // Check if article already exists
  const { data: existing } = await supabase
    .from('rss_articles')
    .select('id')
    .eq('url', article.link)
    .limit(1);

  if (existing && existing.length > 0) {
    return { skipped: true };
  }

  // Insert new article
  const { error } = await supabase.from('rss_articles').insert({
    title: article.title || 'Untitled',
    url: article.link,
    source: sourceName,
    content: article.contentSnippet || article.content || '',
    summary: article.summary || '',
    published_at: article.pubDate ? new Date(article.pubDate).toISOString() : new Date().toISOString()
  });

  if (error) {
    console.error(`Error saving article: ${error.message}`);
    return { error: true };
  }

  return { saved: true };
}

async function updateSourceLastFetched(sourceId) {
  // Try to update last_fetched, ignore if column doesn't exist
  try {
    await supabase
      .from('rss_sources')
      .update({ last_fetched: new Date().toISOString() })
      .eq('id', sourceId);
  } catch (e) {
    // Column might not exist, that's OK
  }
}

async function scrapeSource(source) {
  currentSource = source.name;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🔍 Processing: ${source.name}`);
  console.log(`${'='.repeat(50)}`);

  const articles = await fetchRssFeed(source);
  
  if (articles.length === 0) {
    console.log('  No articles found');
    await updateSourceLastFetched(source.id);
    return { processed: 0, saved: 0, skipped: 0 };
  }

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  const toProcess = articles.slice(0, CONFIG.MAX_ARTICLES_PER_SOURCE);

  for (const article of toProcess) {
    if (!isRunning) break;

    const result = await processArticle(article, source.name);
    
    if (result.saved) saved++;
    else if (result.skipped) skipped++;
    else if (result.error) errors++;

    await sleep(CONFIG.DELAY_BETWEEN_ARTICLES);
  }

  await updateSourceLastFetched(source.id);

  console.log(`  ✅ Saved: ${saved} | ⏭️ Skipped: ${skipped} | ❌ Errors: ${errors}`);
  
  return { processed: toProcess.length, saved, skipped, errors };
}

async function runScrapingCycle() {
  console.log('\n' + '🔄'.repeat(25));
  console.log('Starting new scraping cycle...');
  console.log('🔄'.repeat(25) + '\n');

  const sources = await getActiveRssSources();
  
  if (sources.length === 0) {
    console.log('⚠️ No active RSS sources found');
    return;
  }

  console.log(`📋 Found ${sources.length} active RSS sources\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const source of sources) {
    if (!isRunning) {
      console.log('🛑 Stopping cycle early due to shutdown signal');
      break;
    }

    const result = await scrapeSource(source);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalErrors += result.errors || 0;

    await sleep(CONFIG.DELAY_BETWEEN_SOURCES);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 CYCLE SUMMARY');
  console.log('='.repeat(50));
  console.log(`  Sources processed: ${sources.length}`);
  console.log(`  Articles saved: ${totalSaved}`);
  console.log(`  Articles skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log('='.repeat(50) + '\n');
}

async function main() {
  console.log('🚀 Starting Scraper Manager');
  console.log(`⚙️ Config: ${JSON.stringify(CONFIG, null, 2)}`);

  while (isRunning) {
    try {
      await runScrapingCycle();
    } catch (error) {
      console.error('❌ Cycle error:', error);
    }

    if (isRunning) {
      console.log(`💤 Sleeping for ${CONFIG.CYCLE_DELAY / 1000}s before next cycle...`);
      await sleep(CONFIG.CYCLE_DELAY);
    }
  }

  console.log('👋 Scraper Manager shut down complete');
}

main().catch(console.error);
