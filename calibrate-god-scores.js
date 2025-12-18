#!/usr/bin/env node
/**
 * GOD SCORE CALIBRATION
 * =====================
 * Recalibrates GOD scores to fix skewed distribution where
 * most startups score < 50 due to missing structured data.
 * 
 * The scoring system is additive-only, meaning scraped startups
 * with limited data (no detailed team info, no revenue, etc.)
 * get very low scores even if they're legitimate companies.
 * 
 * This script applies a calibration curve that:
 * - Maintains relative rankings
 * - Shifts the distribution center to ~55-60
 * - Ensures genuine differentiation for truly exceptional startups
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Calibration function using a scaled curve
// Maps 25-100 input to 40-100 output while preserving order
function calibrateScore(rawScore) {
  if (!rawScore || rawScore <= 0) return 30;
  
  // Linear interpolation with higher floor
  // Old range: 25-100 (75 points)
  // New range: 40-100 (60 points)
  
  const MIN_RAW = 25;
  const MAX_RAW = 100;
  const MIN_CAL = 40;  // Minimum calibrated score
  const MAX_CAL = 100; // Maximum stays the same
  
  // Clamp raw score
  const clampedRaw = Math.max(MIN_RAW, Math.min(MAX_RAW, rawScore));
  
  // Apply slight curve to spread out mid-range scores
  const normalized = (clampedRaw - MIN_RAW) / (MAX_RAW - MIN_RAW);
  
  // Use sqrt curve to boost lower scores more than higher ones
  const curved = Math.sqrt(normalized);
  
  // Map to new range
  const calibrated = MIN_CAL + curved * (MAX_CAL - MIN_CAL);
  
  return Math.round(calibrated);
}

async function main() {
  console.log('🎯 GOD Score Calibration Starting...\n');
  
  // Get current score distribution
  const { data: allStartups, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, team_score, traction_score, market_score, product_score, vision_score')
    .eq('status', 'approved');
  
  if (fetchError) {
    console.error('❌ Failed to fetch startups:', fetchError.message);
    return;
  }
  
  console.log(`📊 Found ${allStartups.length} approved startups\n`);
  
  // Show current distribution
  const distribution = { veryLow: 0, low: 0, medium: 0, high: 0, elite: 0 };
  allStartups.forEach(s => {
    const score = s.total_god_score || 0;
    if (score < 30) distribution.veryLow++;
    else if (score < 50) distribution.low++;
    else if (score < 70) distribution.medium++;
    else if (score < 85) distribution.high++;
    else distribution.elite++;
  });
  
  console.log('📈 CURRENT Distribution:');
  console.log(`   Very Low (0-30): ${distribution.veryLow}`);
  console.log(`   Low (30-50): ${distribution.low}`);
  console.log(`   Medium (50-70): ${distribution.medium}`);
  console.log(`   High (70-85): ${distribution.high}`);
  console.log(`   Elite (85+): ${distribution.elite}`);
  
  const avgBefore = allStartups.reduce((sum, s) => sum + (s.total_god_score || 0), 0) / allStartups.length;
  console.log(`   Average Score: ${avgBefore.toFixed(1)}\n`);
  
  // Calculate calibrated scores
  const calibrations = allStartups.map(s => {
    const rawScore = s.total_god_score || 25;
    const calibratedScore = calibrateScore(rawScore);
    
    // Also calibrate component scores proportionally
    const scaleFactor = calibratedScore / Math.max(rawScore, 25);
    
    return {
      id: s.id,
      name: s.name,
      oldScore: rawScore,
      newScore: calibratedScore,
      // Scale component scores but keep them within 0-20 range
      team_score: Math.min(20, Math.round((s.team_score || 5) * scaleFactor)),
      traction_score: Math.min(20, Math.round((s.traction_score || 5) * scaleFactor)),
      market_score: Math.min(20, Math.round((s.market_score || 5) * scaleFactor)),
      product_score: Math.min(20, Math.round((s.product_score || 5) * scaleFactor)),
      vision_score: Math.min(20, Math.round((s.vision_score || 5) * scaleFactor)),
    };
  });
  
  // Preview new distribution
  const newDist = { veryLow: 0, low: 0, medium: 0, high: 0, elite: 0 };
  calibrations.forEach(c => {
    if (c.newScore < 30) newDist.veryLow++;
    else if (c.newScore < 50) newDist.low++;
    else if (c.newScore < 70) newDist.medium++;
    else if (c.newScore < 85) newDist.high++;
    else newDist.elite++;
  });
  
  const avgAfter = calibrations.reduce((sum, c) => sum + c.newScore, 0) / calibrations.length;
  
  console.log('🎯 CALIBRATED Distribution (preview):');
  console.log(`   Very Low (0-30): ${newDist.veryLow}`);
  console.log(`   Low (30-50): ${newDist.low}`);
  console.log(`   Medium (50-70): ${newDist.medium}`);
  console.log(`   High (70-85): ${newDist.high}`);
  console.log(`   Elite (85+): ${newDist.elite}`);
  console.log(`   Average Score: ${avgAfter.toFixed(1)}\n`);
  
  // Show some examples
  console.log('📝 Sample calibrations:');
  calibrations.slice(0, 5).forEach(c => {
    console.log(`   ${c.name.substring(0, 25).padEnd(25)} : ${c.oldScore} → ${c.newScore}`);
  });
  console.log();
  
  // Check for --apply flag
  if (!process.argv.includes('--apply')) {
    console.log('⚠️  DRY RUN - use --apply to actually update scores');
    return;
  }
  
  // Apply calibrations in batches
  console.log('💾 Applying calibrations...');
  const BATCH_SIZE = 50;
  let updated = 0;
  
  for (let i = 0; i < calibrations.length; i += BATCH_SIZE) {
    const batch = calibrations.slice(i, i + BATCH_SIZE);
    
    for (const cal of batch) {
      const { error } = await supabase
        .from('startup_uploads')
        .update({
          total_god_score: cal.newScore,
          team_score: cal.team_score,
          traction_score: cal.traction_score,
          market_score: cal.market_score,
          product_score: cal.product_score,
          vision_score: cal.vision_score,
        })
        .eq('id', cal.id);
      
      if (!error) updated++;
    }
    
    process.stdout.write(`\r   Updated ${updated}/${calibrations.length}...`);
  }
  
  console.log('\n\n✅ Calibration complete!');
  console.log(`   Average score: ${avgBefore.toFixed(1)} → ${avgAfter.toFixed(1)}`);
}

main().catch(console.error);
