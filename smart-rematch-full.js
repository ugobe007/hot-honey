require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = { 'ai': 2.0, 'saas': 2.0, 'fintech': 2.0, 'health': 2.0, 'consumer': 2.0, 'robotics': 2.0, 'crypto': 1.0, 'climate': 0.5, 'gaming': 0.5 };

function norm(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml')) return 'ai';
  if (s.includes('saas') || s.includes('software')) return 'saas';
  if (s.includes('fintech') || s.includes('finance')) return 'fintech';
  if (s.includes('health')) return 'health';
  if (s.includes('consumer')) return 'consumer';
  if (s.includes('robot')) return 'robotics';
  if (s.includes('crypto') || s.includes('web3')) return 'crypto';
  if (s.includes('climate') || s.includes('clean')) return 'climate';
  if (s.includes('gaming')) return 'gaming';
  return 'other';
}

async function run() {
  console.log('Loading ALL startups and investors...');
  
  const [st, inv] = await Promise.all([
    supabase.from('startup_uploads').select('id, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, sectors, stage').not('sectors', 'eq', '{}')
  ]);

  const startups = st.data || [];
  const investors = inv.data || [];
  console.log('Startups:', startups.length, '| Investors:', investors.length);

  // Index investors by sector for fast lookup
  const invBySector = {};
  investors.forEach(i => {
    (i.sectors || []).forEach(sec => {
      const n = norm(sec);
      if (!invBySector[n]) invBySector[n] = [];
      invBySector[n].push(i);
    });
  });

  let matches = [];
  let processed = 0;

  for (const s of startups) {
    const sSec = (s.sectors || []).map(norm);
    const god = s.total_god_score || 40;

    // Get investors matching this startup's sectors
    const candidates = new Set();
    sSec.forEach(sec => {
      (invBySector[sec] || []).slice(0, 50).forEach(i => candidates.add(i));
    });

    for (const i of candidates) {
      const iSec = (i.sectors || []).map(norm);
      const overlap = sSec.filter(sec => iSec.includes(sec));
      if (overlap.length === 0) continue;

      let bonus = 0;
      overlap.forEach(sec => { bonus += 8 * (SECTOR_WEIGHTS[sec] || 1); });
      bonus = Math.min(bonus, 32);

      const iStages = (i.stage || []).map(x => x.toLowerCase());
      const sStage = ['idea', 'pre-seed', 'seed', 'series a', 'series b'][s.stage || 2] || 'seed';
      const stageBonus = iStages.some(x => x.includes(sStage)) ? 10 : 0;

      const score = Math.min(god + bonus + stageBonus, 99);

      if (score >= 60) {
        matches.push({ startup_id: s.id, investor_id: i.id, match_score: score });
      }
    }

    processed++;
    if (processed % 100 === 0) process.stdout.write('\rProcessed: ' + processed + '/' + startups.length);
  }

  console.log('\nGood matches found:', matches.length);

  // Batch upsert
  let updated = 0;
  for (let i = 0; i < matches.length; i += 100) {
    const batch = matches.slice(i, i + 100);
    const { error } = await supabase.from('startup_investor_matches').upsert(batch, { onConflict: 'startup_id,investor_id' });
    if (!error) updated += batch.length;
    if (i % 1000 === 0) process.stdout.write('\rUpserted: ' + updated);
  }

  console.log('\nDone. Updated:', updated);
}

run().catch(console.error);
