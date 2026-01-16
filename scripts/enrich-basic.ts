#!/usr/bin/env node
/**
 * BASIC URL SCRAPER - NO AI REQUIRED
 * ====================================
 * 
 * Scrapes startup websites and extracts basic data using HTML parsing.
 * Uses Tier B/C scoring (capped at 55) since we don't have AI enrichment.
 * 
 * This works without an OpenAI API key by extracting:
 * - Meta tags (title, description, og:tags)
 * - Visible text patterns (launched, demo, pricing keywords)
 * - Sector inference from domain/content
 * 
 * Usage:
 *   npx tsx scripts/enrich-basic.ts [--limit 20]
 */

import 'dotenv/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sector detection patterns
const SECTOR_PATTERNS: Record<string, string[]> = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'neural', 'deep learning'],
  'Fintech': ['fintech', 'payment', 'banking', 'finance', 'money', 'invoice', 'billing', 'financial'],
  'Healthtech': ['health', 'medical', 'healthcare', 'patient', 'clinical', 'biotech', 'pharma'],
  'DevTools': ['developer', 'devops', 'code', 'api', 'sdk', 'github', 'git', 'deploy', 'infrastructure'],
  'B2B SaaS': ['enterprise', 'b2b', 'saas', 'platform', 'workflow', 'automation', 'business'],
  'E-commerce': ['ecommerce', 'shop', 'store', 'marketplace', 'retail', 'commerce', 'cart'],
  'Legal': ['legal', 'law', 'contract', 'compliance', 'attorney', 'lawyer'],
  'Security': ['security', 'cyber', 'protect', 'secure', 'encryption', 'privacy'],
  'Climate': ['climate', 'sustainable', 'green', 'carbon', 'energy', 'solar', 'renewable'],
  'Consumer': ['consumer', 'social', 'community', 'user', 'personal'],
};

// Sector weights for scoring
const SECTOR_WEIGHTS: Record<string, number> = {
  'AI/ML': 15, 'Fintech': 12, 'Healthtech': 12, 'Climate': 10, 'DevTools': 10,
  'B2B SaaS': 8, 'Security': 8, 'E-commerce': 6, 'Legal': 6, 'Consumer': 5,
};

interface ScrapedData {
  name: string;
  tagline?: string;
  description?: string;
  sectors: string[];
  is_launched: boolean;
  has_demo: boolean;
  has_pricing: boolean;
  has_enterprise: boolean;
}

/**
 * Scrape website and extract basic data without AI
 */
async function scrapeBasicData(url: string): Promise<ScrapedData | null> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    console.log(`🌐 Fetching ${fullUrl}...`);

    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const html = response.data.toLowerCase();
    
    // Extract domain name
    const domain = new URL(fullUrl).hostname.replace('www.', '');
    const companyName = domain.split('.')[0];
    const name = companyName.charAt(0).toUpperCase() + companyName.slice(1);

    // Extract meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    const tagline = titleMatch?.[1]?.split('|')[0]?.split('-')[0]?.trim() || undefined;
    const description = descMatch?.[1] || ogDescMatch?.[1] || undefined;

    // Detect sectors from content
    const sectors: string[] = [];
    const contentLower = html.substring(0, 50000); // Limit content to check
    
    for (const [sector, patterns] of Object.entries(SECTOR_PATTERNS)) {
      if (patterns.some(p => contentLower.includes(p))) {
        sectors.push(sector);
        if (sectors.length >= 3) break; // Max 3 sectors
      }
    }
    if (sectors.length === 0) sectors.push('Technology');

    // Detect product signals
    const is_launched = (
      contentLower.includes('sign up') ||
      contentLower.includes('get started') ||
      contentLower.includes('try now') ||
      contentLower.includes('start free') ||
      contentLower.includes('create account') ||
      contentLower.includes('log in') ||
      contentLower.includes('login')
    );

    const has_demo = (
      contentLower.includes('demo') ||
      contentLower.includes('book a call') ||
      contentLower.includes('schedule a') ||
      contentLower.includes('request access') ||
      contentLower.includes('try it')
    );

    const has_pricing = (
      contentLower.includes('pricing') ||
      contentLower.includes('/pricing') ||
      contentLower.includes('$/mo') ||
      contentLower.includes('per month') ||
      contentLower.includes('enterprise') && contentLower.includes('plan')
    );

    const has_enterprise = (
      contentLower.includes('enterprise') ||
      contentLower.includes('team plan') ||
      contentLower.includes('business plan') ||
      contentLower.includes('company plan')
    );

    console.log(`   ✅ Scraped: ${name} | Sectors: ${sectors.join(', ')} | Launched: ${is_launched}`);

    return {
      name,
      tagline,
      description,
      sectors,
      is_launched,
      has_demo,
      has_pricing,
      has_enterprise,
    };
  } catch (error: any) {
    console.error(`   ❌ Failed to scrape: ${error.message}`);
    return null;
  }
}

/**
 * Calculate GOD score from basic scraped data (Tier B scoring, capped at 55)
 */
function calculateBasicScore(data: ScrapedData): {
  total_god_score: number;
  vision_score: number;
  market_score: number;
  traction_score: number;
  team_score: number;
  product_score: number;
  data_tier: 'B' | 'C';
} {
  // Determine tier - B if we have some data, C if very sparse
  const hasSomeData = !!(data.description || data.tagline);
  const tier = hasSomeData ? 'B' : 'C';

  if (tier === 'B') {
    // Tier B scoring (capped at 55)
    let base = 40;

    // Sector bonus (half of full bonus)
    let sectorBonus = 0;
    for (const sector of data.sectors) {
      sectorBonus = Math.max(sectorBonus, SECTOR_WEIGHTS[sector] || 5);
    }
    base += Math.round(sectorBonus / 2);

    // Content bonus
    if (data.tagline) base += 3;
    if (data.description) base += 2;

    // Product signals bonus
    if (data.is_launched) base += 4;
    if (data.has_demo) base += 2;
    if (data.has_pricing) base += 3;
    if (data.has_enterprise) base += 1;

    const total = Math.min(55, base);

    return {
      total_god_score: total,
      vision_score: data.tagline ? 15 : 10,
      market_score: Math.min(20, sectorBonus),
      traction_score: data.is_launched ? 15 : 8,
      team_score: 10, // Unknown
      product_score: (data.is_launched ? 10 : 5) + (data.has_demo ? 5 : 0) + (data.has_pricing ? 5 : 0),
      data_tier: 'B',
    };
  } else {
    // Tier C: Very sparse data (capped at 40)
    return {
      total_god_score: 40,
      vision_score: 10,
      market_score: 10,
      traction_score: 8,
      team_score: 8,
      product_score: 8,
      data_tier: 'C',
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 20;

  console.log('═'.repeat(70));
  console.log('    🔥 BASIC URL ENRICHMENT (No AI Required)');
  console.log('═'.repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   Limit: ${limit}`);
  console.log(`   Scoring: Tier B (capped at 55) - no AI enrichment`);
  console.log('');

  // Find startups with placeholder GOD score (60)
  console.log('🔍 Finding startups with placeholder GOD scores (60)...\n');

  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, total_god_score, created_at')
    .eq('total_god_score', 60)
    .not('website', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching startups:', error);
    process.exit(1);
  }

  if (!startups || startups.length === 0) {
    console.log('✅ No startups with placeholder scores found!\n');
    return;
  }

  console.log(`📋 Found ${startups.length} startups to enrich:\n`);
  for (const s of startups) {
    console.log(`   • ${s.name} (${s.website})`);
  }
  console.log('');

  let enriched = 0;
  let failed = 0;
  const results: { name: string; before: number; after: number; tier: string }[] = [];

  for (const startup of startups) {
    if (!startup.website) continue;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📊 Processing: ${startup.name}`);

    const scraped = await scrapeBasicData(startup.website);
    
    if (!scraped) {
      failed++;
      continue;
    }

    const scores = calculateBasicScore(scraped);

    console.log(`   📈 GOD Score: ${startup.total_god_score} → ${scores.total_god_score} (Tier ${scores.data_tier})`);

    // Update database
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({
        name: scraped.name,
        tagline: scraped.tagline || startup.name,
        description: scraped.description,
        sectors: scraped.sectors,
        is_launched: scraped.is_launched,
        has_demo: scraped.has_demo,
        total_god_score: scores.total_god_score,
        vision_score: scores.vision_score,
        market_score: scores.market_score,
        traction_score: scores.traction_score,
        team_score: scores.team_score,
        product_score: scores.product_score,
        extracted_data: {
          ...scraped,
          data_tier: scores.data_tier,
          scraped_at: new Date().toISOString(),
          scrape_method: 'basic_html',
        },
      })
      .eq('id', startup.id);

    if (updateError) {
      console.error(`   ❌ Update failed:`, updateError);
      failed++;
    } else {
      enriched++;
      results.push({
        name: scraped.name,
        before: startup.total_god_score || 60,
        after: scores.total_god_score,
        tier: scores.data_tier,
      });
      console.log(`   ✅ Updated!`);
    }

    // Small delay to be nice to servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('    📊 ENRICHMENT SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n   ✅ Enriched: ${enriched}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${startups.length}\n`);

  if (results.length > 0) {
    console.log('   Score Changes:');
    console.log('   ' + '─'.repeat(45));
    for (const r of results) {
      const change = r.after - r.before;
      const changeStr = change >= 0 ? `+${change}` : `${change}`;
      console.log(`   ${r.name.padEnd(20)} | ${r.before} → ${r.after} (${changeStr}) [Tier ${r.tier}]`);
    }
  }

  console.log('\n⚠️  Note: Scores capped at 55 (Tier B) without AI enrichment.');
  console.log('   To get full scoring (up to 100), set OPENAI_API_KEY and run:');
  console.log('   npx tsx scripts/enrich-pending-urls.ts\n');
}

main().catch(console.error);
