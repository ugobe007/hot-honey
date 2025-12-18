/**
 * HOT MATCH SCORE RECALCULATOR
 * ============================
 * Recalculates GOD scores for startups.
 * Runs hourly via PM2 cron.
 * 
 * Features:
 * - Batch processing
 * - Priority for pending approvals
 * - Score history tracking
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

interface Startup {
  id: string;
  name: string;
  tagline?: string | null;
  problem?: string | null;
  solution?: string | null;
  market_size?: string | null;
  team_size?: number | null;
  team_companies?: string[] | null;
  has_technical_cofounder?: boolean | null;
  mrr?: number | null;
  growth_rate_monthly?: number | null;
  is_launched?: boolean | null;
  has_demo?: boolean | null;
  total_god_score?: number | null;
  market_score?: number | null;
  team_score?: number | null;
  traction_score?: number | null;
  product_score?: number | null;
  vision_score?: number | null;
}

interface ScoreBreakdown {
  market_score: number;
  team_score: number;
  traction_score: number;
  product_score: number;
  vision_score: number;
  total_god_score: number;
}

function calculateGODScore(startup: Startup): ScoreBreakdown {
  // Market Score (0-20)
  let market_score = 5;
  if (startup.market_size) {
    const size = startup.market_size.toLowerCase();
    if (size.includes('billion') || size.includes('b')) market_score = 18;
    else if (size.includes('million') || size.includes('m')) market_score = 12;
    else market_score = 8;
  }
  if (startup.problem && startup.problem.length > 50) market_score += 2;
  market_score = Math.min(20, market_score);

  // Team Score (0-20)
  let team_score = 5;
  if (startup.team_size && startup.team_size >= 2) team_score += 5;
  if (startup.has_technical_cofounder) team_score += 5;
  if (startup.team_companies && startup.team_companies.length > 0) {
    const tier1 = ['google', 'meta', 'apple', 'amazon', 'microsoft', 'stripe', 'airbnb'];
    const hasT1 = startup.team_companies.some(c => 
      tier1.some(t1 => c.toLowerCase().includes(t1))
    );
    if (hasT1) team_score += 5;
    else team_score += 3;
  }
  team_score = Math.min(20, team_score);

  // Traction Score (0-20)
  let traction_score = 5;
  if (startup.mrr) {
    if (startup.mrr >= 100000) traction_score = 20;
    else if (startup.mrr >= 50000) traction_score = 17;
    else if (startup.mrr >= 10000) traction_score = 14;
    else if (startup.mrr >= 1000) traction_score = 10;
    else traction_score = 7;
  }
  if (startup.growth_rate_monthly && startup.growth_rate_monthly > 15) traction_score += 2;
  if (startup.is_launched) traction_score += 1;
  traction_score = Math.min(20, traction_score);

  // Product Score (0-20)
  let product_score = 5;
  if (startup.is_launched) product_score += 5;
  if (startup.has_demo) product_score += 5;
  if (startup.solution && startup.solution.length > 50) product_score += 3;
  if (startup.tagline && startup.tagline.length > 10) product_score += 2;
  product_score = Math.min(20, product_score);

  // Vision Score (0-20)
  let vision_score = 5;
  if (startup.problem && startup.problem.length > 100) vision_score += 5;
  if (startup.solution && startup.solution.length > 100) vision_score += 5;
  if (startup.market_size) vision_score += 3;
  if (startup.tagline && startup.tagline.length > 20) vision_score += 2;
  vision_score = Math.min(20, vision_score);

  // Total GOD Score (0-100)
  const total_god_score = market_score + team_score + traction_score + product_score + vision_score;

  return {
    market_score,
    team_score,
    traction_score,
    product_score,
    vision_score,
    total_god_score
  };
}

async function recalculateScores(): Promise<void> {
  console.log('🔢 Starting GOD Score recalculation...');
  
  // Get startups that need recalculation
  // Priority: pending, then approved, then recently updated
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
