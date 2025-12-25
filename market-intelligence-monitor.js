#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeMarket() {
  console.log('\n📊 MARKET INTELLIGENCE MONITOR');
  console.log('════════════════════════════════════════════════════════════════\n');

  // 1. SECTOR MOMENTUM
  console.log('🔥 SECTOR MOMENTUM (Investor Demand vs Startup Supply)\n');
  
  const [startups, investors] = await Promise.all([
    supabase.from('startup_uploads').select('sectors, total_god_score').eq('status', 'approved'),
    supabase.from('investors').select('sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startupSectors = {};
  const investorSectors = {};

  startups.data.forEach(s => {
    (s.sectors || []).forEach(sec => {
      const n = normalizeSector(sec);
      startupSectors[n] = (startupSectors[n] || 0) + 1;
    });
  });

  investors.data.forEach(i => {
    (i.sectors || []).forEach(sec => {
      const n = normalizeSector(sec);
      investorSectors[n] = (investorSectors[n] || 0) + 1;
    });
  });

  const momentum = {};
  Object.keys({...startupSectors, ...investorSectors}).forEach(sector => {
    const supply = startupSectors[sector] || 0;
    const demand = investorSectors[sector] || 0;
    if (supply > 5 || demand > 5) {
      const ratio = supply > 0 ? demand / supply : 0;
      momentum[sector] = { supply, demand, ratio, signal: ratio > 1.5 ? 'HOT 🔥' : ratio < 0.5 ? 'COLD ❄️' : 'BALANCED' };
    }
  });

  console.log('Sector'.padEnd(18) + 'Startups'.padStart(10) + 'Investors'.padStart(10) + 'Ratio'.padStart(8) + 'Signal'.padStart(12));
  console.log('─'.repeat(58));
  Object.entries(momentum).sort((a,b) => b[1].ratio - a[1].ratio).forEach(([sec, d]) => {
    console.log(sec.padEnd(18) + d.supply.toString().padStart(10) + d.demand.toString().padStart(10) + d.ratio.toFixed(2).padStart(8) + d.signal.padStart(12));
  });

  // 2. SCORE CALIBRATION
  console.log('\n\n🎯 SCORE CALIBRATION\n');
  
  const scores = startups.data.map(s => s.total_god_score).filter(Boolean);
  const avg = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const stdDev = Math.round(Math.sqrt(scores.map(x => Math.pow(x - avg, 2)).reduce((a,b) => a+b) / scores.length));

  const buckets = {'80+': 0, '70-79': 0, '60-69': 0, '50-59': 0, '40-49': 0, '<40': 0};
  scores.forEach(sc => {
    if (sc >= 80) buckets['80+']++;
    else if (sc >= 70) buckets['70-79']++;
    else if (sc >= 60) buckets['60-69']++;
    else if (sc >= 50) buckets['50-59']++;
    else if (sc >= 40) buckets['40-49']++;
    else buckets['<40']++;
  });

  console.log('Total:', scores.length, '| Avg:', avg, '| Min:', min, '| Max:', max, '| StdDev:', stdDev);
  console.log('');
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = Math.round(count / scores.length * 100);
    console.log('  ' + range.padEnd(8) + count.toString().padStart(5) + ' (' + pct.toString().padStart(2) + '%) ' + '█'.repeat(Math.round(pct/2)));
  });

  // 3. WEIGHT RECOMMENDATIONS
  console.log('\n\n📋 WEIGHT ADJUSTMENT RECOMMENDATIONS\n');

  const recs = [];
  
  // Hot sectors should get weight boost
  Object.entries(momentum).forEach(([sector, data]) => {
    if (data.signal === 'HOT 🔥' && data.ratio > 2) {
      recs.push({ sector, action: 'INCREASE weight to ' + Math.min(data.ratio, 2).toFixed(1), reason: 'High investor demand (' + data.demand + ') vs supply (' + data.supply + ')' });
    }
    if (data.signal === 'COLD ❄️' && data.ratio < 0.3) {
      recs.push({ sector, action: 'DECREASE weight to ' + Math.max(data.ratio, 0.5).toFixed(1), reason: 'Low investor interest relative to supply' });
    }
  });

  // Score distribution issues
  if (stdDev < 10) recs.push({ sector: 'SCORING', action: 'Increase variance', reason: 'Scores too clustered (StdDev: ' + stdDev + ')' });
  if (max < 85) recs.push({ sector: 'SCORING', action: 'Raise ceiling', reason: 'No elite scores (Max: ' + max + ')' });
  if (buckets['50-59'] / scores.length > 0.5) recs.push({ sector: 'SCORING', action: 'Reduce default bias', reason: (Math.round(buckets['50-59'] / scores.length * 100)) + '% of scores in 50-59 range' });

  if (recs.length === 0) {
    console.log('✅ No significant deviations. Weights are well-calibrated.');
  } else {
    recs.forEach((r, i) => {
      console.log((i+1) + '. ' + r.sector + ': ' + r.action);
      console.log('   Reason: ' + r.reason + '\n');
    });
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ Market Intelligence Monitor Complete');
  console.log('════════════════════════════════════════════════════════════════\n');
}

function normalizeSector(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml')) return 'AI/ML';
  if (s.includes('fintech') || s.includes('finance') || s.includes('payment')) return 'FinTech';
  if (s.includes('health') || s.includes('medical') || s.includes('biotech')) return 'HealthTech';
  if (s.includes('saas') || s.includes('software') || s.includes('enterprise')) return 'SaaS';
  if (s.includes('climate') || s.includes('clean') || s.includes('energy')) return 'CleanTech';
  if (s.includes('security') || s.includes('cyber')) return 'Cybersecurity';
  if (s.includes('robot')) return 'Robotics';
  if (s.includes('edtech') || s.includes('education') || s.includes('learning')) return 'EdTech';
  if (s.includes('consumer') || s.includes('social')) return 'Consumer';
  if (s.includes('crypto') || s.includes('web3') || s.includes('blockchain')) return 'Crypto/Web3';
  if (s.includes('gaming') || s.includes('game')) return 'Gaming';
  return 'Other';
}

analyzeMarket().catch(console.error);
