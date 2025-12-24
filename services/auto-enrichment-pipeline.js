/**
 * AUTO-ENRICHMENT PIPELINE
 * 
 * PM2-managed background process that automatically:
 * 1. Detects sparse records (investors, startups, discovered_startups)
 * 2. Enriches them using the dynamic parser
 * 3. Generates embeddings for enriched records
 * 4. Logs progress and metrics
 * 
 * Run: pm2 start services/auto-enrichment-pipeline.js --name enrichment-pipeline
 * 
 * Configuration via environment:
 *   ENRICHMENT_BATCH_SIZE=10       # Records per batch
 *   ENRICHMENT_INTERVAL_MS=300000  # 5 minutes between runs
 *   ENRICHMENT_DAILY_LIMIT=500     # Max enrichments per day
 */

require('dotenv').config();
const { DynamicParser } = require('../lib/dynamic-parser');
const { mapToGodFields } = require('../lib/god-field-mapper');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Configuration
const CONFIG = {
  batchSize: parseInt(process.env.ENRICHMENT_BATCH_SIZE || '10'),
  intervalMs: parseInt(process.env.ENRICHMENT_INTERVAL_MS || '300000'), // 5 min
  dailyLimit: parseInt(process.env.ENRICHMENT_DAILY_LIMIT || '500'),
  minDescriptionLength: 50,
  minSectorCount: 1
};

// Initialize clients
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const parser = new DynamicParser();

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});

// Daily counter (resets at midnight)
let dailyEnrichments = 0;
let lastResetDate = new Date().toDateString();

// Metrics for current run
let metrics = {
  runCount: 0,
  totalEnriched: 0,
  totalEmbeddings: 0,
  errors: [],
  lastRun: null
};

/**
 * Main enrichment loop
 */
async function runEnrichmentCycle() {
  // Reset daily counter at midnight
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyEnrichments = 0;
    lastResetDate = today;
    log('📅 Daily limit reset');
  }

  // Check daily limit
  if (dailyEnrichments >= CONFIG.dailyLimit) {
    log(`⏸️ Daily limit reached (${CONFIG.dailyLimit}). Waiting for reset.`);
    return;
  }

  metrics.runCount++;
  metrics.lastRun = new Date().toISOString();
  log(`\n🚀 Starting enrichment cycle #${metrics.runCount}`);

  try {
    // 1. Find sparse investors
    const sparseInvestors = await findSparseInvestors(CONFIG.batchSize);
    if (sparseInvestors.length > 0) {
      await enrichInvestors(sparseInvestors);
    }

    // 2. Find sparse startups
    const sparseStartups = await findSparseStartups(CONFIG.batchSize);
    if (sparseStartups.length > 0) {
      await enrichStartups(sparseStartups);
    }

    // 3. Find startups needing embeddings
    const needEmbeddings = await findNeedingEmbeddings(CONFIG.batchSize * 2);
    if (needEmbeddings.length > 0) {
      await generateEmbeddings(needEmbeddings);
    }

    // Log metrics
    await logMetrics();

  } catch (error) {
    log(`❌ Cycle error: ${error.message}`, 'error');
    metrics.errors.push({ time: new Date().toISOString(), error: error.message });
  }
}

/**
 * Find investors with sparse data
 */
async function findSparseInvestors(limit) {
  const { data, error } = await supabase
    .from('investors')
    .select('id, name, linkedin_url, bio, sectors, check_size_min, investment_thesis')
    .or(`bio.is.null,bio.eq.`)
    .not('linkedin_url', 'is', null)
    .limit(limit);

  if (error) {
    log(`Error finding sparse investors: ${error.message}`, 'error');
    return [];
  }

  // Filter to truly sparse ones
  return (data || []).filter(inv => {
    const hasGoodBio = inv.bio && inv.bio.length > CONFIG.minDescriptionLength;
    const hasGoodSectors = inv.sectors && inv.sectors.length > CONFIG.minSectorCount && 
      !inv.sectors.every(s => s.toLowerCase() === 'technology');
    return !hasGoodBio || !hasGoodSectors;
  });
}

/**
 * Find startups with sparse data
 */
async function findSparseStartups(limit) {
  const { data, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, description, tagline, pitch, sectors, contrarian_belief')
    .eq('status', 'approved')
    .or(`description.is.null,description.eq.`)
    .not('website', 'is', null)
    .limit(limit);

  if (error) {
    log(`Error finding sparse startups: ${error.message}`, 'error');
    return [];
  }

  return (data || []).filter(s => {
    const hasGoodDesc = s.description && s.description.length > CONFIG.minDescriptionLength;
    const hasGoodSectors = s.sectors && s.sectors.length > CONFIG.minSectorCount;
    return !hasGoodDesc || !hasGoodSectors;
  });
}

/**
 * Find records needing embeddings
 */
async function findNeedingEmbeddings(limit) {
  // Startups with description but no embedding
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, description, tagline, pitch, sectors')
    .eq('status', 'approved')
    .is('embedding', null)
    .not('description', 'is', null)
    .gt('description', '')
    .limit(limit);

  // Investors with bio but no embedding
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, bio, sectors, investment_thesis')
    .is('embedding', null)
    .not('bio', 'is', null)
    .gt('bio', '')
    .limit(limit);

  return {
    startups: startups || [],
    investors: investors || []
  };
}

/**
 * Enrich investors via dynamic parser
 */
async function enrichInvestors(investors) {
  log(`📊 Enriching ${investors.length} investors...`);

  for (const investor of investors) {
    if (dailyEnrichments >= CONFIG.dailyLimit) break;

    try {
      let url = investor.linkedin_url;
      if (!url) continue;
      
      // Ensure URL has protocol
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      log(`  → Parsing ${investor.name}: ${url}`);
      const parsed = await parser.parseAs(url, 'investor');

      if (parsed && Object.keys(parsed).length > 2) {
        const update = buildInvestorUpdate(parsed);
        
        const { error } = await supabase
          .from('investors')
          .update(update)
          .eq('id', investor.id);

        if (!error) {
          dailyEnrichments++;
          metrics.totalEnriched++;
          log(`    ✅ Enriched ${investor.name}`);
        }
      }
    } catch (err) {
      log(`    ❌ Failed ${investor.name}: ${err.message}`, 'warn');
    }

    // Rate limiting
    await sleep(2000);
  }
}

/**
 * Enrich startups via dynamic parser
 */
async function enrichStartups(startups) {
  log(`🚀 Enriching ${startups.length} startups...`);

  for (const startup of startups) {
    if (dailyEnrichments >= CONFIG.dailyLimit) break;

    try {
      let url = startup.website;
      if (!url) continue;
      
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      log(`  → Parsing ${startup.name}: ${url}`);
      const parsed = await parser.parseAs(url, 'startup');

      if (parsed && Object.keys(parsed).length > 2) {
        // Apply GOD field mapper
        const godFields = mapToGodFields(parsed);
        const update = buildStartupUpdate(parsed, godFields);
        
        const { error } = await supabase
          .from('startup_uploads')
          .update(update)
          .eq('id', startup.id);

        if (!error) {
          dailyEnrichments++;
          metrics.totalEnriched++;
          log(`    ✅ Enriched ${startup.name}`);
        }
      }
    } catch (err) {
      log(`    ❌ Failed ${startup.name}: ${err.message}`, 'warn');
    }

    await sleep(2000);
  }
}

/**
 * Generate embeddings for enriched records
 */
async function generateEmbeddings(records) {
  const { startups, investors } = records;
  
  if (startups.length > 0) {
    log(`🧠 Generating embeddings for ${startups.length} startups...`);
    for (const startup of startups) {
      try {
        const text = buildEmbeddingText(startup, 'startup');
        const embedding = await createEmbedding(text);
        
        await supabase
          .from('startup_uploads')
          .update({ embedding })
          .eq('id', startup.id);
        
        metrics.totalEmbeddings++;
        log(`    ✅ Embedded: ${startup.name}`);
      } catch (err) {
        log(`    ❌ Embedding failed for ${startup.name}: ${err.message}`, 'warn');
      }
      await sleep(500);
    }
  }

  if (investors.length > 0) {
    log(`🧠 Generating embeddings for ${investors.length} investors...`);
    for (const investor of investors) {
      try {
        const text = buildEmbeddingText(investor, 'investor');
        const embedding = await createEmbedding(text);
        
        await supabase
          .from('investors')
          .update({ embedding })
          .eq('id', investor.id);
        
        metrics.totalEmbeddings++;
        log(`    ✅ Embedded: ${investor.name}`);
      } catch (err) {
        log(`    ❌ Embedding failed for ${investor.name}: ${err.message}`, 'warn');
      }
      await sleep(500);
    }
  }
}

/**
 * Build investor update object from parsed data
 */
function buildInvestorUpdate(parsed) {
  const update = { updated_at: new Date().toISOString() };
  
  if (parsed.description) update.bio = parsed.description.substring(0, 2000);
  if (parsed.investment_thesis) update.investment_thesis = parsed.investment_thesis;
  if (parsed.sectors && parsed.sectors.length > 0) {
    update.sectors = normalizeSectors(parsed.sectors);
  }
  if (parsed.stage && parsed.stage.length > 0) update.stage = parsed.stage;
  if (parsed.check_size_min) update.check_size_min = parsed.check_size_min;
  if (parsed.check_size_max) update.check_size_max = parsed.check_size_max;
  if (parsed.partners && parsed.partners.length > 0) update.partners = parsed.partners;
  if (parsed.portfolio_companies) update.portfolio_companies = parsed.portfolio_companies;
  if (parsed.geography) update.geography_focus = [parsed.geography];

  return update;
}

/**
 * Build startup update object from parsed data
 */
function buildStartupUpdate(parsed, godFields) {
  const update = { updated_at: new Date().toISOString() };
  
  if (parsed.description) update.description = parsed.description.substring(0, 2000);
  if (parsed.tagline) update.tagline = parsed.tagline;
  if (parsed.value_proposition) update.pitch = parsed.value_proposition;
  if (parsed.sectors && parsed.sectors.length > 0) {
    update.sectors = normalizeSectors(parsed.sectors);
  }
  if (parsed.founders && parsed.founders.length > 0) update.founders = parsed.founders;
  if (parsed.team_size) update.team_size = parsed.team_size;
  if (parsed.funding_stage) update.latest_funding_round = parsed.funding_stage;
  if (parsed.funding_amount) update.latest_funding_amount = parsed.funding_amount;
  
  // Apply GOD-relevant fields
  if (godFields.contrarian_belief) update.contrarian_belief = godFields.contrarian_belief;
  if (godFields.why_now) update.why_now = godFields.why_now;
  if (godFields.unfair_advantage) update.unfair_advantage = godFields.unfair_advantage;
  if (godFields.credential_signals) update.credential_signals = godFields.credential_signals;

  return update;
}

/**
 * Build text for embedding generation
 */
function buildEmbeddingText(record, type) {
  if (type === 'startup') {
    return [
      record.name,
      record.tagline || '',
      record.description || '',
      record.pitch || '',
      `Sectors: ${(record.sectors || []).join(', ')}`
    ].filter(Boolean).join('\n');
  } else {
    return [
      `${record.firm || ''} - ${record.name}`,
      record.bio || '',
      record.investment_thesis || '',
      `Focus: ${(record.sectors || []).join(', ')}`
    ].filter(Boolean).join('\n');
  }
}

/**
 * Create embedding using OpenAI
 */
async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000), // Token limit safety
    dimensions: 1536
  });
  return response.data[0].embedding;
}

/**
 * Normalize sectors
 */
function normalizeSectors(sectors) {
  if (!sectors || !Array.isArray(sectors)) return sectors;
  
  const sectorMap = {
    'ai': 'Artificial Intelligence',
    'artificial intelligence': 'Artificial Intelligence',
    'ml': 'Machine Learning',
    'saas': 'SaaS',
    'fintech': 'FinTech',
    'healthtech': 'HealthTech',
    'healthcare': 'HealthTech',
    'edtech': 'EdTech',
    'enterprise': 'Enterprise Software',
    'devtools': 'Developer Tools',
    'crypto': 'Crypto/Web3',
    'web3': 'Crypto/Web3',
    'climate': 'Climate Tech',
    'ecommerce': 'E-Commerce',
    'e-commerce': 'E-Commerce',
    'cybersecurity': 'Cybersecurity',
    'security': 'Cybersecurity'
  };
  
  return sectors.map(s => {
    const lower = s.toLowerCase().trim();
    return sectorMap[lower] || s;
  }).filter((s, i, arr) => arr.indexOf(s) === i);
}

/**
 * Log metrics to database
 */
async function logMetrics() {
  try {
    await supabase.from('ai_logs').insert({
      operation: 'enrichment-pipeline',
      model: 'claude-3-haiku + text-embedding-3-small',
      input_tokens: null,
      output_tokens: null,
      status: 'success',
      error_message: JSON.stringify({
        runCount: metrics.runCount,
        dailyEnrichments,
        totalEnriched: metrics.totalEnriched,
        totalEmbeddings: metrics.totalEmbeddings,
        errors: metrics.errors.slice(-5)
      })
    });
  } catch (err) {
    log(`Failed to log metrics: ${err.message}`, 'warn');
  }
}

/**
 * Logging helper
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📝';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  log('🛑 Shutting down enrichment pipeline...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Shutting down enrichment pipeline...');
  process.exit(0);
});

/**
 * Main entry point
 */
async function main() {
  log('🚀 Auto-Enrichment Pipeline starting...');
  log(`   Batch size: ${CONFIG.batchSize}`);
  log(`   Interval: ${CONFIG.intervalMs / 1000}s`);
  log(`   Daily limit: ${CONFIG.dailyLimit}`);

  // Run immediately
  await runEnrichmentCycle();

  // Then run on interval
  setInterval(runEnrichmentCycle, CONFIG.intervalMs);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'error');
  process.exit(1);
});
