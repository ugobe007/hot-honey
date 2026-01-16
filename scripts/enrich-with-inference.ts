#!/usr/bin/env node
/**
 * PYTH INFERENCE ENGINE ENRICHMENT
 * ==================================
 * 
 * Uses the LOCAL inference-extractor (NO AI API CALLS) as the primary method.
 * Falls back to AI enrichment only when needed for Tier A scoring.
 * 
 * This is the CORRECT approach per the project architecture - the inference
 * engine is pure pattern matching against the 5 GOD Score questions.
 * 
 * Usage:
 *   npx tsx scripts/enrich-with-inference.ts [--limit 20] [--ai]
 * 
 * Flags:
 *   --limit N    Process N startups (default: 20)
 *   --ai         Enable AI fallback for richer extraction (uses Anthropic)
 */

import 'dotenv/config';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore - JS module
import { extractInferenceData } from '../lib/inference-extractor.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sector weights for scoring
const SECTOR_WEIGHTS: Record<string, number> = {
  'AI/ML': 15, 'FinTech': 12, 'HealthTech': 12, 'CleanTech': 10, 'DevTools': 10,
  'SaaS': 8, 'Cybersecurity': 8, 'E-Commerce': 6, 'LegalTech': 6, 'Gaming': 5,
};

/**
 * Fetch website content
 */
async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    console.log(`   🌐 Fetching ${fullUrl}...`);

    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    // Strip HTML tags to get text
    const text = response.data
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.substring(0, 15000);
  } catch (error: any) {
    console.error(`   ❌ Fetch failed: ${error.message}`);
    return null;
  }
}

/**
 * Calculate GOD score from inference data
 */
function calculateGodScore(inference: any): {
  total_god_score: number;
  vision_score: number;
  market_score: number;
  traction_score: number;
  team_score: number;
  product_score: number;
  data_tier: 'A' | 'B' | 'C';
} {
  // Determine data tier based on what the inference engine found
  const hasRichData = !!(
    inference.funding_amount ||
    inference.customer_count ||
    inference.has_revenue ||
    (inference.execution_signals?.length >= 3)
  );
  
  const hasSomeData = !!(
    inference.sectors?.length > 0 ||
    inference.team_signals?.length > 0 ||
    inference.is_launched ||
    inference.has_customers
  );

  const tier = hasRichData ? 'A' : (hasSomeData ? 'B' : 'C');

  if (tier === 'A') {
    // Full Tier A scoring (up to 100)
    let vision = 0, market = 0, traction = 0, team = 0, product = 0;

    // Vision (content quality)
    if (inference.problem_keywords?.length > 0) vision += 10;
    if (inference.problem_severity_estimate >= 7) vision += 10;
    vision += 5; // Base for having data
    vision = Math.min(25, vision);

    // Market (sector hotness)
    if (inference.sectors?.length > 0) {
      for (const sector of inference.sectors) {
        market = Math.max(market, SECTOR_WEIGHTS[sector] || 5);
      }
      market += 5;
    }
    market = Math.min(25, market);

    // Traction (execution signals)
    if (inference.has_revenue) traction += 15;
    if (inference.has_customers) traction += 8;
    if (inference.customer_count && inference.customer_count > 10) traction += 5;
    if (inference.growth_rate) traction += 5;
    if (inference.funding_amount) {
      const amt = parseFloat(String(inference.funding_amount));
      if (amt >= 10000000) traction += 10;
      else if (amt >= 1000000) traction += 5;
    }
    traction = Math.min(25, traction);

    // Team (credentials + GRIT)
    if (inference.has_technical_cofounder) team += 10;
    if (inference.credential_signals?.length > 0) {
      team += Math.min(10, inference.credential_signals.length * 3);
    }
    if (inference.grit_signals?.length > 0) {
      team += Math.min(5, inference.grit_signals.length * 2);
    }
    team = Math.min(25, team);

    // Product
    if (inference.is_launched) product += 15;
    if (inference.has_demo) product += 5;
    product = Math.min(20, product);

    // Total with quality bonus
    let total = vision + market + traction + team + product;
    if (tier === 'A' && total >= 60) total += 5; // Quality bonus
    total = Math.min(100, total);

    return { total_god_score: total, vision_score: vision, market_score: market, traction_score: traction, team_score: team, product_score: product, data_tier: 'A' };

  } else if (tier === 'B') {
    // Tier B scoring (capped at 55)
    let base = 40;
    
    // Sector bonus
    if (inference.sectors?.length > 0) {
      for (const sector of inference.sectors) {
        base = Math.max(base, 40 + (SECTOR_WEIGHTS[sector] || 0) / 2);
      }
    }

    // Execution signals
    if (inference.is_launched) base += 4;
    if (inference.has_demo) base += 2;
    if (inference.has_customers) base += 3;
    if (inference.has_technical_cofounder) base += 2;
    if (inference.team_signals?.length > 0) base += 2;

    const total = Math.min(55, Math.round(base));

    return {
      total_god_score: total,
      vision_score: 12,
      market_score: Math.min(20, (SECTOR_WEIGHTS[inference.sectors?.[0]] || 5)),
      traction_score: inference.is_launched ? 15 : 8,
      team_score: inference.has_technical_cofounder ? 15 : 8,
      product_score: (inference.is_launched ? 10 : 5) + (inference.has_demo ? 5 : 0),
      data_tier: 'B',
    };

  } else {
    // Tier C (capped at 40)
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
  const useAI = args.includes('--ai');

  console.log('═'.repeat(70));
  console.log('    🔥 PYTH INFERENCE ENGINE ENRICHMENT');
  console.log('═'.repeat(70));
  console.log(`\n📊 Configuration:`);
  console.log(`   Limit: ${limit}`);
  console.log(`   Method: Inference Engine (pattern matching, NO AI)`);
  console.log(`   AI Fallback: ${useAI ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('');

  // Find startups with placeholder GOD scores
  console.log('🔍 Finding startups to enrich...\n');

  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, total_god_score, description, tagline, extracted_data')
    .or('total_god_score.eq.60,total_god_score.lte.55')
    .not('website', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching startups:', error);
    process.exit(1);
  }

  if (!startups || startups.length === 0) {
    console.log('✅ No startups need enrichment!\n');
    return;
  }

  console.log(`📋 Found ${startups.length} startups to enrich:\n`);

  let enriched = 0;
  let failed = 0;
  const results: { name: string; before: number; after: number; tier: string; signals: string[] }[] = [];

  for (const startup of startups) {
    if (!startup.website) continue;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`📊 ${startup.name} (${startup.website})`);
    console.log(`   Current GOD Score: ${startup.total_god_score}`);

    // Fetch website content
    const content = await fetchWebsiteContent(startup.website);
    
    if (!content || content.length < 100) {
      console.log(`   ⚠️  Could not fetch content`);
      failed++;
      continue;
    }

    // Combine all text for inference
    const fullText = [
      startup.name || '',
      startup.tagline || '',
      startup.description || '',
      content
    ].join(' ');

    // Run inference engine (NO AI!)
    console.log(`   🧠 Running inference engine...`);
    const inference: any = extractInferenceData(fullText, startup.website);

    if (!inference) {
      console.log(`   ⚠️  Inference extraction failed`);
      failed++;
      continue;
    }

    // Log what we found
    const signalsFound: string[] = [];
    if (inference.sectors?.length) signalsFound.push(`Sectors: ${inference.sectors.join(', ')}`);
    if (inference.is_launched) signalsFound.push('Launched');
    if (inference.has_demo) signalsFound.push('Demo');
    if (inference.has_customers) signalsFound.push('Customers');
    if (inference.has_revenue) signalsFound.push('Revenue');
    if (inference.has_technical_cofounder) signalsFound.push('Tech Cofounder');
    if (inference.funding_amount) signalsFound.push(`Funding: $${(inference.funding_amount / 1000000).toFixed(1)}M`);
    if (inference.credential_signals?.length) signalsFound.push(`Credentials: ${inference.credential_signals.join(', ')}`);
    if (inference.grit_signals?.length) signalsFound.push(`GRIT: ${inference.grit_signals.map((g: any) => g.signal || g).join(', ')}`);

    console.log(`   📈 Signals Found: ${signalsFound.length > 0 ? signalsFound.join(' | ') : 'minimal'}`);

    // Calculate GOD score
    const scores = calculateGodScore(inference);
    console.log(`   🎯 GOD Score: ${startup.total_god_score} → ${scores.total_god_score} (Tier ${scores.data_tier})`);

    // Update database
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({
        sectors: inference.sectors || startup.extracted_data?.sectors || ['Technology'],
        is_launched: inference.is_launched || false,
        has_demo: inference.has_demo || false,
        has_technical_cofounder: inference.has_technical_cofounder || false,
        total_god_score: scores.total_god_score,
        vision_score: scores.vision_score,
        market_score: scores.market_score,
        traction_score: scores.traction_score,
        team_score: scores.team_score,
        product_score: scores.product_score,
        extracted_data: {
          ...(startup.extracted_data || {}),
          ...inference,
          data_tier: scores.data_tier,
          inference_method: 'pyth_inference_engine',
          enriched_at: new Date().toISOString(),
        },
      })
      .eq('id', startup.id);

    if (updateError) {
      console.error(`   ❌ Update failed:`, updateError.message);
      failed++;
    } else {
      enriched++;
      results.push({
        name: startup.name || 'Unknown',
        before: startup.total_god_score || 60,
        after: scores.total_god_score,
        tier: scores.data_tier,
        signals: signalsFound,
      });
      console.log(`   ✅ Updated!`);
    }

    // Small delay
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
    console.log('   ' + '─'.repeat(60));
    for (const r of results) {
      const change = r.after - r.before;
      const changeStr = change >= 0 ? `+${change}` : `${change}`;
      console.log(`   ${r.name.padEnd(20)} | ${r.before} → ${r.after} (${changeStr}) [Tier ${r.tier}]`);
    }
    console.log('');

    // Tier distribution
    const tiers = results.reduce((acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Data Tier Distribution:');
    console.log(`      Tier A (rich data, up to 100): ${tiers['A'] || 0}`);
    console.log(`      Tier B (some data, up to 55):  ${tiers['B'] || 0}`);
    console.log(`      Tier C (sparse, up to 40):     ${tiers['C'] || 0}`);
  }

  console.log('\n✅ Enrichment complete using PYTH INFERENCE ENGINE (no AI API calls)');
  console.log('   To get Tier A scoring, add more data: traction, funding, team credentials\n');
}

main().catch(console.error);
