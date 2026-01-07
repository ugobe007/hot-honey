require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'ai': 1.3, 'saas': 1.2, 'fintech': 1.3, 'health': 1.2, 'robotics': 1.3,
  'space': 1.4, 'defense': 1.4, 'consumer': 1.0, 'enterprise': 1.1,
  'deeptech': 1.3, 'energy': 1.2, 'climate': 1.2, 'developer': 1.1
};

const TECH_FAMILY = ['ai', 'saas', 'enterprise', 'developer', 'consumer', 'fintech'];

function norm(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml') || s.includes('machine')) return 'ai';
  if (s.includes('saas') || s.includes('software')) return 'saas';
  if (s.includes('fintech') || s.includes('finance') || s.includes('payment')) return 'fintech';
  if (s.includes('health') || s.includes('medical') || s.includes('bio')) return 'health';
  if (s.includes('enterprise') || s.includes('b2b')) return 'enterprise';
  if (s.includes('consumer') || s.includes('b2c')) return 'consumer';
  if (s.includes('developer') || s.includes('devtool') || s.includes('api')) return 'developer';
  if (s.includes('space') || s.includes('aerospace')) return 'space';
  if (s.includes('defense') || s.includes('security') || s.includes('cyber')) return 'defense';
  if (s.includes('energy') || s.includes('power') || s.includes('solar')) return 'energy';
  if (s.includes('climate') || s.includes('clean') || s.includes('green')) return 'climate';
  if (s.includes('robot') || s.includes('hardware')) return 'robotics';
  if (s.includes('deep') || s.includes('quantum')) return 'deeptech';
  if (s.includes('tech')) return 'technology';
  return 'other';
}

function calcScore(startup, investor) {
  const god = startup.total_god_score || 40;
  const sSec = (startup.sectors || []).map(norm);
  const iSec = (investor.sectors || []).map(norm);
  
  // Sector match bonus (0-16 points)
  let sectorBonus = 0;
  let matchCount = 0;
  
  for (const sec of sSec) {
    if (iSec.includes(sec)) {
      sectorBonus += 4 * (SECTOR_WEIGHTS[sec] || 1.0);
      matchCount++;
    } else if (sec === 'technology' && iSec.some(is => TECH_FAMILY.includes(is))) {
      sectorBonus += 3;
      matchCount++;
    }
  }
  sectorBonus = Math.min(sectorBonus, 16);
  
  // Stage bonus (0-8 points)
  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  let stageBonus = 0;
  if (iStages.length > 0) {
    stageBonus = iStages.some(x => x.includes(sStage)) ? 8 : 0;
  } else {
    stageBonus = 4;
  }
  
  // No match penalty
  const penalty = matchCount === 0 ? -8 : 0;
  
  // Final: GOD (25-64) + sector (0-16) + stage (0-8) - penalty (0-8) = 17-88
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
  console.log('REBUILDING MATCHES v3 - Loading ALL data\n');

  // Load ALL startups and investors
  console.log('Step 1: Loading ALL startups...');
  const startups = await loadAll('startup_uploads', q => q.eq('status', 'approved'));
  console.log('  Loaded:', startups.length);
  
  console.log('Step 2: Loading ALL investors...');
  const investors = await loadAll('investors', q => q.not('sectors', 'eq', '{}'));
  console.log('  Loaded:', investors.length);
  
  // Check GOD distribution
  const gods = startups.map(s => s.total_god_score).filter(Boolean);
  console.log('\n  GOD scores: min', Math.min(...gods), '| max', Math.max(...gods), '| avg', Math.round(gods.reduce((a,b)=>a+b,0)/gods.length));

  // Test one match
  const lowGod = startups.find(s => s.total_god_score < 30);
  const highGod = startups.find(s => s.total_god_score > 60);
  if (lowGod) console.log('  Test low GOD:', lowGod.name, 'GOD:', lowGod.total_god_score, '-> score:', calcScore(lowGod, investors[0]));
  if (highGod) console.log('  Test high GOD:', highGod.name, 'GOD:', highGod.total_god_score, '-> score:', calcScore(highGod, investors[0]));

  console.log('\nStep 3: Generating matches...');
  const allMatches = [];
  for (const startup of startups) {
    const scored = investors.map(inv => ({
      startup_id: startup.id,
      investor_id: inv.id,
      match_score: calcScore(startup, inv)
    }));
    scored.sort((a, b) => b.match_score - a.match_score);
    allMatches.push(...scored.slice(0, 10)); // Top 10 per startup
  }
  console.log('  Total:', allMatches.length);

  console.log('\nStep 4: Inserting...');
  let inserted = 0;
  for (let i = 0; i < allMatches.length; i += 500) {
    await supabase.from('startup_investor_matches').insert(allMatches.slice(i, i + 500));
    inserted += Math.min(500, allMatches.length - i);
    if (inserted % 5000 === 0) process.stdout.write('\r  Inserted: ' + inserted);
  }
  console.log('\n  Total inserted:', inserted);

  console.log('\nStep 5: Distribution...');
  const { data: sample } = await supabase.from('startup_investor_matches')
    .select('match_score').limit(5000);
  const scores = sample.map(m => m.match_score);
  
  const buckets = {'85+':0,'70-84':0,'55-69':0,'40-54':0,'<40':0};
  scores.forEach(x => {
    if(x>=85) buckets['85+']++;
    else if(x>=70) buckets['70-84']++;
    else if(x>=55) buckets['55-69']++;
    else if(x>=40) buckets['40-54']++;
    else buckets['<40']++;
  });
  
  console.log('\nFINAL:');
  Object.entries(buckets).forEach(([r,c]) => {
    const pct = Math.round(c/scores.length*100);
    console.log('  ' + r.padEnd(8) + c.toString().padStart(5) + ' (' + pct + '%)');
  });
  console.log('  Avg:', Math.round(scores.reduce((a,b)=>a+b,0)/scores.length));
  console.log('  Min:', Math.min(...scores), '| Max:', Math.max(...scores));
}

rebuild().catch(console.error);
