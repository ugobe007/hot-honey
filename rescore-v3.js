require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function rescore() {
  console.log('Rescoring v3 - Creating real bell curve distribution...\n');

  const { data: matches } = await supabase
    .from('startup_investor_matches')
    .select('id, startup_id, investor_id')
    .limit(10000);

  const [st, inv] = await Promise.all([
    supabase.from('startup_uploads').select('id, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startupMap = {};
  (st.data || []).forEach(s => { startupMap[s.id] = s; });
  const investorMap = {};
  (inv.data || []).forEach(i => { investorMap[i.id] = i; });

  // First pass: calculate raw scores to find distribution
  const rawScores = [];
  
  for (const m of matches) {
    const s = startupMap[m.startup_id];
    const i = investorMap[m.investor_id];
    if (!s || !i) continue;

    const godScore = s.total_god_score || 45;
    
    // Count sector overlaps
    const sSec = (s.sectors || []).map(x => x.toLowerCase());
    const iSec = (i.sectors || []).map(x => x.toLowerCase());
    let sectorOverlap = 0;
    sSec.forEach(sec => {
      if (iSec.some(is => sec.includes(is) || is.includes(sec))) sectorOverlap++;
    });
    
    // Stage match
    const iStages = (i.stage || []).map(x => x.toLowerCase());
    const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
    const sStage = stageNames[s.stage || 2] || 'seed';
    const stageMatch = iStages.length === 0 ? 0.5 : (iStages.some(x => x.includes(sStage)) ? 1 : 0);
    
    // Raw composite score (0-100 scale)
    const raw = (godScore - 45) * 5 + sectorOverlap * 10 + stageMatch * 10;
    rawScores.push({ id: m.id, raw });
  }

  // Sort by raw score
  rawScores.sort((a, b) => b.raw - a.raw);
  
  // Assign final scores based on percentile rank
  // Top 10% = 85-95, Next 25% = 70-84, Middle 35% = 55-69, Next 20% = 45-54, Bottom 10% = 35-44
  const total = rawScores.length;
  let updated = 0;

  for (let i = 0; i < rawScores.length; i++) {
    const percentile = i / total;
    let finalScore;
    
    if (percentile < 0.10) {
      finalScore = 85 + Math.round((0.10 - percentile) / 0.10 * 10);
    } else if (percentile < 0.35) {
      finalScore = 70 + Math.round((0.35 - percentile) / 0.25 * 14);
    } else if (percentile < 0.70) {
      finalScore = 55 + Math.round((0.70 - percentile) / 0.35 * 14);
    } else if (percentile < 0.90) {
      finalScore = 45 + Math.round((0.90 - percentile) / 0.20 * 9);
    } else {
      finalScore = 35 + Math.round((1.0 - percentile) / 0.10 * 9);
    }
    
    finalScore = Math.max(35, Math.min(finalScore, 95));
    
    await supabase.from('startup_investor_matches').update({ match_score: finalScore }).eq('id', rawScores[i].id);
    updated++;
    
    if (updated % 500 === 0) process.stdout.write('\rUpdated: ' + updated);
  }

  console.log('\n\nDone. Updated:', updated);

  // Check distribution
  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(1000);
  const sc = sample.map(m => m.match_score).filter(Boolean);
  
  console.log('\nFINAL DISTRIBUTION:');
  const buckets = {'85-95':0,'70-84':0,'55-69':0,'45-54':0,'35-44':0};
  sc.forEach(x => {
    if(x>=85) buckets['85-95']++;
    else if(x>=70) buckets['70-84']++;
    else if(x>=55) buckets['55-69']++;
    else if(x>=45) buckets['45-54']++;
    else buckets['35-44']++;
  });
  Object.entries(buckets).forEach(([r,c]) => {
    console.log(r.padEnd(8) + c.toString().padStart(5) + ' (' + Math.round(c/sc.length*100) + '%)');
  });
  console.log('Avg:', Math.round(sc.reduce((a,b)=>a+b,0)/sc.length));
  console.log('Min:', Math.min(...sc), '| Max:', Math.max(...sc));
}

rescore().catch(console.error);
