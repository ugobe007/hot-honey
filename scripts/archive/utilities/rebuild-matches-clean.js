require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function normSector(sec) {
  const s = (sec || '').toLowerCase().trim();
  if (s.includes('ai') || s.includes('ml') || s.includes('machine learn')) return 'ai';
  if (s.includes('saas') || s === 'software') return 'saas';
  if (s.includes('fintech') || s.includes('defi')) return 'fintech';
  if (s.includes('health') || s.includes('medical') || s.includes('bio')) return 'health';
  if (s.includes('enterprise') || s.includes('b2b')) return 'enterprise';
  if (s.includes('consumer') || s.includes('b2c')) return 'consumer';
  if (s.includes('developer') || s.includes('devtool') || s.includes('devops')) return 'developer';
  if (s.includes('space') || s.includes('aerospace')) return 'space';
  if (s.includes('defense') || s.includes('security') || s.includes('cyber')) return 'defense';
  if (s.includes('energy') || s.includes('power') || s.includes('solar')) return 'energy';
  if (s.includes('climate') || s.includes('clean') || s.includes('green')) return 'climate';
  if (s.includes('robot') || s.includes('automat')) return 'robotics';
  if (s.includes('deep') || s.includes('quantum') || s.includes('material')) return 'deeptech';
  if (s.includes('game') || s.includes('gaming')) return 'gaming';
  if (s.includes('crypto') || s.includes('blockchain') || s.includes('web3')) return 'crypto';
  if (s.includes('edtech') || s.includes('education')) return 'education';
  if (s.includes('proptech') || s.includes('real estate')) return 'proptech';
  if (s.includes('food') || s.includes('agri')) return 'food';
  if (s.includes('legal')) return 'legal';
  return 'other';
}

function calcScore(startup, investor) {
  const god = startup.total_god_score || 40;
  const sSec = [...new Set((startup.sectors || []).map(normSector).filter(s => s !== 'other'))];
  const iSec = [...new Set((investor.sectors || []).map(normSector).filter(s => s !== 'other'))];
  
  let sectorBonus = 0;
  let matchCount = 0;
  for (const sec of sSec) {
    if (iSec.includes(sec)) {
      sectorBonus += 6;
      matchCount++;
    }
  }
  sectorBonus = Math.min(sectorBonus, 18);
  
  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  let stageBonus = iStages.length > 0 
    ? (iStages.some(x => x.includes(sStage) || sStage.includes(x)) ? 8 : 0)
    : 4;
  
  const penalty = matchCount === 0 ? -5 : 0;
  const raw = god + sectorBonus + stageBonus + penalty;
  return Math.round(Math.max(20, Math.min(raw, 95)) * 10) / 10;
}

async function loadAll(table, filter) {
  let all = [];
  let offset = 0;
  while (true) {
    let query = supabase.from(table).select('*').range(offset, offset + 999);
    if (filter) query = filter(query);
    const { data } = await query;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

async function rebuild() {
  console.log('REBUILD MATCHES (run TRUNCATE in SQL first!)\n');

  // Check if table is empty
  const { count: existing } = await supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true });
  if (existing > 0) {
    console.log('ERROR: Table has', existing, 'matches. Run TRUNCATE first!');
    return;
  }

  const startups = await loadAll('startup_uploads', q => q.eq('status', 'approved'));
  const investors = await loadAll('investors', q => q.not('sectors', 'eq', '{}'));
  console.log('Startups:', startups.length, '| Investors:', investors.length);

  console.log('Generating matches (top 10 per startup)...');
  const allMatches = [];
  for (const startup of startups) {
    const scored = investors.map(inv => ({
      startup_id: startup.id,
      investor_id: inv.id,
      match_score: calcScore(startup, inv)
    }));
    scored.sort((a, b) => b.match_score - a.match_score);
    allMatches.push(...scored.slice(0, 10));
  }
  console.log('Total matches:', allMatches.length);

  console.log('Inserting...');
  for (let i = 0; i < allMatches.length; i += 500) {
    await supabase.from('startup_investor_matches').insert(allMatches.slice(i, i + 500));
    if ((i + 500) % 5000 === 0) console.log('  Inserted:', i + 500);
  }

  // Verify
  const { count: final } = await supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true });
  console.log('\nFinal count:', final);
  console.log('Expected:', startups.length * 10);
}

rebuild();
