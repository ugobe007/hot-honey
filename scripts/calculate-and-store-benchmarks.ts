#!/usr/bin/env node
/**
 * Calculate and store benchmark scores for all startups
 * 
 * This script:
 * 1. Calculates industry benchmarks (avg, p50, p90, p10) for key metrics
 * 2. Calculates normalized benchmark score (0-100) for each startup
 * 3. Stores benchmark_score in startup_uploads table
 * 
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx scripts/calculate-and-store-benchmarks.ts
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

async function main() {
  console.log('═'.repeat(70));
  console.log('    📊 CALCULATING AND STORING BENCHMARK SCORES');
  console.log('═'.repeat(70));

  try {
    // Fetch all approved startups
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score, team_size, mrr, sectors')
      .eq('status', 'approved');

    if (error) {
      throw error;
    }

    if (!startups || startups.length === 0) {
      console.log('⚠️  No approved startups found');
      return;
    }

    console.log(`\n📈 Found ${startups.length} approved startups\n`);

    // Compute benchmarks for key variables
    const metrics = ['total_god_score', 'team_size', 'mrr'];
    const benchmarks: Record<string, { avg: number; p50: number; p90: number }> = {};
    const p10s: Record<string, number> = {};

    for (const metric of metrics) {
      const values = startups
        .map(s => Number(s[metric as keyof typeof startups[0]]) || 0)
        .filter(v => v > 0)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const p50 = values[Math.floor(values.length * 0.5)] || 0;
        const p90 = values[Math.floor(values.length * 0.9)] || 0;
        const p10 = values[Math.floor(values.length * 0.1)] || 0;

        benchmarks[metric] = { avg, p50, p90 };
        p10s[metric] = p10;

        console.log(`   ${metric}:`);
        console.log(`      Avg: ${avg.toFixed(2)}`);
        console.log(`      P10: ${p10.toFixed(2)}`);
        console.log(`      P50: ${p50.toFixed(2)}`);
        console.log(`      P90: ${p90.toFixed(2)}\n`);
      }
    }

    // Calculate normalized overall benchmark score (0-100) for each startup
    console.log('🔄 Calculating benchmark scores for each startup...\n');

    let updated = 0;
    let skipped = 0;

    for (const startup of startups) {
      let totalScore = 0;
      let metricCount = 0;

      for (const metric of metrics) {
        const val = Number(startup[metric as keyof typeof startup]) || 0;
        
        if (val > 0 && benchmarks[metric]) {
          // Normalized score for this metric
          let score = 50; // Default to average
          
          if (val >= benchmarks[metric].p90) {
            score = 100; // Top 10%
          } else if (val <= p10s[metric]) {
            score = 0; // Bottom 10%
          } else if (val > benchmarks[metric].avg) {
            // Between average and p90
            score = 50 + 50 * (val - benchmarks[metric].avg) / (benchmarks[metric].p90 - benchmarks[metric].avg || 1);
          } else if (val < benchmarks[metric].avg) {
            // Between p10 and average
            score = 50 - 50 * (benchmarks[metric].avg - val) / (benchmarks[metric].avg - p10s[metric] || 1);
          }
          
          score = Math.max(0, Math.min(100, score));
          totalScore += score;
          metricCount++;
        }
      }

      const overallBenchmarkScore = metricCount > 0 ? Math.round(totalScore / metricCount) : null;

      if (overallBenchmarkScore !== null) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update({ benchmark_score: overallBenchmarkScore })
          .eq('id', startup.id);

        if (updateError) {
          console.error(`   ❌ Error updating ${startup.name}:`, updateError.message);
          skipped++;
        } else {
          updated++;
          if (updated % 100 === 0) {
            console.log(`   ✅ Updated ${updated} startups...`);
          }
        }
      } else {
        skipped++;
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ COMPLETE');
    console.log(`   Updated: ${updated} startups`);
    console.log(`   Skipped: ${skipped} startups (no valid metrics)`);
    console.log('═'.repeat(70));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

