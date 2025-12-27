/**
 * Force Recalculate ALL GOD Scores (No Threshold)
 * 
 * This bypasses the >1 point threshold and forces updates.
 * Use to apply inference enrichment data.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Import scoring service
import { calculateHotScore } from '../server/services/startupScoringService.js';

interface ScoreBreakdown {
  total_god_score: number;
  market_score: number;
  team_score: number;
  traction_score: number;
  product_score: number;
  vision_score: number;
}

/**
 * Convert startup DB row to profile format for scoring service
 * 
 * IMPORTANT: The scoring service uses numeric values (revenue, customers, etc)
 * The inference extractor provides boolean flags (has_revenue, has_customers)
 * We convert booleans to estimated numeric values when no actual numbers exist.
 */
function toScoringProfile(startup: any): any {
  const extracted = startup.extracted_data || {};
  
  // Convert boolean inference signals to numeric estimates if no actual values exist
  let revenue = startup.arr || startup.revenue || extracted.revenue || extracted.arr;
  let customers = startup.customer_count || extracted.customers || extracted.customer_count;
  
  // If we have boolean signals but no numbers, use estimated values
  // "Has Revenue" means they likely have at least $10K+ ARR (score 0.75 in traction)
  if (!revenue && (extracted.has_revenue === true)) {
    revenue = 15000; // Conservative estimate - triggers 0.75 in traction scoring
  }
  
  // "Has Customers" means they likely have at least 3+ customers
  if (!customers && (extracted.has_customers === true)) {
    customers = 5; // Conservative estimate - triggers 0.25 in traction scoring
  }
  
  // Funding amount from inference (if extracted)
  if (!revenue && extracted.funding_amount) {
    // If they raised money, estimate some revenue traction
    // Typically startups have 10-20% of raise as ARR at seed stage
    const fundingEstimate = extracted.funding_amount * 0.1;
    if (fundingEstimate > (revenue || 0)) {
      revenue = fundingEstimate;
    }
  }
  
  return {
    tagline: startup.tagline || extracted.tagline,
    pitch: startup.description || startup.pitch || extracted.pitch || extracted.description,
    problem: startup.problem || extracted.problem,
    solution: startup.solution || extracted.solution,
    market_size: startup.market_size || extracted.market_size,
    industries: startup.industries || startup.sectors || extracted.industries || extracted.sectors || [],
    team: startup.team_companies ? startup.team_companies.map((c: string) => ({
      name: 'Team Member',
      previousCompanies: [c]
    })) : (extracted.team || []),
    founders_count: startup.team_size || extracted.team_size || 1,
    technical_cofounders: (startup.has_technical_cofounder ? 1 : 0) || (extracted.has_technical_cofounder ? 1 : 0),
    mrr: startup.mrr || extracted.mrr,
    revenue: revenue,
    growth_rate: startup.growth_rate_monthly || extracted.growth_rate || extracted.growth_rate_monthly,
    customers: customers,
    active_users: extracted.active_users || extracted.users,
    launched: startup.is_launched || extracted.is_launched || extracted.launched,
    demo_available: startup.has_demo || extracted.has_demo || extracted.demo_available,
    founded_date: startup.founded_date || startup.created_at || extracted.founded_date,
    value_proposition: startup.value_proposition || startup.tagline || extracted.value_proposition,
    // Pass through execution/team signals for potential future scoring use
    execution_signals: extracted.execution_signals || [],
    team_signals: extracted.team_signals || [],
    funding_amount: extracted.funding_amount,
    funding_stage: extracted.funding_stage,
    // Additional data
    gmv: extracted.gmv,
    retention_rate: extracted.retention_rate,
    churn_rate: extracted.churn_rate,
    prepaying_customers: extracted.prepaying_customers || (extracted.has_customers ? 3 : undefined),
    signed_contracts: extracted.signed_contracts,
    unique_ip: extracted.unique_ip,
    defensibility: extracted.defensibility,
    mvp_stage: extracted.mvp_stage,
    backed_by: startup.backed_by || extracted.backed_by || extracted.investors,
    ...startup,
    ...extracted
  };
}

function calculateGODScore(startup: any): ScoreBreakdown {
  const profile = toScoringProfile(startup);
  const result = calculateHotScore(profile);
  
  // Convert from 10-point scale to 100-point scale
  const total = Math.round(result.total * 10);
  
  // Map breakdown to 0-100 scale (same logic as recalculate-scores.ts)
  const teamCombined = (result.breakdown.team_execution || 0) + (result.breakdown.team_age || 0);
  const marketCombined = (result.breakdown.market || 0) + (result.breakdown.market_insight || 0);
  
  return {
    team_score: Math.round((teamCombined / 4) * 100),
    traction_score: Math.round(((result.breakdown.traction || 0) / 3) * 100),
    market_score: Math.round((marketCombined / 3.5) * 100),
    product_score: Math.round(((result.breakdown.product || 0) / 2) * 100),
    vision_score: Math.round(((result.breakdown.product_vision || 0) / 2) * 100),
    total_god_score: total
  };
}

async function forceRecalculateScores() {
  console.log('🔥 FORCE RECALCULATE - No threshold, all startups will be updated\n');

  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved');

  if (error) {
    console.error('Error fetching startups:', error);
    process.exit(1);
  }

  if (!startups || startups.length === 0) {
    console.log('No startups to process');
    return;
  }

  console.log(`📊 Processing ${startups.length} startups...\n`);

  let updated = 0;
  let errors = 0;
  const changes: { name: string; old: number; new: number; diff: number }[] = [];

  for (const startup of startups) {
    const oldScore = startup.total_god_score || 0;
    const scores = calculateGODScore(startup);
    const diff = scores.total_god_score - oldScore;

    // Force update regardless of difference
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({
        total_god_score: scores.total_god_score,
        market_score: scores.market_score,
        team_score: scores.team_score,
        traction_score: scores.traction_score,
        product_score: scores.product_score,
        vision_score: scores.vision_score,
        updated_at: new Date().toISOString()
      })
      .eq('id', startup.id);

    if (updateError) {
      console.error(`❌ Error updating ${startup.name}:`, updateError.message);
      errors++;
    } else {
      if (Math.abs(diff) >= 0.5) {
        changes.push({ name: startup.name, old: oldScore, new: scores.total_god_score, diff });
      }
      updated++;
    }
  }

  // Sort changes by magnitude
  changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  console.log('\n📈 TOP SCORE CHANGES:');
  changes.slice(0, 20).forEach(c => {
    const arrow = c.diff > 0 ? '↑' : '↓';
    const emoji = c.diff > 0 ? '🟢' : '🔴';
    console.log(`  ${emoji} ${c.name}: ${c.old.toFixed(1)} → ${c.new.toFixed(1)} (${arrow}${Math.abs(c.diff).toFixed(1)})`);
  });

  console.log('\n📊 SUMMARY');
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Score changes (≥0.5): ${changes.length}`);
  console.log(`  Avg change: ${(changes.reduce((s, c) => s + Math.abs(c.diff), 0) / (changes.length || 1)).toFixed(2)}`);
  
  // Distribution analysis
  const { data: newStats } = await supabase
    .from('startup_uploads')
    .select('total_god_score')
    .eq('status', 'approved');

  if (newStats) {
    const scores = newStats.map(s => s.total_god_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const below50 = scores.filter(s => s < 50).length;
    const above70 = scores.filter(s => s >= 70).length;
    const above80 = scores.filter(s => s >= 80).length;

    console.log('\n📊 NEW DISTRIBUTION:');
    console.log(`  Average: ${avg.toFixed(1)}`);
    console.log(`  Below 50: ${below50} (${(below50/scores.length*100).toFixed(1)}%)`);
    console.log(`  70+: ${above70} (${(above70/scores.length*100).toFixed(1)}%)`);
    console.log(`  80+: ${above80} (${(above80/scores.length*100).toFixed(1)}%)`);
  }

  console.log('\n✅ Force recalculation complete');
}

// Run
forceRecalculateScores().catch(console.error);
