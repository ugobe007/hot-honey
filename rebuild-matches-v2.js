require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const SECTOR_WEIGHTS = {
  'ai': 1.5, 'saas': 1.5, 'fintech': 1.5, 'health': 1.5, 'robotics': 1.5,
  'space': 1.5, 'defense': 1.5, 'consumer': 1.3, 'enterprise': 1.3,
  'deeptech': 1.3, 'energy': 1.2, 'climate': 1.2, 'crypto': 1.0,
  'technology': 1.0, 'developer': 1.2
};

// More aggressive normalization that groups related sectors
function normalizeSector(sec) {
  const s = (sec || '').toLowerCase();
  
  // AI/ML family
  if (s.includes('ai') || s.includes('artificial') || s.includes('machine learning') || s.includes('ml') || s.includes('llm') || s.includes('gpt')) return 'ai';
  
  // SaaS/Software family
  if (s.includes('saas') || s.includes('software') || s.includes('cloud') || s.includes('platform')) return 'saas';
  
  // FinTech family
  if (s.includes('fintech') || s.includes('finance') || s.includes('payment') || s.includes('banking') || s.includes('insur')) return 'fintech';
  
  // HealthTech family
  if (s.includes('health') || s.includes('medical') || s.includes('biotech') || s.includes('pharma') || s.includes('life science')) return 'health';
  
  // Enterprise/B2B family
  if (s.includes('enterprise') || s.includes('b2b') || s.includes('business')) return 'enterprise';
  
  // Consumer family
  if (s.includes('consumer') || s.includes('b2c') || s.includes('retail') || s.includes('ecommerce')) return 'consumer';
  
  // Developer Tools
  if (s.includes('developer') || s.includes('devtool') || s.includes('api') || s.includes('infrastructure')) return 'developer';
  
  // Space/Aerospace
  if (s.includes('space') || s.includes('aerospace') || s.includes('satellite') || s.includes('rocket')) return 'space';
  
  // Defense/Security
  if (s.includes('defense') || s.includes('security') || s.includes('cyber') || s.includes('military')) return 'defense';
  
  // Energy
  if (s.includes('energy') || s.includes('power') || s.includes('grid') || s.includes('solar') || s.includes('battery') || s.includes('bess')) return 'energy';
  
  // Climate
  if (s.includes('climate') || s.includes('clean') || s.includes('green') || s.includes('sustain') || s.includes('carbon')) return 'climate';
  
  // Robotics
  if (s.includes('robot') || s.includes('automat') || s.includes('drone') || s.includes('hardware')) return 'robotics';
  
  // Crypto
  if (s.includes('crypto') || s.includes('blockchain') || s.includes('web3') || s.includes('defi')) return 'crypto';
  
  // Generic technology - maps to multiple sectors for matching
  if (s.includes('tech') || s.includes('internet') || s.includes('digital')) return 'technology';
  
  return 'other';
}

// Technology sector matches with most tech sectors
const TECHNOLOGY_MATCHES = ['ai', 'saas', 'fintech', 'enterprise', 'developer', 'consumer'];

function calcScore(startup, investor) {
  const god = startup.total_god_score || 40;
  const sSec = (startup.sectors || []).map(normalizeSector);
  const iSec = (investor.sectors || []).map(normalizeSector);
  
  let sectorScore = 0;
  let matchCount = 0;
  
  sSec.forEach(sec => {
    let hasMatch = false;
    
    // Direct match
    if (iSec.includes(sec)) {
      hasMatch = true;
    }
    // Technology matches with many sectors
    else if (sec === 'technology' && iSec.some(is => TECHNOLOGY_MATCHES.includes(is))) {
      hasMatch = true;
    }
    // Reverse - investor has technology
    else if (iSec.includes('technology') && TECHNOLOGY_MATCHES.includes(sec)) {
      hasMatch = true;
    }
    
    if (hasMatch) {
      sectorScore += 6 * (SECTOR_WEIGHTS[sec] || 1.0);
      matchCount++;
    }
  });
  
  sectorScore = Math.min(sectorScore, 24);
  
  // Stage alignment
  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  let stageScore = iStages.length > 0 ? (iStages.some(x => x.includes(sStage)) ? 10 : -5) : 5;
  
  // No match penalty
  const penalty = matchCount === 0 ? -10 : 0;
  
  const raw = god + sectorScore + stageScore + penalty;
  return Math.max(25, Math.min(raw, 95));
}

async function rebuild() {
  console.log('REBUILDING MATCHES v2\n');

  console.log('Step 1: Clearing old matches...');
  let deleted = 0;
  while (true) {
    const { data } = await supabase.from('startup_investor_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id').limit(5000);
    if (!data || data.length === 0) break;
    deleted += data.length;
  }
  console.log('  Deleted:', deleted);

  console.log('\nStep 2: Loading data...');
  const [st, inv] = await Promise.all([
    supabase.from('startup_uploads').select('id, name, total_god_score, sectors, stage').eq('status', 'approved'),
    supabase.from('investors').select('id, name, sectors, stage').not('sectors', 'eq', '{}')
  ]);
  const startups = st.data || [];
  const investors = inv.data || [];
  console.log('  Startups:', startups.length, '| Investors:', investors.length);

  // Test one calculation
  const testStartup = startups.find(s => s.total_god_score >= 60);
  const testInvestor = investors[0];
  if (testStartup) {
    const testScore = calcScore(testStartup, testInvestor);
    console.log('\n  Test:', testStartup.name, '(GOD', testStartup.total_god_score + ') vs', testInvestor.name, '= Score', testScore);
  }

  console.log('\nStep 3: Generating matches...');
  const allMatches = [];
  for (const startup of startups) {
    const scored = investors.map(inv => ({
      startup_id: startup.id,
      investor_id: inv.id,
      match_score: calcScore(startup, inv)
    }));
    scored.sort((a, b) => b.match_score - a.match_score);
    allMatches.push(...scored.slice(0, 15));
  }
  console.log('  Total:', allMatches.length);

  console.log('\nStep 4: Inserting...');
  let inserted = 0;
  for (let i = 0; i < allMatches.length; i += 100) {
    await supabase.from('startup_investor_matches').insert(allMatches.slice(i, i + 100));
    inserted += Math.min(100, allMatches.length - i);
  }
  console.log('  Inserted:', inserted);

  console.log('\nStep 5: Distribution...');
  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(2000);
  const scores = sample.map(m => m.match_score).filter(Boolean);
  
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
