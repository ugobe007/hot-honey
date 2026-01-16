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
  DELAY_BETWEEN_SOURCES: 10000,  // 10 seconds (increased from 5)
  DELAY_BETWEEN_ARTICLES: 2000,  // 2 seconds (increased from 1)
  MAX_ARTICLES_PER_SOURCE: 20,
  CYCLE_DELAY: 600000,           // 10 minutes between full cycles (increased from 5)
  
  // Rate limiting for problematic sources
  RATE_LIMITED_SOURCES: {
    'hacker news': { delay: 30000, maxRetries: 2 },      // 30 second delay for HN
    'hackernews': { delay: 30000, maxRetries: 2 },
    'hn': { delay: 30000, maxRetries: 2 },
    'crunchbase': { delay: 20000, maxRetries: 3 },       // 20 second delay for Crunchbase
    'techcrunch': { delay: 15000, maxRetries: 3 },
  },
  
  // Backoff settings
  INITIAL_BACKOFF: 5000,
  MAX_BACKOFF: 120000,  // 2 minutes max
  BACKOFF_MULTIPLIER: 2,
};

// Track rate limit state per source
const rateLimitState = {};

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
  const sourceLower = source.name.toLowerCase();
  
  // Check if source is rate-limited and has backoff
  const state = rateLimitState[sourceLower] || { backoff: 0, lastError: null, errorCount: 0 };
  
  // Skip if we're in backoff period
  if (state.backoff > 0 && state.lastError && (Date.now() - state.lastError) < state.backoff) {
    const waitTime = Math.ceil((state.backoff - (Date.now() - state.lastError)) / 1000);
    console.log(`⏳ ${source.name}: In backoff period, skipping (${waitTime}s remaining)`);
    return [];
  }
  
  // Apply source-specific delay for known rate-limited sources
  for (const [key, config] of Object.entries(CONFIG.RATE_LIMITED_SOURCES)) {
    if (sourceLower.includes(key)) {
      console.log(`⏱️ ${source.name}: Applying ${config.delay / 1000}s delay (rate-limited source)`);
      await sleep(config.delay);
      break;
    }
  }
  
  try {
    console.log(`📡 Fetching: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    
    // Success - reset backoff
    rateLimitState[sourceLower] = { backoff: 0, lastError: null, errorCount: 0 };
    
    return feed.items || [];
  } catch (error) {
    const isRateLimit = error.message.includes('429') || 
                        error.message.includes('Too Many') ||
                        error.message.includes('rate limit');
    const isConnectionError = error.message.includes('ECONNRESET') ||
                              error.message.includes('ETIMEDOUT') ||
                              error.message.includes('timeout');
    
    // Calculate backoff
    const currentBackoff = state.backoff || CONFIG.INITIAL_BACKOFF;
    const newBackoff = Math.min(currentBackoff * CONFIG.BACKOFF_MULTIPLIER, CONFIG.MAX_BACKOFF);
    
    if (isRateLimit) {
      console.error(`🚫 ${source.name}: Rate limited (429) - backing off for ${newBackoff / 1000}s`);
      rateLimitState[sourceLower] = {
        backoff: newBackoff,
        lastError: Date.now(),
        errorCount: (state.errorCount || 0) + 1
      };
    } else if (isConnectionError) {
      console.error(`🔌 ${source.name}: Connection error - backing off for ${newBackoff / 1000}s`);
      rateLimitState[sourceLower] = {
        backoff: newBackoff,
        lastError: Date.now(),
        errorCount: (state.errorCount || 0) + 1
      };
    } else {
      console.error(`❌ Failed to fetch ${source.name}:`, error.message);
    }
    
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
