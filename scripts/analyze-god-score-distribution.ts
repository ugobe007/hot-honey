/**
 * GOD Score Distribution Analysis
 * 
 * Analyzes the current distribution of GOD scores across all startups
 * to check if scores are in a reasonable range before we have investment outcome data.
 * 
 * This helps identify if scores are trending too high/low even without outcome data.
 */

// Load environment variables FIRST
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
  avgScore: number;
}

async function analyzeGODScoreDistribution() {
  console.log('📊 Analyzing GOD Score Distribution\n');
  console.log('═'.repeat(70));

  // Get all startups with GOD scores
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, status')
    .not('total_god_score', 'is', null)
    .order('total_god_score', { ascending: false });

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups with GOD scores found.');
    return;
  }

  console.log(`\n✅ Found ${startups.length} startups with GOD scores\n`);

  // Calculate statistics
  const scores = startups.map(s => s.total_god_score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

  // Calculate standard deviation
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  console.log('📈 Score Statistics:');
  console.log(`   Total Startups: ${startups.length}`);
  console.log(`   Average Score: ${avgScore.toFixed(1)}`);
  console.log(`   Median Score: ${medianScore.toFixed(1)}`);
  console.log(`   Min Score: ${minScore}`);
  console.log(`   Max Score: ${maxScore}`);
  console.log(`   Standard Deviation: ${stdDev.toFixed(1)}`);

  // Distribution by ranges
  const ranges = [
    { min: 0, max: 30, label: '0-30 (Very Weak)' },
    { min: 31, max: 48, label: '31-48 (Weak)' },
    { min: 49, max: 64, label: '49-64 (Average)' },
    { min: 65, max: 77, label: '65-77 (Solid)' },
    { min: 78, max: 88, label: '78-88 (Strong)' },
    { min: 89, max: 100, label: '89-100 (Elite)' }
  ];

  const distribution: ScoreDistribution[] = ranges.map(range => {
    const inRange = scores.filter(s => s >= range.min && s <= range.max);
    return {
      range: range.label,
      count: inRange.length,
      percentage: (inRange.length / scores.length) * 100,
      avgScore: inRange.length > 0 ? inRange.reduce((a, b) => a + b, 0) / inRange.length : 0
    };
  });

  console.log('\n📊 Score Distribution:');
  distribution.forEach(d => {
    const bar = '█'.repeat(Math.floor(d.percentage / 2));
    console.log(`   ${d.range.padEnd(25)}: ${d.count.toString().padStart(4)} (${d.percentage.toFixed(1)}%) ${bar}`);
  });

  // Analysis and recommendations
  console.log('\n🔍 Analysis:');
  
  if (avgScore > 75) {
    console.log('   ⚠️  Average score is HIGH (>75)');
    console.log('      - May indicate scores are too lenient');
    console.log('      - Consider reviewing if this reflects actual startup quality');
    console.log('      - Wait for investment outcome data to confirm');
  } else if (avgScore < 50) {
    console.log('   ⚠️  Average score is LOW (<50)');
    console.log('      - May indicate scores are too conservative');
    console.log('      - Consider reviewing if this reflects actual startup quality');
    console.log('      - Wait for investment outcome data to confirm');
  } else {
    console.log('   ✅ Average score is in reasonable range (50-75)');
    console.log('      - This is a good baseline');
    console.log('      - Continue monitoring as more data comes in');
  }

  if (stdDev < 10) {
    console.log('   ⚠️  Low standard deviation (<10)');
    console.log('      - Scores may not be differentiating enough');
    console.log('      - Consider reviewing component weights');
  } else {
    console.log('   ✅ Good score differentiation (std dev >= 10)');
  }

  // Check distribution balance
  const highQuality = distribution.filter(d => d.range.includes('Strong') || d.range.includes('Elite'));
  const highQualityPct = highQuality.reduce((sum, d) => sum + d.percentage, 0);
  
  if (highQualityPct > 40) {
    console.log('   ⚠️  High percentage of strong/elite scores (>40%)');
    console.log('      - May indicate scores are too high');
    console.log('      - Elite startups should be rare (5-15% of total)');
  } else if (highQualityPct < 5) {
    console.log('   ⚠️  Very few strong/elite scores (<5%)');
    console.log('      - May indicate scores are too conservative');
  } else {
    console.log(`   ✅ Reasonable distribution of high-quality startups (${highQualityPct.toFixed(1)}%)`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 Recommendations:');
  console.log('   1. Monitor scores as more startups are added');
  console.log('   2. Track investment outcomes when they occur');
  console.log('   3. Run calibrate-god-scores.ts once you have outcome data');
  console.log('   4. Adjust based on REAL investment results, not arbitrary targets');
  console.log('\n');
}

// Main execution
async function main() {
  try {
    await analyzeGODScoreDistribution();
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { analyzeGODScoreDistribution };



