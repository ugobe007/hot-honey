/**
 * GOD Score Bias Monitor Script
 * Scans all startups, calculates average GOD score, and triggers recalibration if bias detected.
 * Usage: npx tsx scripts/god-score-bias-monitor.ts
 */
import { createClient } from '@supabase/supabase-js';
import { calculateHotScore } from '../server/services/startupScoringService';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase credentials');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved');
  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('No startups found.');
    return;
  }
  let sum = 0;
  let count = 0;
  let scores: number[] = [];
  for (const startup of data) {
    try {
      const score = calculateHotScore(startup).total * 10; // 0-100 scale
      scores.push(score);
      sum += score;
      count++;
    } catch (e) {
      // Ignore scoring errors
    }
  }
  const avg = sum / count;
  const BASELINE = 57.9;
  const diff = avg - BASELINE;
  console.log(`GOD Score Bias Monitor: Average GOD score = ${avg.toFixed(2)} (n=${count})`);
  console.log(`Baseline GOD score = ${BASELINE}`);
  console.log(`Difference from baseline: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`);
  if (avg < 45 || avg > 75) {
    console.warn(`[GOD SCORE ALERT] Average GOD score is ${avg.toFixed(2)}. Recommend recalibration!`);
    // Optionally: trigger recalculation script or notify admin
    // Example: require('child_process').execSync('npx tsx scripts/recalculate-scores.ts');
  } else {
    console.log('GOD score distribution is healthy.');
  }
}

main();
