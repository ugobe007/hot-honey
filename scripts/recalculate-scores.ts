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
 */
function toScoringProfile(startup: any): any {
  return {
    tagline: startup.tagline,
    pitch: startup.description,
    problem: startup.problem,
    solution: startup.solution,
    market_size: startup.market_size,
    industries: startup.industries || startup.sectors || [],
    team: startup.team_companies ? startup.team_companies.map((c: string) => ({
      name: 'Team Member',
      previousCompanies: [c]
    })) : [],
    founders_count: startup.team_size || 1,
    technical_cofounders: startup.has_technical_cofounder ? 1 : 0,
    mrr: startup.mrr,
    revenue: startup.arr || startup.revenue,
    growth_rate: startup.growth_rate_monthly,
    launched: startup.is_launched,
    demo_available: startup.has_demo,
    founded_date: startup.founded_date || startup.created_at,
    value_proposition: startup.value_proposition || startup.tagline,
    // Pass through any additional fields that might exist
    ...startup
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
  
  // Map breakdown to 20-point categories
  return {
    market_score: Math.round((result.breakdown.market / 2) * 20),
    team_score: Math.round((result.breakdown.team / 3) * 20),
    traction_score: Math.round((result.breakdown.traction / 3) * 20),
    product_score: Math.round((result.breakdown.product / 2) * 20),
    vision_score: Math.round((result.breakdown.vision / 2) * 20),
    total_god_score: total
  };
}

async function recalculateScores(): Promise<void> {
  console.log('🔢 Starting GOD Score recalculation (using SINGLE SOURCE OF TRUTH)...');
  
  // Get startups that need recalculation
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .in('status', ['pending', 'approved'])
    .order('updated_at', { ascending: true })
    .limit(100);

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
