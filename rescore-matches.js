require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'saas': 1.5, 'ai/ml': 1.5, 'ai': 1.5, 'ml': 1.5, 'fintech': 1.5,
  'healthtech': 1.5, 'consumer': 1.3, 'robotics': 1.5, 'spacetech': 1.5,
  'defense': 1.5, 'deeptech': 1.3, 'materials': 1.3, 'energy': 1.2,
  'bess': 1.2, 'climate': 1.2, 'crypto': 1.0, 'cleantech': 1.0,
  'gaming': 0.8, 'edtech': 0.8
};

function norm(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml')) return 'ai';
  if (s.includes('saas') || s.includes('software')) return 'saas';
  if (s.includes('fintech') || s.includes('finance')) return 'fintech';
  if (s.includes('health')) return 'health';
  if (s.includes('consumer')) return 'consumer';
  if (s.includes('robot')) return 'robotics';
  if (s.includes('space') || s.includes('aerospace')) return 'spacetech';
  if (s.includes('defense') || s.includes('security')) return 'defense';
  if (s.includes('deep')) return 'deeptech';
  if (s.includes('material')) return 'materials';
  if (s.includes('energy') || s.includes('bess')) return 'energy';
  if (s.includes('climate') || s.includes('clean')) return 'climate';
  if (s.includes('crypto') || s.includes('web3')) return 'crypto';
  if (s.includes('gaming')) return 'gaming';
  if (s.includes('edtech') || s.includes('education')) return 'edtech';
  return 'other';
}

async function rescore() {
  console.log('Rescoring matches with new formula...\n');

  const [st, inv] = await Promise.all([
    supabase.from('startup_uploads').select('id, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startupMap = {};
  (st.data || []).forEach(s => { startupMap[s.id] = s; });
  
  const investorMap = {};
  (inv.data || []).forEach(i => { investorMap[i.id] = i; });

  console.log('Startups:', Object.keys(startupMap).length);
  console.log('Investors:', Object.keys(investorMap).length);

  let updated = 0;
  let offset = 0;

  while (offset < 30000) {
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score')
      .range(offset, offset + 499);

    if (!matches || matches.length === 0) break;

    for (const m of matches) {
      const s = startupMap[m.startup_id];
      const i = investorMap[m.investor_id];
      if (!s || !i) continue;

      const godScore = s.total_god_score || 40;
      const sSec = (s.sectors || []).map(x => norm(x));
      const iSec = (i.sectors || []).map(x => norm(x));

      let sectorBonus = 0;
      sSec.forEach(sec => {
        if (iSec.includes(sec)) {
          const w = SECTOR_WEIGHTS[sec] || 1.0;
          sectorBonus += 4 * w;
        }
      });
      sectorBonus = Math.min(sectorBonus, 16);

      const iStages = (i.stage || []).map(x => x.toLowerCase());
      const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
      const sStage = stageNames[s.stage || 2] || 'seed';
      const stageBonus = iStages.some(x => x.includes(sStage)) ? 8 : -5;

      const newScore = Math.max(35, Math.min(godScore + sectorBonus + stageBonus, 95));

      if (newScore !== m.match_score) {
        await supabase.from('startup_investor_matches').update({ match_score: newScore }).eq('id', m.id);
        updated++;
      }
    }

    offset += 500;
    process.stdout.write('\rProcessed: ' + offset + ' | Updated: ' + updated);
  }

  console.log('\n\nDone. Updated:', updated);

  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(1000);
  const sc = sample.map(m => m.match_score).filter(Boolean);
  const buckets = {'90+':0,'80-89':0,'70-79':0,'60-69':0,'50-59':0,'40-49':0,'<40':0};
  
  sc.forEach(x => {
    if(x>=90) buckets['90+']++;
    else if(x>=80) buckets['80-89']++;
    else if(x>=70) buckets['70-79']++;
    else if(x>=60) buckets['60-69']++;
    else if(x>=50) buckets['50-59']++;
    else if(x>=40) buckets['40-49']++;
    else buckets['<40']++;
  });

  console.log('\nNEW DISTRIBUTION:');
  Object.entries(buckets).forEach(([r,c]) => {
    console.log(r.padEnd(8) + c.toString().padStart(5) + ' (' + Math.round(c/sc.length*100) + '%)');
  });
  console.log('Avg:', Math.round(sc.reduce((a,b)=>a+b,0)/sc.length));
}

rescore().catch(console.error);
