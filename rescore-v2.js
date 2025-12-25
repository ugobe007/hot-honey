require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function rescore() {
  console.log('Rescoring v2 - Using GOD as primary driver...\n');

  const [st, inv] = await Promise.all([
    supabase.from('startup_uploads').select('id, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startupMap = {};
  (st.data || []).forEach(s => { startupMap[s.id] = s; });
  const investorMap = {};
  (inv.data || []).forEach(i => { investorMap[i.id] = i; });

  let updated = 0;
  let offset = 0;

  while (offset < 30000) {
    const { data: matches } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id')
      .range(offset, offset + 499);

    if (!matches || matches.length === 0) break;

    for (const m of matches) {
      const s = startupMap[m.startup_id];
      const i = investorMap[m.investor_id];
      if (!s || !i) continue;

      // New formula: GOD score IS the base (scaled 0-60)
      // Then add small bonuses for alignment
      const godScore = s.total_god_score || 45;
      
      // Scale GOD from 48-59 range to 35-65 range
      const scaledGod = Math.round(35 + ((godScore - 45) / 15) * 30);
      
      // Sector match: +5 to +15 based on overlap count
      const sSec = (s.sectors || []).map(x => x.toLowerCase());
      const iSec = (i.sectors || []).map(x => x.toLowerCase());
      let sectorMatches = 0;
      sSec.forEach(sec => {
        if (iSec.some(is => sec.includes(is) || is.includes(sec))) sectorMatches++;
      });
      const sectorBonus = Math.min(sectorMatches * 5, 15);
      
      // Stage: +5 match, -10 mismatch
      const iStages = (i.stage || []).map(x => x.toLowerCase());
      const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
      const sStage = stageNames[s.stage || 2] || 'seed';
      const stageBonus = iStages.length === 0 ? 0 : (iStages.some(x => x.includes(sStage)) ? 5 : -10);
      
      // Random variance to spread distribution
      const variance = Math.floor(Math.random() * 10) - 5;
      
      const newScore = Math.max(35, Math.min(scaledGod + sectorBonus + stageBonus + variance, 95));

      await supabase.from('startup_investor_matches').update({ match_score: newScore }).eq('id', m.id);
      updated++;
    }

    offset += 500;
    process.stdout.write('\rProcessed: ' + offset + ' | Updated: ' + updated);
  }

  console.log('\n\nDone. Updated:', updated);

  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(1000);
  const sc = sample.map(m => m.match_score).filter(Boolean);
  
  console.log('\nNEW DISTRIBUTION:');
  const buckets = {'85+':0,'75-84':0,'65-74':0,'55-64':0,'45-54':0,'<45':0};
  sc.forEach(x => {
    if(x>=85) buckets['85+']++;
    else if(x>=75) buckets['75-84']++;
    else if(x>=65) buckets['65-74']++;
    else if(x>=55) buckets['55-64']++;
    else if(x>=45) buckets['45-54']++;
    else buckets['<45']++;
  });
  Object.entries(buckets).forEach(([r,c]) => {
    console.log(r.padEnd(8) + c.toString().padStart(5) + ' (' + Math.round(c/sc.length*100) + '%)');
  });
  console.log('Avg:', Math.round(sc.reduce((a,b)=>a+b,0)/sc.length));
  console.log('Min:', Math.min(...sc), '| Max:', Math.max(...sc));
}

rescore().catch(console.error);
