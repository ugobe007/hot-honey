#!/usr/bin/env node

/**
 * Automated Investor Enrichment Service with Token Limits
 * 
 * Features:
 * - Daily/hourly token budget limits
 * - Tracks token usage in database
 * - Prioritizes investors by value (VCs first, then Angels)
 * - Uses gpt-4o-mini for cost efficiency
 * - Automatic pause when budget exhausted
 * 
 * Cost Reference (gpt-4o-mini):
 * - Input: $0.15 / 1M tokens
 * - Output: $0.60 / 1M tokens
 * - ~500 tokens per enrichment = ~$0.0004 per investor
 * - 1000 investors ≈ $0.40
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
});

// ============== CONFIGURATION ==============

const CONFIG = {
  // Token Limits
  DAILY_TOKEN_BUDGET: 100000,      // 100K tokens/day (~$0.06/day max)
  HOURLY_TOKEN_BUDGET: 15000,       // 15K tokens/hour
  PER_REQUEST_MAX_TOKENS: 800,      // Max tokens per completion
  
  // Batch Settings
  BATCH_SIZE: 5,                    // Process 5 investors at a time
  DELAY_BETWEEN_BATCHES: 10000,     // 10 seconds between batches
  DELAY_BETWEEN_REQUESTS: 3000,     // 3 seconds between API calls
  CHECK_INTERVAL: 300000,           // 5 minutes between checks when idle
  
  // Priority (higher = process first)
  PRIORITY_ORDER: ['VC Firm', 'VC', 'Accelerator', 'Corporate VC', 'Angel'],
  
  // Model
  MODEL: 'gpt-4o-mini',             // Cost-efficient model
  
  // Feature flags
  DRY_RUN: false,                   // Set to true to test without API calls
  VERBOSE: true,                    // Detailed logging
};

// ============== TOKEN TRACKING ==============

let tokenUsage = {
  daily: { tokens: 0, resetAt: new Date() },
  hourly: { tokens: 0, resetAt: new Date() },
};

function resetTokenCountersIfNeeded() {
  const now = new Date();
  
  // Reset daily counter
  if (now.getDate() !== tokenUsage.daily.resetAt.getDate()) {
    console.log('📅 Resetting daily token counter');
    tokenUsage.daily = { tokens: 0, resetAt: now };
  }
  
  // Reset hourly counter
  const hourDiff = (now - tokenUsage.hourly.resetAt) / (1000 * 60 * 60);
  if (hourDiff >= 1) {
    console.log('⏰ Resetting hourly token counter');
    tokenUsage.hourly = { tokens: 0, resetAt: now };
  }
}

function canMakeRequest() {
  resetTokenCountersIfNeeded();
  
  if (tokenUsage.daily.tokens >= CONFIG.DAILY_TOKEN_BUDGET) {
    console.log(`🛑 Daily token budget exhausted (${tokenUsage.daily.tokens}/${CONFIG.DAILY_TOKEN_BUDGET})`);
    return false;
  }
  
  if (tokenUsage.hourly.tokens >= CONFIG.HOURLY_TOKEN_BUDGET) {
    console.log(`⏳ Hourly token budget exhausted (${tokenUsage.hourly.tokens}/${CONFIG.HOURLY_TOKEN_BUDGET})`);
    return false;
  }
  
  return true;
}

function trackTokens(usage) {
  tokenUsage.daily.tokens += usage.total_tokens;
  tokenUsage.hourly.tokens += usage.total_tokens;
  
  if (CONFIG.VERBOSE) {
    console.log(`   📊 Tokens: +${usage.total_tokens} (Daily: ${tokenUsage.daily.tokens}/${CONFIG.DAILY_TOKEN_BUDGET}, Hourly: ${tokenUsage.hourly.tokens}/${CONFIG.HOURLY_TOKEN_BUDGET})`);
  }
}

// ============== ENRICHMENT ==============

async function enrichInvestor(investor) {
  console.log(`\n🔍 Enriching: ${investor.name} (${investor.type || 'Unknown type'})`);
  
  if (CONFIG.DRY_RUN) {
    console.log('   [DRY RUN] Would call OpenAI API');
    return { success: true, tokens: 500 };
  }
  
  if (!canMakeRequest()) {
    return { success: false, reason: 'budget_exceeded' };
  }
  
  try {
    const prompt = `Research "${investor.name}" ${investor.firm ? `(${investor.firm})` : ''} venture capital/angel investor. Return JSON only:

{
  "partners": [{"name": "Name", "title": "Title", "focus": "Investment focus"}],
  "exits": number_of_successful_exits,
  "unicorns": number_of_unicorn_investments,
  "fund_size": "$XXM or $XXB",
  "aum": "assets under management",
  "investment_pace": deals_per_year,
  "investment_thesis": "1-2 sentence summary",
  "website": "https://...",
  "linkedin": "https://linkedin.com/..."
}

If unknown, use null. Be concise.`;

    const completion = await openai.chat.completions.create({
      model: CONFIG.MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: CONFIG.PER_REQUEST_MAX_TOKENS,
    });

    // Track token usage
    trackTokens(completion.usage);
    
    const content = completion.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log('   ⚠️ No JSON found in response');
      return { success: false, reason: 'no_json', tokens: completion.usage.total_tokens };
    }

    const data = JSON.parse(jsonMatch[0]);
    
    // Build update object using ONLY columns that exist in the API schema
    // API columns: active_fund_size, bio, board_seats, focus_areas, investment_pace_per_year,
    // investment_thesis, last_enrichment_date, leads_rounds, linkedin_url, notable_investments,
    // partners, portfolio_companies, successful_exits, total_investments, twitter_url
    const updateData = {
      last_enrichment_date: new Date().toISOString(),
    };
    
    if (data.partners && Array.isArray(data.partners) && data.partners.length > 0) {
      updateData.partners = data.partners;
    }
    if (data.exits !== null && data.exits !== undefined) {
      // Map exits to successful_exits array or total count
      updateData.total_investments = parseInt(data.exits) || null;
    }
    if (data.fund_size) updateData.active_fund_size = data.fund_size;
    if (data.investment_pace) updateData.investment_pace_per_year = parseInt(data.investment_pace) || null;
    if (data.investment_thesis) updateData.investment_thesis = data.investment_thesis;
    if (data.website) updateData.blog_url = data.website; // Map website to blog_url
    if (data.linkedin) updateData.linkedin_url = data.linkedin;
    if (data.notable_investments && Array.isArray(data.notable_investments)) {
      updateData.notable_investments = data.notable_investments;
    }
    if (data.board_seats) updateData.board_seats = parseInt(data.board_seats) || null;
    
    // Update investor in database
    const { error } = await supabase
      .from('investors')
      .update(updateData)
      .eq('id', investor.id);

    if (error) {
      console.log('   ❌ Update failed:', error.message);
      return { success: false, reason: 'db_error', tokens: completion.usage.total_tokens };
    }

    console.log(`   ✅ Enriched: ${data.partners?.length || 0} partners, ${data.exits || 0} exits`);
    
    return { 
      success: true, 
      tokens: completion.usage.total_tokens,
      data: {
        partners: data.partners?.length || 0,
        exits: data.exits || 0,
        unicorns: data.unicorns || 0,
      }
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, reason: 'api_error', error: error.message };
  }
}

async function getUnenrichedInvestors(limit = CONFIG.BATCH_SIZE) {
  // Get all investors and filter in JS to avoid schema cache issues
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .limit(limit * 3); // Get more to filter

  if (error) {
    console.error('❌ Error fetching investors:', error);
    return [];
  }

  // Filter to unenriched (no last_enrichment_date or no partners data)
  const unenriched = (data || []).filter(inv => {
    if (inv.last_enrichment_date) return false;
    // Also skip if already has rich data
    if (inv.partners && Array.isArray(inv.partners) && inv.partners.length > 0) return false;
    return true;
  });

  // Sort by priority
  const sorted = unenriched.sort((a, b) => {
    const aPriority = CONFIG.PRIORITY_ORDER.indexOf(a.type) ?? 99;
    const bPriority = CONFIG.PRIORITY_ORDER.indexOf(b.type) ?? 99;
    return aPriority - bPriority;
  });

  return sorted.slice(0, limit);
}

async function getStats() {
  // Use select('*') to avoid schema cache issues with specific column names
  const { data, error } = await supabase
    .from('investors')
    .select('*');

  if (error) {
    console.error('Stats error:', error);
    return { total: 0, enriched: 0, withExits: 0, withPartners: 0 };
  }

  const total = data?.length || 0;
  const enriched = data?.filter(i => i.last_enrichment_date).length || 0;
  // Handle different possible column names
  const withExits = data?.filter(i => (i.exits > 0) || (i.successful_exits?.length > 0)).length || 0;
  const withPartners = data?.filter(i => {
    if (!i.partners) return false;
    if (Array.isArray(i.partners)) return i.partners.length > 0;
    return Object.keys(i.partners).length > 0;
  }).length || 0;

  return { total, enriched, withExits, withPartners };
}

async function processBatch() {
  if (!canMakeRequest()) {
    return { processed: 0, reason: 'budget_exceeded' };
  }

  const investors = await getUnenrichedInvestors(CONFIG.BATCH_SIZE);
  
  if (investors.length === 0) {
    return { processed: 0, reason: 'all_enriched' };
  }

  console.log(`\n📦 Processing batch of ${investors.length} investors...`);
  
  let successCount = 0;
  let totalTokens = 0;
  
  for (const investor of investors) {
    if (!canMakeRequest()) {
      console.log('   ⏸️ Budget limit reached, stopping batch');
      break;
    }
    
    const result = await enrichInvestor(investor);
    if (result.success) successCount++;
    if (result.tokens) totalTokens += result.tokens;
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_REQUESTS));
  }

  console.log(`\n✅ Batch complete: ${successCount}/${investors.length} successful (${totalTokens} tokens)`);
  return { processed: successCount, totalTokens };
}

// ============== MAIN LOOP ==============

async function runContinuously() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   AUTOMATED INVESTOR ENRICHMENT SERVICE');
  console.log('   With Token Limits & Budget Controls');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('⚙️  Configuration:');
  console.log(`   Model: ${CONFIG.MODEL}`);
  console.log(`   Daily budget: ${CONFIG.DAILY_TOKEN_BUDGET.toLocaleString()} tokens`);
  console.log(`   Hourly budget: ${CONFIG.HOURLY_TOKEN_BUDGET.toLocaleString()} tokens`);
  console.log(`   Batch size: ${CONFIG.BATCH_SIZE} investors`);
  console.log(`   Dry run: ${CONFIG.DRY_RUN}`);
  console.log('');

  while (true) {
    try {
      resetTokenCountersIfNeeded();
      
      // Check stats
      const stats = await getStats();
      const remaining = stats.total - stats.enriched;
      
      console.log(`\n📊 Database Stats:`);
      console.log(`   Total investors: ${stats.total}`);
      console.log(`   Enriched: ${stats.enriched} (${Math.round(stats.enriched/stats.total*100)}%)`);
      console.log(`   With exits: ${stats.withExits}`);
      console.log(`   With partners: ${stats.withPartners}`);
      console.log(`   Remaining: ${remaining}`);
      
      console.log(`\n💰 Token Budget:`);
      console.log(`   Daily: ${tokenUsage.daily.tokens.toLocaleString()}/${CONFIG.DAILY_TOKEN_BUDGET.toLocaleString()}`);
      console.log(`   Hourly: ${tokenUsage.hourly.tokens.toLocaleString()}/${CONFIG.HOURLY_TOKEN_BUDGET.toLocaleString()}`);

      if (!canMakeRequest()) {
        const waitTime = CONFIG.CHECK_INTERVAL;
        console.log(`\n⏳ Budget exhausted. Waiting ${waitTime/1000/60} minutes...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (remaining > 0) {
        const result = await processBatch();
        
        if (result.reason === 'budget_exceeded') {
          console.log(`\n⏳ Waiting for budget reset...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
        } else {
          console.log(`⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
        }
      } else {
        console.log(`\n✨ All investors enriched! Checking again in ${CONFIG.CHECK_INTERVAL/1000/60} minutes...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
      }
    } catch (error) {
      console.error('\n❌ Error in main loop:', error.message);
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s on error
    }
  }
}

// ============== CLI OPTIONS ==============

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Automated Investor Enrichment Service

Usage:
  node auto-enrich-with-limits.js [options]

Options:
  --dry-run      Test without making API calls
  --verbose      Show detailed logging
  --once         Run one batch and exit
  --stats        Show stats and exit
  --help         Show this help

Environment Variables:
  VITE_OPENAI_API_KEY      OpenAI API key
  VITE_SUPABASE_URL        Supabase URL
  VITE_SUPABASE_ANON_KEY   Supabase anon key
`);
  process.exit(0);
}

if (args.includes('--dry-run')) {
  CONFIG.DRY_RUN = true;
}

if (args.includes('--verbose')) {
  CONFIG.VERBOSE = true;
}

if (args.includes('--stats')) {
  getStats().then(stats => {
    console.log('📊 Investor Stats:');
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  });
} else if (args.includes('--once')) {
  processBatch().then(result => {
    console.log('Result:', result);
    process.exit(0);
  });
} else {
  // Start the service
  runContinuously().catch(console.error);
}
