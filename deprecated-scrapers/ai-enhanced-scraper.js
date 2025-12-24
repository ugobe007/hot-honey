#!/usr/bin/env node
/**
 * AI-ENHANCED SCRAPER
 * ====================
 * OPTION 1: Auto-enrichment with OpenAI GPT-4
 * OPTION 2: Vector embeddings for semantic matching
 * 
 * Features:
 * 1. Scrapes startups from RSS feeds
 * 2. Enriches data with OpenAI (team, traction, market analysis)
 * 3. Calculates GOD score from enriched data
 * 4. Generates embeddings for semantic matching
 * 5. Stores everything in Supabase
 * 
 * Run: node ai-enhanced-scraper.js
 * Run with limit: node ai-enhanced-scraper.js --limit 10
 */

import { createClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!OPENAI_KEY) {
  console.error('❌ Missing OPENAI_API_KEY - enrichment disabled');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const parser = new Parser({ timeout: 20000 });
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// Parse command line args
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const SCRAPE_LIMIT = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 20;
const SKIP_ENRICHMENT = args.includes('--skip-enrich');
const SKIP_EMBEDDINGS = args.includes('--skip-embed');

// ============================================
// RSS FEEDS
// ============================================

const STARTUP_FEEDS = [
  { name: 'Crunchbase', url: 'https://news.crunchbase.com/feed/' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
  { name: 'EU-Startups', url: 'https://www.eu-startups.com/feed/' },
  { name: 'Tech.eu', url: 'https://tech.eu/feed/' },
  { name: 'SaaStr', url: 'https://www.saastr.com/feed/' },
  { name: 'TechCrunch Venture', url: 'https://techcrunch.com/category/venture/feed/' }
];

// ============================================
// SECTOR CLASSIFICATION
// ============================================

const SECTOR_MAP = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'neural', 'deep learning', 'generative'],
  'Fintech': ['fintech', 'payments', 'banking', 'financial', 'insurtech', 'crypto', 'defi', 'neobank'],
  'Healthcare': ['health', 'medical', 'biotech', 'pharma', 'telehealth', 'medtech', 'digital health'],
  'Climate': ['climate', 'cleantech', 'sustainability', 'renewable', 'energy', 'carbon', 'green'],
  'Enterprise SaaS': ['b2b', 'saas', 'enterprise', 'workflow', 'productivity', 'automation'],
  'Consumer': ['consumer', 'dtc', 'e-commerce', 'retail', 'marketplace'],
  'Cybersecurity': ['cybersecurity', 'security', 'infosec', 'privacy', 'zero trust'],
  'DevTools': ['developer', 'devtools', 'api', 'infrastructure', 'devops', 'platform']
};

function classifySectors(text) {
  const lower = (text || '').toLowerCase();
  const matched = new Set();
  
  for (const [sector, keywords] of Object.entries(SECTOR_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matched.add(sector);
    }
  }
  
  return matched.size > 0 ? Array.from(matched) : ['General'];
}

function detectStage(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('series c') || lower.includes('series d') || lower.includes('growth')) return 'Series C+';
  if (lower.includes('series b')) return 'Series B';
  if (lower.includes('series a')) return 'Series A';
  if (lower.includes('seed') || lower.includes('pre-seed')) return 'Seed';
  if (lower.includes('angel') || lower.includes('pre-seed')) return 'Pre-Seed';
  return 'Seed';
}

// ============================================
// OPTION 1: AI ENRICHMENT
// ============================================

/**
 * Use OpenAI to extract rich startup data for better GOD scoring
 */
async function enrichWithAI(name, description) {
  if (!openai || SKIP_ENRICHMENT) {
    return null;
  }

  try {
    const prompt = `Analyze this startup and extract structured data for VC evaluation.

Startup: ${name}
Description: ${description}

Return a JSON object with:
{
  "tagline": "one-line value prop (max 100 chars)",
  "problem": "what problem they solve",
  "solution": "their unique solution",
  "market_size": "TAM estimate if mentioned (e.g., '$50B')",
  "traction": {
    "revenue": "ARR/MRR if mentioned or 'unknown'",
    "users": "user count if mentioned or 'unknown'",
    "growth": "growth rate if mentioned or 'unknown'",
    "customers": "notable customers if mentioned"
  },
  "team": {
    "founders_count": number or 1,
    "technical_cofounders": number or 0,
    "notable_background": ["list of notable companies/schools"]
  },
  "competitive_advantage": "what makes them unique",
  "stage_indicators": ["list of stage signals like 'has revenue', 'enterprise customers', etc."],
  "risk_factors": ["potential concerns"],
  "sectors": ["primary sectors"],
  "god_score_estimate": number 50-100 based on: team (30%), traction (30%), market (20%), product (20%)
}

Be concise. If data is unavailable, make reasonable estimates based on the description.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`   ⚠️  Enrichment failed for ${name}:`, error.message);
  }
  return null;
}

// ============================================
// OPTION 2: VECTOR EMBEDDINGS
// ============================================

/**
 * Generate embedding vector for semantic matching
 */
async function generateEmbedding(text) {
  if (!openai || SKIP_EMBEDDINGS) {
    return null;
  }

  try {
    // Truncate to avoid token limits
    const truncated = text.substring(0, 8000);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated,
      dimensions: 1536 // Standard dimension for pgvector
    });

    return response.data[0]?.embedding;
  } catch (error) {
    console.error(`   ⚠️  Embedding failed:`, error.message);
    return null;
  }
}

/**
 * Create a rich text representation for embedding
 */
function createEmbeddingText(startup) {
  const parts = [
    startup.name,
    startup.tagline || '',
    startup.description || '',
    startup.problem || '',
    startup.solution || '',
    `Sectors: ${(startup.sectors || []).join(', ')}`,
    `Stage: ${startup.stage || 'Seed'}`,
    startup.competitive_advantage || ''
  ];
  return parts.filter(p => p).join('. ');
}

// ============================================
// GOD SCORE CALCULATION
// ============================================

/**
 * Calculate GOD score from enriched data
 */
function calculateGodScore(enrichedData) {
  if (!enrichedData) return 50; // Default

  let score = 50; // Base

  // Team (30 points max)
  const team = enrichedData.team || {};
  if (team.founders_count >= 2) score += 10;
  if (team.technical_cofounders >= 1) score += 10;
  if (team.notable_background?.length > 0) score += 10;

  // Traction (30 points max)
  const traction = enrichedData.traction || {};
  if (traction.revenue && traction.revenue !== 'unknown') score += 10;
  if (traction.users && traction.users !== 'unknown') score += 10;
  if (traction.customers && traction.customers !== 'unknown') score += 10;

  // Market (20 points max)
  if (enrichedData.market_size && enrichedData.market_size !== 'unknown') score += 10;
  if (enrichedData.problem && enrichedData.problem.length > 20) score += 10;

  // Product (20 points max - covered by competitive advantage)
  if (enrichedData.competitive_advantage && enrichedData.competitive_advantage.length > 20) score += 10;
  if (enrichedData.solution && enrichedData.solution.length > 20) score += 10;

  // Use AI estimate if available, weighted average
  if (enrichedData.god_score_estimate) {
    score = Math.round((score + enrichedData.god_score_estimate) / 2);
  }

  return Math.min(Math.max(score, 30), 99); // Clamp 30-99
}

// ============================================
// SCRAPING & STORAGE
// ============================================

async function scrapeFeeds() {
  const allItems = [];
  
  for (const feed of STARTUP_FEEDS) {
    try {
      console.log(`📡 Fetching ${feed.name}...`);
      const parsed = await parser.parseURL(feed.url);
      
      for (const item of parsed.items.slice(0, 10)) {
        allItems.push({
          name: extractStartupName(item.title),
          description: (item.contentSnippet || item.content || '').substring(0, 2000),
          source: feed.name,
          link: item.link
        });
      }
    } catch (error) {
      console.error(`   ❌ ${feed.name} failed:`, error.message);
    }
  }
  
  return allItems;
}

function extractStartupName(title) {
  // Try to extract company name from news headline
  const patterns = [
    /^([A-Z][a-zA-Z0-9]+)\s+(?:raises|secures|closes|announces)/i,
    /^([A-Z][a-zA-Z0-9]+),?\s+(?:a|an|the)/i,
    /startup\s+([A-Z][a-zA-Z0-9]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }
  
  // Fallback: first 3 words
  return title.split(' ').slice(0, 3).join(' ').substring(0, 50);
}

async function checkExists(name) {
  const { data } = await supabase
    .from('startup_uploads')
    .select('id')
    .ilike('name', name)
    .limit(1);
  return data && data.length > 0;
}

async function saveStartup(startup, enrichedData, embedding) {
  const sectors = enrichedData?.sectors || classifySectors(startup.description);
  const godScore = calculateGodScore(enrichedData);
  
  // Build extracted_data JSON
  const extractedData = {
    ...(enrichedData || {}),
    source_url: startup.link,
    scraped_at: new Date().toISOString()
  };

  // Use raw SQL to bypass PostgREST cache issues
  const query = `
    INSERT INTO startup_uploads (
      name, tagline, pitch, description, sectors, stage, 
      total_god_score, team_score, traction_score, market_score, product_score,
      source_type, status, extracted_data
      ${embedding ? ', embedding' : ''}
    ) VALUES (
      $1, $2, $3, $4, $5::text[], $6,
      $7, $8, $9, $10, $11,
      'ai_scraped', 'approved', $12::jsonb
      ${embedding ? ', $13::vector' : ''}
    )
    ON CONFLICT (name) DO UPDATE SET
      total_god_score = GREATEST(startup_uploads.total_god_score, EXCLUDED.total_god_score),
      extracted_data = EXCLUDED.extracted_data,
      updated_at = NOW()
      ${embedding ? ', embedding = EXCLUDED.embedding' : ''}
    RETURNING id, name, total_god_score
  `;

  const params = [
    startup.name,
    enrichedData?.tagline || startup.description?.substring(0, 100) || '',
    enrichedData?.solution || startup.description?.substring(0, 500) || '',
    startup.description || '',
    sectors,
    detectStage(startup.description),
    godScore,
    enrichedData?.team ? 70 : 50,
    enrichedData?.traction?.revenue !== 'unknown' ? 70 : 50,
    enrichedData?.market_size !== 'unknown' ? 70 : 50,
    enrichedData?.competitive_advantage ? 70 : 50,
    JSON.stringify(extractedData)
  ];

  if (embedding) {
    params.push(`[${embedding.join(',')}]`);
  }

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: query,
      query_params: params
    });
    
    if (error) {
      // Fallback to direct insert without embedding
      const { data: insertData, error: insertError } = await supabase
        .from('startup_uploads')
        .upsert({
          name: startup.name,
          tagline: enrichedData?.tagline || startup.description?.substring(0, 100) || '',
          pitch: enrichedData?.solution || startup.description?.substring(0, 500) || '',
          description: startup.description || '',
          sectors: sectors,
          stage: detectStage(startup.description),
          total_god_score: godScore,
          source_type: 'ai_scraped',
          status: 'approved',
          extracted_data: extractedData
        }, { onConflict: 'name' })
        .select('id, name, total_god_score');
      
      if (insertError) {
        console.error(`   ❌ Save failed:`, insertError.message);
        return null;
      }
      return insertData?.[0];
    }
    return data?.[0];
  } catch (err) {
    console.error(`   ❌ Save error:`, err.message);
    return null;
  }
}

// ============================================
// MAIN PROCESS
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🤖 AI-ENHANCED SCRAPER                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Limit: ${SCRAPE_LIMIT} startups`);
  console.log(`  Enrichment: ${SKIP_ENRICHMENT ? '❌ Disabled' : '✅ Enabled'}`);
  console.log(`  Embeddings: ${SKIP_EMBEDDINGS ? '❌ Disabled' : '✅ Enabled'}`);
  console.log('');

  // Step 1: Scrape RSS feeds
  console.log('📡 STEP 1: Scraping RSS feeds...\n');
  const items = await scrapeFeeds();
  console.log(`   Found ${items.length} items\n`);

  // Step 2: Process each startup
  console.log('🤖 STEP 2: Processing startups with AI...\n');
  
  let processed = 0;
  let enriched = 0;
  let embedded = 0;
  let skipped = 0;

  for (const item of items) {
    if (processed >= SCRAPE_LIMIT) break;
    
    // Skip if exists
    if (await checkExists(item.name)) {
      skipped++;
      continue;
    }

    console.log(`\n   [${processed + 1}/${SCRAPE_LIMIT}] ${item.name}`);
    
    // Option 1: Enrich with AI
    let enrichedData = null;
    if (!SKIP_ENRICHMENT && openai) {
      process.stdout.write('      🧠 Enriching with AI...');
      enrichedData = await enrichWithAI(item.name, item.description);
      if (enrichedData) {
        console.log(' ✅');
        enriched++;
      } else {
        console.log(' ⚠️');
      }
    }

    // Option 2: Generate embedding
    let embedding = null;
    if (!SKIP_EMBEDDINGS && openai) {
      process.stdout.write('      📊 Generating embedding...');
      const embeddingText = createEmbeddingText({
        ...item,
        ...(enrichedData || {}),
        sectors: enrichedData?.sectors || classifySectors(item.description)
      });
      embedding = await generateEmbedding(embeddingText);
      if (embedding) {
        console.log(' ✅');
        embedded++;
      } else {
        console.log(' ⚠️');
      }
    }

    // Save to database
    process.stdout.write('      💾 Saving...');
    const saved = await saveStartup(item, enrichedData, embedding);
    if (saved) {
      console.log(` ✅ (GOD Score: ${saved.total_god_score})`);
    } else {
      console.log(' ❌');
    }

    processed++;
    
    // Rate limiting
    if (processed % 5 === 0) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          📊 SUMMARY                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`   Processed:  ${processed}`);
  console.log(`   Enriched:   ${enriched}`);
  console.log(`   Embedded:   ${embedded}`);
  console.log(`   Skipped:    ${skipped} (already exist)`);
  console.log('');
}

main().catch(console.error);
