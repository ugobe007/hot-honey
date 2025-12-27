/**
 * HOT MATCH SCORE RECALCULATOR
 * ============================
 * Recalculates GOD scores for startups using the SINGLE SOURCE OF TRUTH:
 * ../server/services/startupScoringService.ts
 * 
 * ⚠️  DO NOT ADD SCORING LOGIC HERE - use startupScoringService instead!
 * 
 * Runs hourly via PM2 cron.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { calculateHotScore } from '../server/services/startupScoringService';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ScoreBreakdown {
  market_score: number;
  team_score: number;
  traction_score: number;
  product_score: number;
  vision_score: number;
  total_god_score: number;
}

/**
 * Convert startup DB row to profile format for scoring service
 * 
 * The scoring service now handles BOTH:
 * 1. Numeric values (revenue: 100000) - uses exact amounts for tiered scoring
 * 2. Boolean inference signals (has_revenue: true) - uses as fallback when no numbers
 */
function toScoringProfile(startup: any): any {
  // Extract data from extracted_data JSONB column if available
  const extracted = startup.extracted_data || {};
  
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
    
    // Numeric traction values (use actual numbers when available)
    mrr: startup.mrr || extracted.mrr,
    revenue: startup.arr || startup.revenue || extracted.revenue || extracted.arr,
    growth_rate: startup.growth_rate_monthly || extracted.growth_rate || extracted.growth_rate_monthly,
    customers: startup.customer_count || extracted.customers || extracted.customer_count,
    active_users: extracted.active_users || extracted.users,
    gmv: extracted.gmv,
    retention_rate: extracted.retention_rate,
    churn_rate: extracted.churn_rate,
    prepaying_customers: extracted.prepaying_customers,
    signed_contracts: extracted.signed_contracts,
    
    // Boolean inference signals (used as fallback when no numbers exist)
    has_revenue: extracted.has_revenue,
    has_customers: extracted.has_customers,
    execution_signals: extracted.execution_signals || [],
    team_signals: extracted.team_signals || [],
    funding_amount: extracted.funding_amount,
    funding_stage: extracted.funding_stage,
    
    // Product signals
    launched: startup.is_launched || extracted.is_launched || extracted.launched,
    demo_available: startup.has_demo || extracted.has_demo || extracted.demo_available,
    unique_ip: extracted.unique_ip,
    defensibility: extracted.defensibility,
    mvp_stage: extracted.mvp_stage,
    
    // Other fields
    founded_date: startup.founded_date || startup.created_at || extracted.founded_date,
    value_proposition: startup.value_proposition || startup.tagline || extracted.value_proposition,
    backed_by: startup.backed_by || extracted.backed_by || extracted.investors,
    
    // Pass through any additional fields
    ...startup,
    ...extracted
  };
}

/**
 * Use the SINGLE SOURCE OF TRUTH scoring service
 * ⚠️  ALL SCORING LOGIC LIVES IN startupScoringService.ts - NOT HERE!
 */
function calculateGODScore(startup: any): ScoreBreakdown {
  const profile = toScoringProfile(startup);
  const result = calculateHotScore(profile);
  
  // Convert from 10-point scale to 100-point scale
  const total = Math.round(result.total * 10);
  
  // Map breakdown to 0-100 scale
  // Breakdown structure: team_execution (0-3), product_vision (0-2), traction (0-3), market (0-2), product (0-2)
  // Also includes: founder_courage (0-1.5), market_insight (0-1.5), team_age (0-1)
  // 
  // For component scores, we combine related components:
  // - team_score = team_execution + team_age (max 4, scale to 0-100)
  // - vision_score = product_vision (0-2, scale to 0-100)
  // - traction_score = traction (0-3, scale to 0-100)
  // - market_score = market + market_insight (max 3.5, scale to 0-100)
  // - product_score = product (0-2, scale to 0-100)
  
  const teamCombined = (result.breakdown.team_execution || 0) + (result.breakdown.team_age || 0);
  const marketCombined = (result.breakdown.market || 0) + (result.breakdown.market_insight || 0);
  
  return {
    team_score: Math.round((teamCombined / 4) * 100), // team_execution (0-3) + team_age (0-1) = max 4
    traction_score: Math.round(((result.breakdown.traction || 0) / 3) * 100), // traction (0-3)
    market_score: Math.round((marketCombined / 3.5) * 100), // market (0-2) + market_insight (0-1.5) = max 3.5
    product_score: Math.round(((result.breakdown.product || 0) / 2) * 100), // product (0-2)
    vision_score: Math.round(((result.breakdown.product_vision || 0) / 2) * 100), // product_vision (0-2)
    total_god_score: total
  };
}

async function recalculateScores(): Promise<void> {
  console.log('🔢 Starting GOD Score recalculation (using SINGLE SOURCE OF TRUTH)...');
  
  // Get startups that need recalculation
  // Process all approved/pending startups (removed limit to recalculate all)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .in('status', ['pending', 'approved'])
    .order('updated_at', { ascending: true });

  if (error) {
    console.error('Error fetching startups:', error);
    process.exit(1);
  }

  if (!startups || startups.length === 0) {
    console.log('No startups to process');
    return;
  }

  console.log(`📊 Processing ${startups.length} startups...`);

  let updated = 0;
  let unchanged = 0;

  for (const startup of startups) {
    const oldScore = startup.total_god_score || 0;
    const scores = calculateGODScore(startup);

    // Only update if score changed significantly (>1 point)
    if (Math.abs(scores.total_god_score - oldScore) > 1) {
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
        console.error(`Error updating ${startup.name}:`, updateError);
      } else {
        // Log score change
        try {
          await supabase.from('score_history').insert({
            startup_id: startup.id,
            old_score: oldScore,
            new_score: scores.total_god_score,
            reason: 'hourly_recalc'
          });
        } catch {} // Ignore if table doesn't exist

        console.log(`  ✅ ${startup.name}: ${oldScore} → ${scores.total_god_score}`);
        updated++;
      }
    } else {
      unchanged++;
    }
  }

  console.log(`\n📊 SUMMARY`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Total: ${startups.length}`);
  console.log('✅ Score recalculation complete');
}

// Run
recalculateScores().catch(console.error);
