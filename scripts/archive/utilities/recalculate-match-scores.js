require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'ai/ml': 2.0, 'ai': 2.0, 'ml': 2.0, 'saas': 2.0, 'fintech': 2.0,
  'healthtech': 2.0, 'consumer': 2.0, 'robotics': 2.0,
  'crypto': 1.0, 'web3': 1.0,
  'cleantech': 0.5, 'gaming': 0.5, 'edtech': 0.5
};

async function recalculate() {
  console.log('Loading data...');
  
  const [startupsRes, investorsRes] = await Promise.all([
    supabase.from('startup_uploads').select('id, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startupMap = {};
  (startupsRes.data || []).forEach(s => { startupMap[s.id] = s; });
  
  const investorMap = {};
  (investorsRes.data || []).forEach(i => { investorMap[i.id] = i; });

  console.log('Startups:', Object.keys(startupMap).length);
  console.log('Investors:', Object.keys(investorMap).length);

  let updated = 0;
  let offset = 0;
  
  while (offset < 10000) {
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
      const sSec = (s.sectors || []).map(x => x.toLowerCase());
      const iSec = (i.sectors || []).map(x => x.toLowerCase());
      
      let sectorBonus = 0;
      sSec.forEach(sec => {
        if (iSec.some(is => sec.includes(is) || is.includes(sec))) {
          const w = SECTOR_WEIGHTS[sec] || SECTOR_WEIGHTS[Object.keys(SECTOR_WEIGHTS).find(k => sec.includes(k))] || 1.0;
          sectorBonus += 8 * w;
        }
      });
      sectorBonus = Math.min(sectorBonus, 32);

      const iStages = (i.stage || []).map(x => x.toLowerCase());
      const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
      const sStage = stageNames[s.stage || 2] || 'seed';
      const stageBonus = iStages.some(x => x.includes(sStage)) ? 10 : 0;

      const newScore = Math.min(godScore + sectorBonus + stageBonus, 99);
      
      if (newScore !== m.match_score) {
        await supabase.from('startup_investor_matches').update({ match_score: newScore }).eq('id', m.id);
        updated++;
      }
    }

    console.log('Processed:', offset + matches.length, '| Updated:', updated);
    offset += 500;
  }

  console.log('Done! Updated:', updated);
}

recalculate();
