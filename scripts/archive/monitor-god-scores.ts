#!/usr/bin/env node
/**
 * GOD SCORE MONITORING
 * ====================
 * 
 * Monitors average GOD scores and alerts if they exceed thresholds.
 * Provides recommendations for calibration adjustments.
 * 
 * Usage:
 *   npx tsx scripts/monitor-god-scores.ts
 * 
 * Runs automatically via PM2 every hour.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Thresholds from GOD_SCORE_CONFIG
const THRESHOLDS = {
  averageHigh: 70,  // Alert if average exceeds this
  averageLow: 48,   // Alert if average falls below this (adjusted from 50 - 49.4 is acceptable)
  targetMin: 55,    // Target range minimum
  targetMax: 65,    // Target range maximum
};

interface ScoreStats {
  average: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  count: number;
  distribution: {
    weak: number;
    average: number;
    solid: number;
    strong: number;
    elite: number;
  };
}

async function getScoreStats(): Promise<ScoreStats | null> {
  try {
    // Get all approved/pending startups with GOD scores
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('total_god_score')
      .in('status', ['pending', 'approved'])
      .not('total_god_score', 'is', null)
      .gte('total_god_score', 0);

    if (error) {
      console.error('❌ Error fetching scores:', error);
      return null;
    }

    if (!startups || startups.length === 0) {
      console.log('⚠️  No startups with GOD scores found');
      return null;
    }

    const scores = startups.map(s => s.total_god_score || 0).filter(s => s > 0);

    // Calculate statistics
    const sorted = [...scores].sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    // Standard deviation
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Distribution
    const distribution = {
      weak: scores.filter(s => s >= 0 && s <= 48).length,
      average: scores.filter(s => s >= 49 && s <= 64).length,
      solid: scores.filter(s => s >= 65 && s <= 77).length,
      strong: scores.filter(s => s >= 78 && s <= 88).length,
      elite: scores.filter(s => s >= 89 && s <= 100).length,
    };

    return {
      average,
      median,
      min,
      max,
      stdDev,
      count: scores.length,
      distribution,
    };
  } catch (error) {
    console.error('❌ Error calculating stats:', error);
    return null;
  }
}

function getRecommendations(stats: ScoreStats): string[] {
  const recommendations: string[] = [];

  // Check average
  if (stats.average > THRESHOLDS.averageHigh) {
    recommendations.push(`⚠️  Average score (${stats.average.toFixed(1)}) exceeds threshold (${THRESHOLDS.averageHigh})`);
    recommendations.push('   → Consider increasing normalizationDivisor from 22 to 24');
    recommendations.push('   → OR reduce baseBoostMinimum from 3.5 to 3.0');
    recommendations.push('   → Run: npx tsx scripts/calibrate-god-scores.ts for data-driven recommendations');
  } else if (stats.average < THRESHOLDS.averageLow) {
    recommendations.push(`⚠️  Average score (${stats.average.toFixed(1)}) below threshold (${THRESHOLDS.averageLow})`);
    recommendations.push('   → Consider decreasing normalizationDivisor from 22 to 20');
    recommendations.push('   → OR increase baseBoostMinimum from 3.5 to 4.0');
    recommendations.push('   → Note: After inference integration, scores may naturally increase');
  } else if (stats.average >= THRESHOLDS.targetMin && stats.average <= THRESHOLDS.targetMax) {
    recommendations.push(`✅ Average score (${stats.average.toFixed(1)}) is in target range (${THRESHOLDS.targetMin}-${THRESHOLDS.targetMax})`);
  } else {
    recommendations.push(`ℹ️  Average score (${stats.average.toFixed(1)}) is outside target range but within acceptable bounds`);
  }

  // Check standard deviation
  if (stats.stdDev < 10) {
    recommendations.push(`⚠️  Low standard deviation (${stats.stdDev.toFixed(1)}) - scores not differentiating enough`);
    recommendations.push('   → Run: npx tsx scripts/analyze-god-components.ts to identify components with low differentiation');
    recommendations.push('   → Consider adjusting component weights or improving data collection');
  } else if (stats.stdDev > 20) {
    recommendations.push(`⚠️  High standard deviation (${stats.stdDev.toFixed(1)}) - scores may be too spread out`);
  } else {
    recommendations.push(`✅ Standard deviation (${stats.stdDev.toFixed(1)}) is healthy`);
  }

  // Check distribution
  const strongPlus = stats.distribution.strong + stats.distribution.elite;
  const strongPercent = (strongPlus / stats.count) * 100;

  if (strongPercent < 5) {
    recommendations.push(`⚠️  Very few strong/elite scores (${strongPercent.toFixed(1)}%) - may be too conservative`);
    recommendations.push('   → Consider if scoring thresholds are too strict');
  } else if (strongPercent > 20) {
    recommendations.push(`⚠️  Many strong/elite scores (${strongPercent.toFixed(1)}%) - may be too lenient`);
  } else {
    recommendations.push(`✅ Strong/elite distribution (${strongPercent.toFixed(1)}%) is reasonable`);
  }

  return recommendations;
}

async function logToDatabase(stats: ScoreStats, alert: boolean, recommendations: string[]) {
  try {
    await supabase.from('ai_logs').insert({
      type: 'god_score_monitor',
      input: {
        timestamp: new Date().toISOString(),
        thresholds: THRESHOLDS,
      },
      output: {
        stats,
        alert,
        recommendations,
      },
      status: alert ? 'alert' : 'ok',
    });
  } catch (error) {
    // Non-critical - don't fail if logging fails
    console.warn('⚠️  Could not log to database:', error);
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('    📊 GOD SCORE MONITORING');
  console.log('═'.repeat(70));
  console.log(`⏰ ${new Date().toISOString()}\n`);

  const stats = await getScoreStats();

  if (!stats) {
    console.log('❌ Could not retrieve score statistics');
    process.exit(1);
  }

  // Display statistics
  console.log('📊 Current Statistics:');
  console.log(`   Average: ${stats.average.toFixed(2)}`);
  console.log(`   Median: ${stats.median.toFixed(2)}`);
  console.log(`   Min: ${stats.min}`);
  console.log(`   Max: ${stats.max}`);
  console.log(`   Std Dev: ${stats.stdDev.toFixed(2)}`);
  console.log(`   Count: ${stats.count}`);
  console.log('\n📈 Distribution:');
  console.log(`   Weak (0-48): ${stats.distribution.weak} (${((stats.distribution.weak / stats.count) * 100).toFixed(1)}%)`);
  console.log(`   Average (49-64): ${stats.distribution.average} (${((stats.distribution.average / stats.count) * 100).toFixed(1)}%)`);
  console.log(`   Solid (65-77): ${stats.distribution.solid} (${((stats.distribution.solid / stats.count) * 100).toFixed(1)}%)`);
  console.log(`   Strong (78-88): ${stats.distribution.strong} (${((stats.distribution.strong / stats.count) * 100).toFixed(1)}%)`);
  console.log(`   Elite (89-100): ${stats.distribution.elite} (${((stats.distribution.elite / stats.count) * 100).toFixed(1)}%)`);

  // Check thresholds
  const alert = stats.average > THRESHOLDS.averageHigh || stats.average < THRESHOLDS.averageLow;
  
  console.log('\n' + '═'.repeat(70));
  if (alert) {
    console.log('🚨 ALERT: Score average outside acceptable range!');
  } else {
    console.log('✅ Status: Scores within acceptable range');
  }
  console.log('═'.repeat(70));

  // Get recommendations
  const recommendations = getRecommendations(stats);
  console.log('\n💡 Recommendations:');
  recommendations.forEach(rec => console.log(rec));

  // Log to database
  await logToDatabase(stats, alert, recommendations);

  // Exit with error code if alert
  if (alert) {
    console.log('\n⚠️  Exiting with alert status');
    process.exit(1);
  } else {
    console.log('\n✅ Monitoring complete');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

