require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'ai': 1.5, 'saas': 1.5, 'fintech': 1.5, 'health': 1.5, 'robotics': 1.5,
  'space': 1.5, 'defense': 1.5, 'consumer': 1.3, 'deeptech': 1.3,
  'materials': 1.3, 'energy': 1.2, 'climate': 1.2, 'crypto': 1.0,
  'gaming': 0.8, 'edtech': 0.8
};

function norm(sec) {
  const s = (sec || '').toLowerCase();
  if (s.includes('ai') || s.includes('ml')) return 'ai';
  if (s.includes('saas') || s.includes('software')) return 'saas';
  if (s.includes('fintech') || s.includes('finance')) return 'fintech';
  if (s.includes('health')) return 'health';
  if (s.includes('robot')) return 'robotics';
  if (s.includes('space') || s.includes('aerospace')) return 'space';
  if (s.includes('defense')) return 'defense';
  if (s.includes('consumer')) return 'consumer';
  if (s.includes('deep')) return 'deeptech';
  if (s.includes('material')) return 'materials';
  if (s.includes('energy') || s.includes('bess')) return 'energy';
  if (s.includes('climate') || s.includes('clean')) return 'climate';
  if (s.includes('crypto') || s.includes('web3')) return 'crypto';
  if (s.includes('gaming')) return 'gaming';
  if (s.includes('edtech') || s.includes('education')) return 'edtech';
  return 'other';
}

function calcScore(startup, investor) {
  const god = startup.total_god_score || 45;
  const sSec = (startup.sectors || []).map(norm);
  const iSec = (investor.sectors || []).map(norm);
  
  // Sector alignment (0-20 points)
  let sectorScore = 0;
  let matchCount = 0;
  sSec.forEach(sec => {
    if (iSec.includes(sec)) {
      sectorScore += 5 * (SECTOR_WEIGHTS[sec] || 1.0);
      matchCount++;
    }
  });
  sectorScore = Math.min(sectorScore, 20);
  
  // Stage alignment (-10 to +10)
  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  let stageScore = 0;
  if (iStages.length > 0) {
    stageScore = iStages.some(x => x.includes(sStage)) ? 10 : -10;
  }
  
  // No sector match penalty
  const noMatchPenalty = matchCount === 0 ? -15 : 0;
  
  // Final score: GOD is primary driver
  const raw = god + sectorScore + stageScore + noMatchPenalty;
  return Math.max(25, Math.min(raw, 95));
}

async function rebuild() {
  console.log('REBUILDING MATCHES FROM SCRATCH\n');
  
  // Step 1: Clear all matches
  console.log('Step 1: Clearing old matches...');
  let deleted = 0;
  while (true) {
    const { data } = await supabase.from('startup_investor_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id').limit(5000);
    if (!data || data.length === 0) break;
    deleted += data.length;
    process.stdout.write('\r  Deleted: ' + deleted);
  }
  console.log('\n  Total deleted:', deleted);
  
  // Step 2: Load data
  console.log('\nStep 2: Loading startups and investors...');
  const [st, inv] = await Promise.all([
    supabase.from('startup_uploads').select('id, name, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, name, sectors, stage').not('sectors', 'eq', '{}')
  ]);
  const startups = st.data || [];
  const investors = inv.data || [];
  console.log('  Startups:', startups.length, '| Investors:', investors.length);
  
  // Step 3: Generate top 15 matches per startup
  console.log('\nStep 3: Generating quality matches...');
  const allMatches = [];
  
  for (const startup of startups) {
    // Score all investors for this startup
    const scored = investors.map(inv => ({
      startup_id: startup.id,
      investor_id: inv.id,
      match_score: calcScore(startup, inv)
    }));
    
    // Sort and keep top 15
    scored.sort((a, b) => b.match_score - a.match_score);
    allMatches.push(...scored.slice(0, 15));
  }
  
  console.log('  Total matches to insert:', allMatches.length);
  
  // Step 4: Insert in batches
  console.log('\nStep 4: Inserting matches...');
  let inserted = 0;
  for (let i = 0; i < allMatches.length; i += 100) {
    const batch = allMatches.slice(i, i + 100);
    await supabase.from('startup_investor_matches').insert(batch);
    inserted += batch.length;
    if (inserted % 1000 === 0) process.stdout.write('\r  Inserted: ' + inserted);
  }
  console.log('\n  Total inserted:', inserted);
  
  // Step 5: Check distribution
  console.log('\nStep 5: Checking distribution...');
  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(2000);
  const sc = sample.map(m => m.match_score).filter(Boolean);
  
  const buckets = {'85+':0,'70-84':0,'55-69':0,'40-54':0,'<40':0};
  sc.forEach(x => {
    if(x>=85) buckets['85+']++;
    else if(x>=70) buckets['70-84']++;
    else if(x>=55) buckets['55-69']++;
    else if(x>=40) buckets['40-54']++;
    else buckets['<40']++;
  });
  
  console.log('\nFINAL DISTRIBUTION:');
  Object.entries(buckets).forEach(([r,c]) => {
    const pct = Math.round(c/sc.length*100);
    const bar = '█'.repeat(Math.round(pct/2));
    console.log('  ' + r.padEnd(8) + c.toString().padStart(5) + ' (' + pct.toString().padStart(2) + '%) ' + bar);
  });
  console.log('\n  Avg:', Math.round(sc.reduce((a,b)=>a+b,0)/sc.length));
  console.log('  Min:', Math.min(...sc), '| Max:', Math.max(...sc));
}

rebuild().catch(console.error);
