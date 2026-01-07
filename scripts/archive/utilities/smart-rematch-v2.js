require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'ai/ml': 2.0, 'ai': 2.0, 'ml': 2.0, 'saas': 2.0, 'fintech': 2.0,
  'healthtech': 2.0, 'consumer': 2.0, 'robotics': 2.0,
  'crypto': 1.0, 'web3': 1.0,
  'cleantech': 0.5, 'gaming': 0.5, 'edtech': 0.5
};

function normalizeSector(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml')) return 'ai';
  if (s.includes('saas') || s.includes('software') || s.includes('enterprise')) return 'saas';
  if (s.includes('fintech') || s.includes('finance')) return 'fintech';
  if (s.includes('health') || s.includes('medical')) return 'health';
  if (s.includes('consumer')) return 'consumer';
  if (s.includes('robot')) return 'robotics';
  if (s.includes('crypto') || s.includes('web3')) return 'crypto';
  if (s.includes('climate') || s.includes('clean')) return 'climate';
  if (s.includes('gaming')) return 'gaming';
  return 'other';
}

async function smartRematch() {
  console.log('\n🎯 SMART RE-MATCHING V2 (Using UPSERT)\n');

  const [startupsRes, investorsRes] = await Promise.all([
    supabase.from('startup_uploads').select('id, name, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, name, sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startups = startupsRes.data || [];
  const investors = investorsRes.data || [];
  
  console.log('Startups:', startups.length, '| Investors:', investors.length);

  // Index investors by sector
  const investorsBySector = {};
  investors.forEach(inv => {
    (inv.sectors || []).forEach(sec => {
      const n = normalizeSector(sec);
      if (!investorsBySector[n]) investorsBySector[n] = [];
      investorsBySector[n].push(inv);
    });
  });

  let updated = 0;
  let processed = 0;

  for (const startup of startups) {
    const sSectors = (startup.sectors || []).map(s => normalizeSector(s));
    const godScore = startup.total_god_score || 40;

    // Find sector-matching investors
    const candidates = new Set();
    sSectors.forEach(sec => {
      (investorsBySector[sec] || []).forEach(inv => candidates.add(inv));
    });

    // Score each candidate
    for (const inv of candidates) {
      const iSectors = (inv.sectors || []).map(s => normalizeSector(s));
      
      let sectorBonus = 0;
      sSectors.forEach(sec => {
        if (iSectors.includes(sec)) {
          const w = SECTOR_WEIGHTS[sec] || SECTOR_WEIGHTS['ai'] || 1.0;
          sectorBonus += 8 * w;
        }
      });
      sectorBonus = Math.min(sectorBonus, 32);

      const iStages = (inv.stage || []).map(x => x.toLowerCase());
      const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
      const sStage = stageNames[startup.stage || 2] || 'seed';
      const stageBonus = iStages.some(x => x.includes(sStage)) ? 10 : 0;

      const newScore = Math.min(godScore + sectorBonus + stageBonus, 99);

      // Only update if score is good
      if (newScore >= 50) {
        const { error } = await supabase
          .from('startup_investor_matches')
          .upsert({
            startup_id: startup.id,
            investor_id: inv.id,
            match_score: newScore,
            updated_at: new Date().toISOString()
          }, { onConflict: 'startup_id,investor_id' });

        if (!error) updated++;
      }
    }

    processed++;
    if (processed % 50 === 0) {
      process.stdout.write('\rProcessed: ' + processed + '/' + startups.length + ' | Updated: ' + updated);
    }
  }

  console.log('\n\n✅ Done! Updated:', updated, 'matches');

  // Check distribution
  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(1000);
  const scores = sample.map(m => m.match_score).filter(Boolean);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const good = scores.filter(s => s >= 60).length;
  
  console.log('\n📊 New Distribution:');
  console.log('  Avg:', avg);
  console.log('  Good fits (60+):', good, '(' + Math.round(good / scores.length * 100) + '%)');
}

smartRematch().catch(console.error);
