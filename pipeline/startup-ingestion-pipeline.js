require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const VC_BENCHMARKS = {
  distribution: {
    'elite_55+': { target: 0.10, tolerance: 0.05 },
    'strong_45-54': { target: 0.25, tolerance: 0.05 },
    'good_40-44': { target: 0.40, tolerance: 0.05 },
    'promising_35-39': { target: 0.15, tolerance: 0.05 },
    'early_30-34': { target: 0.08, tolerance: 0.03 },
    'very_early_<30': { target: 0.02, tolerance: 0.02 }
  },
  avgGodScore: { target: 44, tolerance: 3 }
};

const SECTOR_KEYWORDS = {
  'ai': 'AI/ML', 'ml': 'AI/ML', 'gpt': 'AI/ML', 'llm': 'AI/ML',
  'saas': 'SaaS', 'software': 'SaaS', 'platform': 'SaaS',
  'fintech': 'FinTech', 'payment': 'FinTech', 'bank': 'FinTech',
  'health': 'HealthTech', 'medical': 'HealthTech',
  'space': 'SpaceTech', 'satellite': 'SpaceTech', 'rocket': 'SpaceTech',
  'defense': 'Defense', 'security': 'Defense',
  'energy': 'Energy', 'solar': 'Energy', 'battery': 'Energy',
  'climate': 'Climate', 'carbon': 'Climate', 'green': 'Climate',
  'robot': 'Robotics', 'drone': 'Robotics',
  'quantum': 'DeepTech', 'nano': 'DeepTech',
  'crypto': 'Crypto', 'blockchain': 'Crypto'
};

function inferSectors(startup) {
  if (startup.sectors && startup.sectors.length > 0) return startup.sectors;
  const text = ((startup.name || '') + ' ' + (startup.tagline || '')).toLowerCase();
  const inferred = new Set();
  for (const [kw, sector] of Object.entries(SECTOR_KEYWORDS)) {
    if (text.includes(kw)) inferred.add(sector);
  }
  return inferred.size > 0 ? [...inferred] : ['SaaS'];
}

function inferGodScore(startup) {
  if (startup.total_god_score && startup.total_god_score > 0) return startup.total_god_score;
  let score = 30;
  if (startup.has_technical_cofounder) score += 5;
  if (startup.team_size >= 3) score += 3;
  if (startup.mrr >= 100000) score += 15;
  else if (startup.mrr >= 10000) score += 10;
  else if (startup.mrr >= 1000) score += 5;
  if (startup.has_customers) score += 3;
  if (startup.is_launched) score += 3;
  if (startup.website) score += 2;
  return Math.min(score, 65);
}

async function runInference(startup) {
  const updates = {};
  let changed = false;
  if (!startup.sectors || startup.sectors.length === 0) {
    updates.sectors = inferSectors(startup);
    changed = true;
  }
  if (!startup.total_god_score || startup.total_god_score === 0) {
    updates.total_god_score = inferGodScore(startup);
    changed = true;
  }
  if (changed) {
    await supabase.from('startup_uploads').update(updates).eq('id', startup.id);
  }
  return { ...startup, ...updates };
}

function auditBatch(startups) {
  const total = startups.length;
  const scores = startups.map(s => s.total_god_score).filter(Boolean);
  const dist = {
    'elite_55+': scores.filter(s => s >= 55).length / total,
    'strong_45-54': scores.filter(s => s >= 45 && s < 55).length / total,
    'good_40-44': scores.filter(s => s >= 40 && s < 45).length / total,
    'promising_35-39': scores.filter(s => s >= 35 && s < 40).length / total,
    'early_30-34': scores.filter(s => s >= 30 && s < 35).length / total,
    'very_early_<30': scores.filter(s => s < 30).length / total
  };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const deviations = [];
  for (const [bucket, actual] of Object.entries(dist)) {
    const bench = VC_BENCHMARKS.distribution[bucket];
    const dev = Math.abs(actual - bench.target);
    if (dev > bench.tolerance) {
      deviations.push({
        type: 'distribution', bucket,
        actual: (actual * 100).toFixed(1) + '%',
        target: (bench.target * 100).toFixed(1) + '%',
        deviation: (dev * 100).toFixed(1) + '%',
        severity: dev > bench.tolerance * 2 ? 'HIGH' : 'MEDIUM'
      });
    }
  }
  const avgDev = Math.abs(avg - VC_BENCHMARKS.avgGodScore.target);
  if (avgDev > VC_BENCHMARKS.avgGodScore.tolerance) {
    deviations.push({
      type: 'avg_score', actual: avg.toFixed(1),
      target: VC_BENCHMARKS.avgGodScore.target,
      deviation: avgDev.toFixed(1),
      severity: avgDev > VC_BENCHMARKS.avgGodScore.tolerance * 2 ? 'HIGH' : 'MEDIUM'
    });
  }
  return { distribution: dist, avgScore: avg, deviations };
}

function alertMLEngine(deviations, batchInfo) {
  if (deviations.length === 0) return;
  const alert = {
    timestamp: new Date().toISOString(),
    batch: batchInfo,
    deviations,
    recommendations: []
  };
  for (const d of deviations) {
    if (d.bucket && d.bucket.includes('early')) {
      alert.recommendations.push('Add more early-stage startups from Product Hunt/Indie Hackers');
    }
    if (d.bucket && d.bucket.includes('elite')) {
      alert.recommendations.push('Add more funded startups from TechCrunch/YC');
    }
    if (d.type === 'avg_score' && parseFloat(d.actual) > d.target) {
      alert.recommendations.push('Avg GOD too high - add more early-stage startups');
    }
  }
  const alertPath = './ml-data/alerts/alert-' + Date.now() + '.json';
  fs.writeFileSync(alertPath, JSON.stringify(alert, null, 2));
  console.log('\nML ALERT:', deviations.length, 'deviations');
  deviations.forEach(d => console.log('  [' + d.severity + ']', d.type, d.bucket || '', d.actual, 'vs', d.target));
  return alert;
}

async function run() {
  console.log('STARTUP INGESTION PIPELINE\n');
  const { data: startups } = await supabase
    .from('startup_uploads').select('*').eq('status', 'approved').limit(500);
  console.log('Processing', startups.length, 'startups...\n');
  let processed = 0;
  const batchSize = 100;
  for (let i = 0; i < startups.length; i += batchSize) {
    const batch = startups.slice(i, i + batchSize);
    const enriched = [];
    for (const s of batch) {
      enriched.push(await runInference(s));
    }
    const audit = auditBatch(enriched);
    console.log('Batch', Math.floor(i/batchSize)+1, '| Avg GOD:', audit.avgScore.toFixed(1));
    const significant = audit.deviations.filter(d => parseFloat(d.deviation) >= 5);
    if (significant.length > 0) {
      alertMLEngine(significant, { batch: Math.floor(i/batchSize)+1, count: batch.length });
    }
    processed += batch.length;
  }
  console.log('\nDone. Processed:', processed);
  const { data: all } = await supabase.from('startup_uploads').select('total_god_score').eq('status', 'approved');
  const scores = all.map(x => x.total_god_score).filter(Boolean);
  console.log('\nFINAL STATS:');
  console.log('  Total:', all.length);
  console.log('  Avg GOD:', (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1));
  console.log('  Min:', Math.min(...scores), '| Max:', Math.max(...scores));
}

run().catch(console.error);
