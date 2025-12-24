// Generate industry benchmarks for all startups
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function main() {
  // Fetch all approved startups
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, team_size, mrr, sectors, description')
    .eq('status', 'approved');
  if (error) throw error;

  // Compute benchmarks for key variables
  const metrics = ['total_god_score', 'team_size', 'mrr'];
  const benchmarks = {};
  for (const metric of metrics) {
    const values = startups.map(s => Number(s[metric]) || 0).filter(v => v > 0);
    values.sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p50 = values[Math.floor(values.length * 0.5)] || 0;
    const p90 = values[Math.floor(values.length * 0.9)] || 0;
    benchmarks[metric] = { avg, p50, p90 };
  }


  // Calculate normalized overall benchmark score (0-100) for each startup
  // For each metric, score = 50 if at average, 100 if at or above p90, 0 if at or below p10
  const p10s = {};
  for (const metric of metrics) {
    const values = startups.map(s => Number(s[metric]) || 0).filter(v => v > 0);
    values.sort((a, b) => a - b);
    p10s[metric] = values[Math.floor(values.length * 0.1)] || 0;
  }

  const report = startups.map(s => {
    const out = { id: s.id, name: s.name };
    let totalScore = 0;
    let metricCount = 0;
    for (const metric of metrics) {
      const val = Number(s[metric]) || 0;
      out[metric] = val;
      out[`${metric}_vs_avg`] = val - (benchmarks[metric].avg || 0);
      out[`${metric}_vs_p50`] = val - (benchmarks[metric].p50 || 0);
      out[`${metric}_vs_p90`] = val - (benchmarks[metric].p90 || 0);

      // Normalized score for this metric
      let score = 50;
      if (val >= benchmarks[metric].p90) score = 100;
      else if (val <= p10s[metric]) score = 0;
      else if (val > benchmarks[metric].avg) {
        score = 50 + 50 * (val - benchmarks[metric].avg) / (benchmarks[metric].p90 - benchmarks[metric].avg || 1);
      } else if (val < benchmarks[metric].avg) {
        score = 50 - 50 * (benchmarks[metric].avg - val) / (benchmarks[metric].avg - p10s[metric] || 1);
      }
      score = Math.max(0, Math.min(100, score));
      totalScore += score;
      metricCount++;
      out[`${metric}_score`] = score;
    }
    out.sectors = s.sectors;
    out.overall_benchmark_score = metricCount ? Math.round(totalScore / metricCount) : null;
    return out;
  });

  fs.writeFileSync('startup_benchmarks.json', JSON.stringify({benchmarks, report}, null, 2));
  console.log('Benchmarks and startup performance saved to startup_benchmarks.json');
}

main().catch(console.error);
