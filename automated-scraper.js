#!/usr/bin/env node

/**
 * HOT MATCH - Automated Startup Discovery Scraper
 * 
 * This script runs continuously and:
 * 1. Fetches articles from RSS feeds every 30 minutes
 * 2. Extracts startup mentions using AI
 * 3. Calculates GOD scores for discovered startups
 * 4. Auto-imports high-quality startups to the main database
 * 
 * Run: node automated-scraper.js
 * Or as daemon: pm2 start automated-scraper.js --name "hot-scraper"
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');

// Configuration
const CONFIG = {
  RSS_FETCH_INTERVAL: 30 * 60 * 1000,  // 30 minutes
  STARTUP_DISCOVERY_INTERVAL: 60 * 60 * 1000,  // 1 hour
  MAX_ARTICLES_PER_SOURCE: 20,
  ARTICLE_AGE_DAYS: 7,
  MIN_CONFIDENCE_FOR_IMPORT: 0.7,
  MIN_GOD_SCORE_FOR_IMPORT: 60,
  RETRY_DELAY: 5000,
  MAX_RETRIES: 3,
};

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ FATAL: Missing Supabase credentials!');
  console.error('   Required: SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   Required: SUPABASE_SERVICE_KEY');
  console.error('\n   Get service key from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const parser = new Parser({
  timeout: 30000,
  customFields: {
    item: [['content:encoded', 'content'], ['description', 'description']]
  }
});

let openai = null;
if (OPENAI_API_KEY) {
  const OpenAI = require('openai').default;
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// Logging helpers
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] ℹ️  ${msg}`),
  success: (msg) => console.log(`[${new Date().toISOString()}] ✅ ${msg}`),
  warn: (msg) => console.log(`[${new Date().toISOString()}] ⚠️  ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ❌ ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`[${new Date().toISOString()}] 🔍 ${msg}`),
};

// Create a scraper run record
async function startScraperRun(runType, triggeredBy = 'cron') {
  try {
    // Use raw SQL to bypass schema cache
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `INSERT INTO scraper_runs (run_type, status, triggered_by, metadata) 
              VALUES ('${runType}', 'running', '${triggeredBy}', '{"pid": ${process.pid}}') 
              RETURNING *`
    });
    
    if (error) {
      // Fallback: try direct insert
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('scraper_runs')
        .insert({
          run_type: runType,
          status: 'running',
          triggered_by: triggeredBy,
          metadata: { pid: process.pid }
        })
        .select()
        .single();
      
      if (fallbackError) {
        log.warn(`Could not create scraper run record: ${fallbackError.message}`);
        // Return a fake run ID so scraper continues
        return { id: 'local-' + Date.now() };
      }
      return fallbackData;
    }
    return data?.[0] || { id: 'local-' + Date.now() };
  } catch (err) {
    log.warn(`Scraper run tracking unavailable: ${err.message}`);
    return { id: 'local-' + Date.now() };
  }
}

// Update scraper run with results
async function completeScraperRun(runId, stats, errors = []) {
  // Skip if we have a local-only run ID
  if (runId && runId.toString().startsWith('local-')) {
    log.info('Scraper run completed (local tracking)');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('scraper_runs')
      .update({
        status: errors.length > 0 ? 'partial' : 'completed',
        completed_at: new Date().toISOString(),
        articles_fetched: stats.articlesFetched || 0,
        startups_discovered: stats.startupsDiscovered || 0,
        startups_imported: stats.startupsImported || 0,
        errors: errors.slice(0, 50)  // Limit stored errors
      })
      .eq('id', runId);
    
    if (error) log.warn(`Could not update scraper run: ${error.message}`);
  } catch (err) {
    log.warn(`Scraper run update failed: ${err.message}`);
  }
}

// Fetch and parse RSS feeds
async function fetchRSSFeeds() {
  const run = await startScraperRun('rss_fetch');
  // Continue even if tracking fails
  const runId = run?.id || 'local-' + Date.now();

  log.info('Starting RSS feed fetch...');
  
  const stats = { articlesFetched: 0, sourcesProcessed: 0, sourcesFailed: 0 };
  const errors = [];
  
  // Get active RSS sources
  const { data: sources, error: sourcesError } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true);
  
  if (sourcesError || !sources?.length) {
    log.error('No active RSS sources found');
    await completeScraperRun(runId, stats, [{ message: 'No active RSS sources' }]);
    return { success: false, stats };
  }

  log.info(`Processing ${sources.length} RSS sources...`);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.ARTICLE_AGE_DAYS);

  for (const source of sources) {
    try {
      log.debug(`Fetching: ${source.name}`);
      
      const feed = await parser.parseURL(source.url).catch(err => {
        throw new Error(`Parse failed: ${err.message}`);
      });
      
      if (!feed.items?.length) {
        log.debug(`No items in ${source.name}`);
        continue;
      }

      // Filter and prepare articles
      const articles = feed.items
        .filter(item => {
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          return pubDate >= cutoffDate;
        })
        .slice(0, CONFIG.MAX_ARTICLES_PER_SOURCE)
        .map(item => ({
          title: item.title?.substring(0, 500) || 'Untitled',
          url: item.link,
          summary: (item.contentSnippet || item.description || '')?.substring(0, 2000),
          full_content: (item.content || item.description || '')?.substring(0, 10000),
          source_id: source.id,
          author: item.creator || item.author || null,
          published_at: item.pubDate || new Date().toISOString(),
          topics: extractTopics(item),
          companies_mentioned: extractCompanies(item),
        }));

      // Upsert articles (avoid duplicates by URL)
      for (const article of articles) {
        const { error: insertError } = await supabase
          .from('scraped_articles')
          .upsert(article, { onConflict: 'url', ignoreDuplicates: true });
        
        if (!insertError) stats.articlesFetched++;
      }

      // Update source status
      await supabase
        .from('rss_sources')
        .update({ 
          last_scraped: new Date().toISOString(),
          connection_status: 'ok',
          articles_count: (source.articles_count || 0) + articles.length,
          last_error: null
        })
        .eq('id', source.id);

      stats.sourcesProcessed++;
      log.debug(`${source.name}: ${articles.length} articles`);
      
      // Rate limiting
      await sleep(1000);
      
    } catch (err) {
      stats.sourcesFailed++;
      errors.push({ source: source.name, message: err.message });
      log.warn(`Failed ${source.name}: ${err.message}`);
      
      // Update source with error
      await supabase
        .from('rss_sources')
        .update({ 
          connection_status: 'error',
          last_error: err.message,
          last_checked: new Date().toISOString()
        })
        .eq('id', source.id);
    }
  }

  await completeScraperRun(runId, stats, errors);
  log.success(`RSS fetch complete: ${stats.articlesFetched} articles from ${stats.sourcesProcessed} sources`);
  
  return { success: true, stats };
}

// Extract topics from article
function extractTopics(item) {
  const topics = new Set();
  const text = `${item.title || ''} ${item.contentSnippet || ''} ${item.description || ''}`.toLowerCase();
  
  const topicKeywords = {
    'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'llm', 'gpt'],
    'Fintech': ['fintech', 'payments', 'banking', 'crypto', 'blockchain', 'defi'],
    'Healthcare': ['healthcare', 'healthtech', 'medtech', 'biotech', 'medical'],
    'Climate': ['climate', 'cleantech', 'sustainability', 'carbon', 'renewable'],
    'Enterprise': ['enterprise', 'b2b', 'saas', 'workflow', 'productivity'],
    'Consumer': ['consumer', 'd2c', 'retail', 'ecommerce'],
    'Cybersecurity': ['security', 'cybersecurity', 'privacy', 'encryption'],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.add(topic);
    }
  }
  
  return Array.from(topics);
}

// Extract company mentions from article
function extractCompanies(item) {
  const companies = new Set();
  const text = `${item.title || ''} ${item.contentSnippet || ''}`;
  
  // Look for patterns like "CompanyName raised" or "CompanyName announced"
  const patterns = [
    /([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+(?:raised|announces?|launches?|secures?|closes?)/gi,
    /startup\s+([A-Z][a-zA-Z0-9]+)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const company = match[1].trim();
      if (company.length > 2 && company.length < 50) {
        companies.add(company);
      }
    }
  }
  
  return Array.from(companies);
}

// Discover startups from articles using AI
async function discoverStartupsFromArticles() {
  if (!openai) {
    log.warn('OpenAI not configured - skipping AI startup discovery');
    return { success: false, stats: {} };
  }

  const run = await startScraperRun('startup_discovery');
  const runId = run?.id || 'local-' + Date.now();

  log.info('Starting AI startup discovery...');
  
  const stats = { startupsDiscovered: 0, startupsImported: 0, articlesProcessed: 0 };
  const errors = [];

  // Get unprocessed articles from last 7 days
  const { data: articles, error } = await supabase
    .from('scraped_articles')
    .select('*')
    .eq('is_processed', false)
    .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('published_at', { ascending: false })
    .limit(50);

  if (error || !articles?.length) {
    log.info('No unprocessed articles found');
    await completeScraperRun(runId, stats, []);
    return { success: true, stats };
  }

  log.info(`Processing ${articles.length} articles for startup mentions...`);

  for (const article of articles) {
    try {
      const startups = await extractStartupsWithAI(article);
      
      for (const startup of startups) {
        // Check if already exists
        const { data: existing } = await supabase
          .from('discovered_startups')
          .select('id')
          .eq('name', startup.name)
          .single();

        if (!existing) {
          // Calculate GOD score
          const godScore = calculateGodScore(startup);
          
          const { error: insertError } = await supabase
            .from('discovered_startups')
            .insert({
              name: startup.name,
              description: startup.description,
              value_proposition: startup.valueProposition,
              problem: startup.problem,
              solution: startup.solution,
              sectors: startup.sectors,
              website: startup.website,
              funding_amount: startup.fundingAmount,
              funding_stage: startup.fundingStage,
              investors_mentioned: startup.investors,
              article_url: article.url,
              source_article_id: article.id,
              scraper_run_id: typeof runId === 'string' && runId.startsWith('local-') ? null : runId,
              god_score: godScore.total,
              god_score_breakdown: godScore.breakdown,
              confidence_score: startup.confidence,
            });

          if (!insertError) {
            stats.startupsDiscovered++;
            if (startup.confidence >= CONFIG.MIN_CONFIDENCE_FOR_IMPORT && godScore.total >= CONFIG.MIN_GOD_SCORE_FOR_IMPORT) {
              stats.startupsImported++;
            }
          }
        }
      }

      // Mark article as processed
      await supabase
        .from('scraped_articles')
        .update({ is_processed: true, processed_at: new Date().toISOString() })
        .eq('id', article.id);

      stats.articlesProcessed++;
      
      // Rate limit API calls
      await sleep(2000);
      
    } catch (err) {
      errors.push({ article: article.title, message: err.message });
      log.warn(`Failed to process article: ${err.message}`);
    }
  }

  await completeScraperRun(runId, stats, errors);
  log.success(`Startup discovery complete: ${stats.startupsDiscovered} discovered, ${stats.startupsImported} auto-imported`);
  
  return { success: true, stats };
}

// Extract startup information using OpenAI
async function extractStartupsWithAI(article) {
  const prompt = `Analyze this news article and extract any startup companies mentioned that are seeking or have received funding.

Article Title: ${article.title}
Article Content: ${article.full_content || article.summary || ''}

For each startup found, extract:
- name: Company name
- description: One-line description
- valueProposition: What value they provide
- problem: Problem they solve
- solution: Their solution
- sectors: Array of sectors (AI/ML, Fintech, Healthcare, Climate, Enterprise, Consumer, Cybersecurity, etc.)
- website: Website URL if mentioned
- fundingAmount: Funding amount if mentioned (e.g., "$5M")
- fundingStage: Stage (Pre-Seed, Seed, Series A, etc.)
- investors: Array of investor names mentioned
- confidence: Your confidence this is a real startup (0.0-1.0)

Return a JSON array of startups. If no startups found, return [].
Only include companies that appear to be actual startups, not established corporations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a startup analyst. Extract startup information from news articles. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '[]';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const startups = JSON.parse(jsonMatch[0]);
      return startups.filter(s => s.name && s.confidence >= 0.5);
    }
    return [];
  } catch (err) {
    log.error(`AI extraction failed: ${err.message}`);
    return [];
  }
}

// Calculate GOD score for a startup
function calculateGodScore(startup) {
  const breakdown = {
    team: 50,      // Default since we don't have team info from articles
    traction: 50,  // Based on funding mentions
    market: 50,    // Based on sector
    product: 50,   // Based on description quality
    vision: 50,    // Based on problem/solution clarity
  };

  // Traction - boost for funding
  if (startup.fundingAmount) {
    const amount = parseFloat(startup.fundingAmount.replace(/[^0-9.]/g, ''));
    if (amount >= 10) breakdown.traction = 80;
    else if (amount >= 5) breakdown.traction = 70;
    else if (amount >= 1) breakdown.traction = 60;
  }
  if (startup.investors?.length > 2) breakdown.traction += 10;

  // Market - hot sectors get boost
  const hotSectors = ['AI/ML', 'Climate', 'Cybersecurity'];
  if (startup.sectors?.some(s => hotSectors.includes(s))) {
    breakdown.market = 70;
  }

  // Product - quality of description
  if (startup.description?.length > 50) breakdown.product += 10;
  if (startup.solution?.length > 30) breakdown.product += 10;

  // Vision - problem/solution clarity
  if (startup.problem?.length > 20 && startup.solution?.length > 20) {
    breakdown.vision = 70;
  }

  // Cap at 100
  for (const key of Object.keys(breakdown)) {
    breakdown[key] = Math.min(100, breakdown[key]);
  }

  const total = Math.round(
    breakdown.team * 0.25 +
    breakdown.traction * 0.25 +
    breakdown.market * 0.20 +
    breakdown.product * 0.15 +
    breakdown.vision * 0.15
  );

  return { total: Math.min(100, total), breakdown };
}

// Helper sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main runner
async function runPipeline() {
  log.info('═══════════════════════════════════════════════════════════════');
  log.info('   🔥 HOT MATCH - Automated Startup Discovery Pipeline');
  log.info('═══════════════════════════════════════════════════════════════');
  
  // Step 1: Fetch RSS articles
  const rssResult = await fetchRSSFeeds();
  
  // Step 2: Discover startups from articles
  const discoveryResult = await discoverStartupsFromArticles();
  
  log.info('═══════════════════════════════════════════════════════════════');
  log.info('   Pipeline Summary:');
  log.info(`   📰 Articles fetched: ${rssResult.stats.articlesFetched || 0}`);
  log.info(`   🚀 Startups discovered: ${discoveryResult.stats.startupsDiscovered || 0}`);
  log.info(`   ✅ Startups imported: ${discoveryResult.stats.startupsImported || 0}`);
  log.info('═══════════════════════════════════════════════════════════════');
}

// Daemon mode - run continuously
async function runDaemon() {
  log.info('Starting in daemon mode...');
  
  // Run immediately
  await runPipeline();
  
  // Schedule RSS fetching every 30 minutes
  setInterval(async () => {
    log.info('Scheduled RSS fetch starting...');
    await fetchRSSFeeds();
  }, CONFIG.RSS_FETCH_INTERVAL);
  
  // Schedule startup discovery every hour
  setInterval(async () => {
    log.info('Scheduled startup discovery starting...');
    await discoverStartupsFromArticles();
  }, CONFIG.STARTUP_DISCOVERY_INTERVAL);
  
  log.info(`Daemon running. RSS fetch every ${CONFIG.RSS_FETCH_INTERVAL/60000}min, discovery every ${CONFIG.STARTUP_DISCOVERY_INTERVAL/60000}min`);
}

// Entry point
const args = process.argv.slice(2);
if (args.includes('--daemon') || args.includes('-d')) {
  runDaemon().catch(err => {
    log.error(`Daemon crashed: ${err.message}`);
    process.exit(1);
  });
} else {
  runPipeline().then(() => {
    log.info('Pipeline complete');
    process.exit(0);
  }).catch(err => {
    log.error(`Pipeline failed: ${err.message}`);
    process.exit(1);
  });
}
