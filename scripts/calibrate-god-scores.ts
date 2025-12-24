/**
 * GOD Score Calibration Script
 * 
 * This script analyzes REAL investment outcomes to properly calibrate the GOD scoring system.
 * It uses actual match data (funded, meeting_scheduled, declined) to determine:
 * 1. What GOD score ranges actually lead to investments
 * 2. Whether the current scoring is too high/low
 * 3. What adjustments should be made based on REAL data, not arbitrary normalization
 * 
 * IMPORTANT: This maintains the integrity of the GOD scoring system by using
 * actual investor behavior and deal outcomes to calibrate, not arbitrary adjustments.
 * 
 * Usage:
 *   SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key npx tsx scripts/calibrate-god-scores.ts
 */

// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config();

// Check for required environment variables before importing services
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  console.error('   Or set: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('\n   Usage:');
  console.error('   SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key npx tsx scripts/calibrate-god-scores.ts');
  console.error('\n   Or create a .env file with:');
  console.error('   SUPABASE_URL=your_url');
  console.error('   SUPABASE_SERVICE_KEY=your_key');
  process.exit(1);
}

// Now import services (they will use the environment variables we just validated)
import { createClient } from '@supabase/supabase-js';
import { analyzeSuccessFactors, generateOptimizationRecommendations, collectTrainingData } from '../server/services/mlTrainingService';

const supabase = createClient(supabaseUrl, supabaseKey);

interface CalibrationAnalysis {
  scoreRanges: {
    range: string;
    count: number;
    avg_quality: number;
    success_rate: number;
    investment_rate: number;
  }[];
  avgScoreForFunded: number;
  avgScoreForPassed: number;
  recommendedCalibration: {
    action: string;
    reasoning: string;
    confidence: number;
  };
}

async function analyzeGODScoreCalibration(): Promise<CalibrationAnalysis> {
  console.log('🔬 Analyzing GOD Score Calibration Based on Real Investment Outcomes\n');
  console.log('═'.repeat(70));

  // Step 1: Collect real match outcomes
  console.log('\n📊 Step 1: Collecting Real Match Outcomes...');
  const outcomes = await collectTrainingData();
  
  if (outcomes.length === 0) {
    console.log('⚠️  No match outcomes found. Need actual investment data to calibrate.');
    console.log('   The system needs matches with status: funded, meeting_scheduled, declined, etc.');
    return {
      scoreRanges: [],
      avgScoreForFunded: 0,
      avgScoreForPassed: 0,
      recommendedCalibration: {
        action: 'INSUFFICIENT_DATA',
        reasoning: 'Need more match outcomes (funded, meeting_scheduled, declined) to calibrate',
        confidence: 0
      }
    };
  }

  console.log(`✅ Collected ${outcomes.length} match outcomes`);
  console.log(`   - Funded: ${outcomes.filter(o => o.outcome === 'invested').length}`);
  console.log(`   - Meetings: ${outcomes.filter(o => o.outcome === 'meeting').length}`);
  console.log(`   - Interested: ${outcomes.filter(o => o.outcome === 'interested').length}`);
  console.log(`   - Passed: ${outcomes.filter(o => o.outcome === 'passed').length}`);

  // Step 2: Analyze success by GOD score range
  console.log('\n📈 Step 2: Analyzing Success Rates by GOD Score Range...');
  const scoreRanges = [
    { min: 0, max: 50, label: '0-50' },
    { min: 51, max: 60, label: '51-60' },
    { min: 61, max: 70, label: '61-70' },
    { min: 71, max: 80, label: '71-80' },
    { min: 81, max: 90, label: '81-90' },
    { min: 91, max: 100, label: '91-100' }
  ];

  const rangeAnalysis = scoreRanges.map(range => {
    const matchesInRange = outcomes.filter(
      o => o.god_score >= range.min && o.god_score <= range.max
    );

    const avgQuality = matchesInRange.length > 0
      ? matchesInRange.reduce((sum, o) => sum + o.outcome_quality, 0) / matchesInRange.length
      : 0;

    const successRate = matchesInRange.length > 0
      ? matchesInRange.filter(o => o.outcome_quality >= 0.6).length / matchesInRange.length
      : 0;

    const investmentRate = matchesInRange.length > 0
      ? matchesInRange.filter(o => o.outcome === 'invested').length / matchesInRange.length
      : 0;

    return {
      range: range.label,
      count: matchesInRange.length,
      avg_quality: avgQuality,
      success_rate: successRate,
      investment_rate: investmentRate
    };
  });

  console.log('\n📊 Success by GOD Score Range:');
  rangeAnalysis.forEach(a => {
    if (a.count > 0) {
      console.log(`   ${a.range.padEnd(8)}: ${a.count.toString().padStart(4)} matches | ` +
        `Success: ${(a.success_rate * 100).toFixed(1)}% | ` +
        `Invested: ${(a.investment_rate * 100).toFixed(1)}% | ` +
        `Avg Quality: ${a.avg_quality.toFixed(2)}`);
    }
  });

  // Step 3: Calculate average scores for funded vs passed
  const funded = outcomes.filter(o => o.outcome === 'invested');
  const passed = outcomes.filter(o => o.outcome === 'passed');
  
  const avgScoreForFunded = funded.length > 0
    ? funded.reduce((sum, o) => sum + o.god_score, 0) / funded.length
    : 0;
  
  const avgScoreForPassed = passed.length > 0
    ? passed.reduce((sum, o) => sum + o.god_score, 0) / passed.length
    : 0;

  console.log('\n🎯 Key Metrics:');
  console.log(`   Average GOD Score for FUNDED deals: ${avgScoreForFunded.toFixed(1)}`);
  console.log(`   Average GOD Score for PASSED deals: ${avgScoreForPassed.toFixed(1)}`);
  console.log(`   Score difference: ${(avgScoreForFunded - avgScoreForPassed).toFixed(1)} points`);

  // Step 4: Determine calibration recommendation
  console.log('\n🔧 Step 3: Generating Calibration Recommendations...');
  
  let recommendedCalibration: CalibrationAnalysis['recommendedCalibration'];
  
  if (funded.length === 0) {
    recommendedCalibration = {
      action: 'INSUFFICIENT_DATA',
      reasoning: 'No funded deals found. Need actual investment outcomes to calibrate.',
      confidence: 0
    };
  } else if (avgScoreForFunded > 85) {
    // High scores for funded deals - system may be scoring too high overall
    recommendedCalibration = {
      action: 'SCORES_TOO_HIGH',
      reasoning: `Funded deals average ${avgScoreForFunded.toFixed(1)}, which is very high. ` +
        `If most startups are scoring 70+, the system may not be differentiating enough. ` +
        `Consider: (1) Review component weights, (2) Check if normalization is too lenient, ` +
        `(3) Verify that market signals (funding velocity) are being properly weighted.`,
      confidence: funded.length > 10 ? 0.8 : 0.5
    };
  } else if (avgScoreForFunded < 60) {
    // Low scores for funded deals - system may be scoring too low
    recommendedCalibration = {
      action: 'SCORES_TOO_LOW',
      reasoning: `Funded deals average ${avgScoreForFunded.toFixed(1)}, which is lower than expected. ` +
        `High-quality startups that receive funding should typically score 70-85. ` +
        `Consider: (1) Review if component weights are too conservative, ` +
        `(2) Check if market signals are being undervalued.`,
      confidence: funded.length > 10 ? 0.8 : 0.5
    };
  } else if (avgScoreForFunded - avgScoreForPassed < 10) {
    // Small difference between funded and passed - system not differentiating enough
    recommendedCalibration = {
      action: 'POOR_DIFFERENTIATION',
      reasoning: `Funded deals (${avgScoreForFunded.toFixed(1)}) and passed deals (${avgScoreForPassed.toFixed(1)}) ` +
        `are too close. The system should differentiate better. ` +
        `Consider: (1) Increase weights on factors that predict success, ` +
        `(2) Review component scoring logic for better discrimination.`,
      confidence: outcomes.length > 50 ? 0.75 : 0.5
    };
  } else {
    // System appears to be working well
    recommendedCalibration = {
      action: 'SYSTEM_WORKING_WELL',
      reasoning: `Funded deals average ${avgScoreForFunded.toFixed(1)} and passed deals average ${avgScoreForPassed.toFixed(1)}. ` +
        `The ${(avgScoreForFunded - avgScoreForPassed).toFixed(1)} point difference shows good differentiation. ` +
        `No major calibration needed, but continue monitoring.`,
      confidence: outcomes.length > 50 ? 0.9 : 0.7
    };
  }

  console.log(`\n✅ Recommendation: ${recommendedCalibration.action}`);
  console.log(`   Confidence: ${(recommendedCalibration.confidence * 100).toFixed(0)}%`);
  console.log(`   Reasoning: ${recommendedCalibration.reasoning}`);

  // Step 5: Get ML optimization recommendations
  console.log('\n🧠 Step 4: ML-Based Optimization Recommendations...');
  try {
    const mlRecommendations = await generateOptimizationRecommendations();
    console.log('\n📋 ML Recommendations:');
    mlRecommendations.reasoning.forEach(r => console.log(`   • ${r}`));
  } catch (error) {
    console.log('   ⚠️  Could not generate ML recommendations:', error);
  }

  return {
    scoreRanges: rangeAnalysis,
    avgScoreForFunded,
    avgScoreForPassed,
    recommendedCalibration
  };
}

// Main execution
async function main() {
  try {
    const analysis = await analyzeGODScoreCalibration();
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n📝 CALIBRATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`\nAction Required: ${analysis.recommendedCalibration.action}`);
    console.log(`Confidence: ${(analysis.recommendedCalibration.confidence * 100).toFixed(0)}%`);
    console.log(`\nReasoning:\n${analysis.recommendedCalibration.reasoning}`);
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ Calibration analysis complete. Review recommendations above.');
    console.log('   IMPORTANT: Adjust scoring based on REAL data, not arbitrary normalization.');
    console.log('   The GOD system must reflect actual investor preferences and deal quality.\n');
    
  } catch (error) {
    console.error('❌ Error during calibration analysis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { analyzeGODScoreCalibration };

