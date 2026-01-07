#!/usr/bin/env node
/**
 * DETECT STARTUP EXITS
 * 
 * Scans news articles and startup data to detect:
 * - Acquisitions
 * - Mergers
 * - IPOs
 * 
 * Distinguishes between actual exits and:
 * - Investment rounds (e.g., "Facebook invests $50M in Startup")
 * - Partnerships (e.g., "Stripe partners with Fintech")
 * - Strategic investments (up-rounds)
 * 
 * Run: node detect-startup-exits.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Keywords that indicate EXIT (acquisition/merger/IPO)
const EXIT_KEYWORDS = {
  acquisition: [
    'acquired', 'acquisition', 'bought', 'purchased', 'takes over', 'takes control',
    'buys', 'snaps up', 'scoops up', 'picks up', 'grabs', 'takes ownership',
    'merges into', 'becomes part of', 'joins forces with', 'combines with'
  ],
  merger: [
    'merger', 'merges', 'merging', 'combines', 'consolidates', 'unites',
    'joins forces', 'merger agreement', 'merger deal'
  ],
  ipo: [
    'ipo', 'goes public', 'public offering', 'initial public offering',
    'files for ipo', 'plans ipo', 'ipo filing', 'public debut',
    'lists on', 'trades on', 'stock exchange', 'nyse', 'nasdaq'
  ]
};

// Keywords that indicate INVESTMENT (not exit)
const INVESTMENT_KEYWORDS = [
  'invests', 'investment', 'funding round', 'raises', 'raises funding',
  'series a', 'series b', 'seed round', 'led by', 'backed by',
  'partners with', 'partnership', 'strategic investment', 'equity investment',
  'venture capital', 'vc funding', 'angel investment', 'participates in'
];

// Keywords that indicate PARTNERSHIP (not exit)
const PARTNERSHIP_KEYWORDS = [
  'partners with', 'partnership', 'teams up with', 'collaborates with',
  'integrates with', 'works with', 'alliance with', 'strategic partnership'
];

// Extract numeric value from text (e.g., "$1.2B" -> 1200000000)
function extractNumericValue(text) {
  if (!text) return null;
  
  const match = text.match(/[\d.]+/);
  if (!match) return null;
  
  const num = parseFloat(match[0]);
  if (text.includes('B') || text.includes('billion')) return num * 1000000000;
  if (text.includes('M') || text.includes('million')) return num * 1000000;
  if (text.includes('K') || text.includes('thousand')) return num * 1000;
  
  return num;
}

// Determine if text describes an exit or investment
function classifyTransaction(text) {
  if (!text) return { type: 'unknown', confidence: 0 };
  
  const textLower = text.toLowerCase();
  
  // Check for investment keywords first (these override exit keywords)
  for (const keyword of INVESTMENT_KEYWORDS) {
    if (textLower.includes(keyword)) {
      return { type: 'investment', confidence: 0.8 };
    }
  }
  
  // Check for partnership keywords
  for (const keyword of PARTNERSHIP_KEYWORDS) {
    if (textLower.includes(keyword) && !textLower.includes('acquired')) {
      return { type: 'partnership', confidence: 0.7 };
    }
  }
  
  // Check for exit keywords
  let maxConfidence = 0;
  let exitType = null;
  
  for (const [type, keywords] of Object.entries(EXIT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        const confidence = textLower.includes(keyword + ' by') || textLower.includes(keyword + ' for') ? 0.9 : 0.7;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          exitType = type;
        }
      }
    }
  }
  
  if (exitType) {
    return { type: exitType, confidence: maxConfidence };
  }
  
  return { type: 'unknown', confidence: 0 };
}

// Extract exit details using AI
async function extractExitDetailsWithAI(companyName, articleText) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const prompt = `Analyze this article about ${companyName} and determine if it describes an EXIT (acquisition, merger, or IPO) or an INVESTMENT/PARTNERSHIP.

IMPORTANT: Distinguish between:
- EXIT: Company was acquired, merged, or went public
- INVESTMENT: Company received funding (e.g., "Facebook invests $50M")
- PARTNERSHIP: Strategic partnership (e.g., "Stripe partners with Fintech")

Article: ${articleText.substring(0, 2000)}

Return JSON only:
{
  "is_exit": true/false,
  "exit_type": "acquisition" | "merger" | "ipo" | null,
  "exit_value": "$1.2B" or null,
  "acquirer_name": "Company Name" or null,
  "exit_date": "YYYY-MM-DD" or null,
  "transaction_structure": "cash" | "stock" | "cash_and_stock" | null,
  "key_factors": ["factor1", "factor2"],
  "notes": "What made this startup attractive"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const result = message.content[0]?.text?.trim() || '';
    let jsonStr = result;
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonStr);
    return parsed;

  } catch (error) {
    console.error(`   ⚠️  AI extraction error: ${error.message}`);
    return null;
  }
}

// Find investors for a startup
async function findStartupInvestors(startupId, startupName) {
  try {
    // Check startup_investor_matches
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('investor_id, investor:investors(name)')
      .eq('startup_id', startupId)
      .order('match_score', { ascending: false })
      .limit(20);

    if (matches && matches.length > 0) {
      return matches.map(m => m.investor_id).filter(Boolean);
    }

    // Check discovered_startups for investors_mentioned
    const { data: discovered } = await supabase
      .from('discovered_startups')
      .select('investors_mentioned')
      .ilike('name', startupName)
      .not('investors_mentioned', 'is', null)
      .limit(1)
      .maybeSingle();

    if (discovered && discovered.investors_mentioned) {
      // Try to match investor names to IDs
      const investorNames = Array.isArray(discovered.investors_mentioned) 
        ? discovered.investors_mentioned 
        : [discovered.investors_mentioned];

      const { data: investors } = await supabase
        .from('investors')
        .select('id')
        .in('name', investorNames);

      if (investors) {
        return investors.map(i => i.id);
      }
    }

    return [];
  } catch (error) {
    console.error(`   ⚠️  Error finding investors: ${error.message}`);
    return [];
  }
}

async function detectStartupExits() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🚪 STARTUP EXIT DETECTION                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  // 1. Scan RSS articles for exit mentions
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  SCANNING RSS ARTICLES FOR EXIT MENTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: articles, error: articlesError } = await supabase
    .from('rss_articles')
    .select('id, title, content, url, published_at')
    .order('published_at', { ascending: false })
    .limit(500);

  if (articlesError) {
    console.error(`❌ Error fetching articles: ${articlesError.message}`);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('⚠️  No articles found');
    return;
  }

  console.log(`📊 Scanning ${articles.length} recent articles...\n`);

  const potentialExits = [];

  for (const article of articles) {
    const text = `${article.title} ${article.content || ''}`.toLowerCase();
    
    // Quick check for exit keywords
    let hasExitKeyword = false;
    let exitType = null;
    
    for (const [type, keywords] of Object.entries(EXIT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          hasExitKeyword = true;
          exitType = type;
          break;
        }
      }
      if (hasExitKeyword) break;
    }

    if (hasExitKeyword) {
      // Classify to ensure it's not an investment
      const classification = classifyTransaction(text);
      
      if (classification.type !== 'investment' && classification.type !== 'partnership') {
        potentialExits.push({
          article,
          exitType: classification.type,
          confidence: classification.confidence
        });
      }
    }
  }

  console.log(`📋 Found ${potentialExits.length} potential exit mentions\n`);

  // 2. Process potential exits with AI
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  PROCESSING WITH AI TO EXTRACT DETAILS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let processed = 0;
  let saved = 0;
  let skipped = 0;

  for (const { article, exitType, confidence } of potentialExits) {
    if (confidence < 0.6) {
      skipped++;
      continue;
    }

    try {
      const articleText = `${article.title}\n\n${article.content || ''}`;
      const exitDetails = await extractExitDetailsWithAI('Startup', articleText);

      if (!exitDetails || !exitDetails.is_exit) {
        skipped++;
        continue;
      }

      // Extract company name from AI response or article
      const companyName = exitDetails.startup_name || 'Startup';
      
      // Find matching startup
      const { data: startups } = await supabase
        .from('startup_uploads')
        .select('id, name')
        .eq('status', 'approved')
        .limit(1000);

      // Try to match company name from article or AI response
      let matchedStartup = null;
      
      // First try exact match with AI-extracted name
      if (exitDetails.startup_name) {
        matchedStartup = startups?.find(s => 
          s.name.toLowerCase() === exitDetails.startup_name.toLowerCase()
        );
      }
      
      // Fallback: search in article text
      if (!matchedStartup) {
        for (const startup of startups || []) {
          if (articleText.toLowerCase().includes(startup.name.toLowerCase())) {
            matchedStartup = startup;
            break;
          }
        }
      }

      if (!matchedStartup) {
        // If no match, we can still save with just the name (for manual review)
        console.log(`   ⚠️  No startup match found for exit, saving with name only`);
        // Continue to save with startup_name only
      }

      // Find investors (if startup matched)
      const investorIds = matchedStartup 
        ? await findStartupInvestors(matchedStartup.id, matchedStartup.name)
        : [];

      // Prepare exit data
      const exitValueNumeric = exitDetails.exit_value 
        ? extractNumericValue(exitDetails.exit_value) 
        : null;

      const startupName = matchedStartup ? matchedStartup.name : (exitDetails.startup_name || 'Unknown');

      const exitData = {
        startup_id: matchedStartup?.id || null,
        startup_name: startupName,
        exit_type: exitDetails.exit_type || exitType,
        exit_date: exitDetails.exit_date || article.published_at?.split('T')[0] || null,
        exit_value: exitDetails.exit_value || null,
        exit_value_numeric: exitValueNumeric,
        acquirer_name: exitDetails.acquirer_name || null,
        acquirer_type: exitDetails.acquirer_name ? 'public_company' : null,
        transaction_structure: exitDetails.transaction_structure || null,
        source_url: article.url,
        source_title: article.title,
        source_date: article.published_at,
        investors_involved: investorIds.length > 0 ? investorIds : null,
        key_factors: exitDetails.key_factors || [],
        exit_notes: exitDetails.notes || null,
        verified: false
      };

      // Check if already exists
      const existingQuery = matchedStartup
        ? supabase
            .from('startup_exits')
            .select('id')
            .eq('startup_id', matchedStartup.id)
            .eq('exit_type', exitData.exit_type)
            .eq('exit_date', exitData.exit_date)
        : supabase
            .from('startup_exits')
            .select('id')
            .eq('startup_name', startupName)
            .eq('exit_type', exitData.exit_type)
            .eq('exit_date', exitData.exit_date);
      
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Save exit
      const { error: saveError } = await supabase
        .from('startup_exits')
        .insert(exitData);

      if (saveError) {
        console.error(`   ❌ Error saving exit for ${startupName}: ${saveError.message}`);
      } else {
        console.log(`   ✅ ${startupName} - ${exitData.exit_type} (${exitData.exit_value || 'undisclosed'})`);
        saved++;
      }

      processed++;
      if (processed % 10 === 0) {
        console.log(`   📊 Processed ${processed}/${potentialExits.length}...`);
      }

    } catch (error) {
      console.error(`   ❌ Error processing article: ${error.message}`);
      skipped++;
    }
  }

  // 3. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Saved: ${saved}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📊 Processed: ${processed}`);

  // Check total exits
  const { count: totalExits } = await supabase
    .from('startup_exits')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total exits in database: ${totalExits || 0}`);

  console.log('\n' + '═'.repeat(63));
  console.log('✅ Exit detection complete\n');
}

detectStartupExits().catch(console.error);

