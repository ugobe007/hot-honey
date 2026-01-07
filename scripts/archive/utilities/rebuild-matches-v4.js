require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Normalize sector to standard form
function normSector(sec) {
  const s = (sec || '').toLowerCase().trim();
  
  // AI/ML family
  if (s.includes('ai') || s.includes('ml') || s.includes('machine learn') || s.includes('artificial')) return 'ai';
  
  // SaaS/Software
  if (s.includes('saas') || s === 'software') return 'saas';
  
  // FinTech
  if (s.includes('fintech') || s.includes('financial') || s.includes('payment') || s.includes('banking') || s.includes('insur')) return 'fintech';
  
  // HealthTech
  if (s.includes('health') || s.includes('medical') || s.includes('biotech') || s.includes('pharma') || s.includes('bio')) return 'health';
  
  // Enterprise
  if (s.includes('enterprise') || s.includes('b2b')) return 'enterprise';
  
  // Consumer
  if (s.includes('consumer') || s.includes('b2c') || s.includes('retail') || s.includes('ecommerce')) return 'consumer';
  
  // Developer Tools
  if (s.includes('developer') || s.includes('devtool') || s.includes('devops') || s.includes('infrastructure')) return 'developer';
  
  // SpaceTech
  if (s.includes('space') || s.includes('aerospace') || s.includes('satellite')) return 'space';
  
  // Defense/Security
  if (s.includes('defense') || s.includes('security') || s.includes('cyber')) return 'defense';
  
  // Energy
  if (s.includes('energy') || s.includes('power') || s.includes('grid') || s.includes('solar') || s.includes('battery')) return 'energy';
  
  // Climate/CleanTech
  if (s.includes('climate') || s.includes('clean') || s.includes('green') || s.includes('sustain')) return 'climate';
  
  // Robotics
  if (s.includes('robot') || s.includes('automat') || s.includes('drone')) return 'robotics';
  
  // DeepTech
  if (s.includes('deep') || s.includes('quantum') || s.includes('material') || s.includes('hardware')) return 'deeptech';
  
  // Gaming
  if (s.includes('game') || s.includes('gaming') || s.includes('esport')) return 'gaming';
  
  // Crypto
  if (s.includes('crypto') || s.includes('blockchain') || s.includes('web3')) return 'crypto';
  
  // EdTech
  if (s.includes('edtech') || s.includes('education')) return 'edtech';
  
  // PropTech
  if (s.includes('proptech') || s.includes('real estate') || s.includes('property')) return 'proptech';
  
  return 'other';
}

function calcScore(startup, investor) {
  const god = startup.total_god_score || 40;
  
  // Normalize all sectors
  const sSec = [...new Set((startup.sectors || []).map(normSector).filter(s => s !== 'other'))];
  const iSec = [...new Set((investor.sectors || []).map(normSector).filter(s => s !== 'other'))];
  
  // Calculate sector overlap
  let sectorBonus = 0;
  let matchCount = 0;
  
  for (const sec of sSec) {
    if (iSec.includes(sec)) {
      sectorBonus += 6;
      matchCount++;
    }
  }
  sectorBonus = Math.min(sectorBonus, 18); // Max 3 sector matches
  
  // Stage bonus
  const iStages = (investor.stage || []).map(x => x.toLowerCase());
  const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
  const sStage = stageNames[startup.stage || 2] || 'seed';
  let stageBonus = 0;
  if (iStages.length > 0) {
    stageBonus = iStages.some(x => x.includes(sStage) || sStage.includes(x)) ? 8 : 0;
  } else {
    stageBonus = 4; // No stage preference = small bonus
  }
  
  // No sector match penalty
  const penalty = matchCount === 0 ? -5 : 0;
  
  // Final: GOD (25-64) + sector (0-18) + stage (0-8) - penalty (0-5) = 20-90
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
  console.log('REBUILDING MATCHES v4\n');

  const startups = await loadAll('startup_uploads', q => q.eq('status', 'approved'));
  console.log('Startups:', startups.length);
  
  const investors = await loadAll('investors', q => q.not('sectors', 'eq', '{}'));
  console.log('Investors:', investors.length);
  
  // Test normalization
  const testStartup = startups.find(s => s.name === 'Ascend Arc');
  const testInvestor = investors.find(i => i.sectors.some(sec => sec.toLowerCase().includes('space') || sec.toLowerCase().includes('clean')));
  
  if (testStartup && testInvestor) {
    console.log('\nTest match:');
    console.log('  Startup:', testStartup.name, '| Sectors:', testStartup.sectors);
    console.log('  Normalized:', [...new Set(testStartup.sectors.map(normSector))]);
    console.log('  Investor:', testInvestor.name, '| Sectors:', testInvestor.sectors.slice(0, 5));
    console.log('  Normalized:', [...new Set(testInvestor.sectors.map(normSector))]);
    console.log('  Score:', calcScore(testStartup, testInvestor));
  }

  // Clear existing
  console.log('\nClearing existing matches...');
  while (true) {
    const { data } = await supabase.from('startup_investor_matches').delete().gte('match_score', 0).select('id').limit(5000);
    if (!data || data.length === 0) break;
  }

  console.log('Generating matches...');
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
  console.log('Total:', allMatches.length);

  console.log('Inserting...');
  for (let i = 0; i < allMatches.length; i += 500) {
    await supabase.from('startup_investor_matches').insert(allMatches.slice(i, i + 500));
  }

  // Check distribution
  const { data: sample } = await supabase.from('startup_investor_matches').select('match_score').limit(5000);
  const scores = sample.map(m => m.match_score);
  
  const buckets = {'85+':0,'70-84':0,'55-69':0,'40-54':0,'<40':0};
  scores.forEach(x => {
    if(x>=85) buckets['85+']++;
    else if(x>=70) buckets['70-84']++;
    else if(x>=55) buckets['55-69']++;
    else if(x>=40) buckets['40-54']++;
    else buckets['<40']++;
  });
  
  console.log('\nFINAL DISTRIBUTION:');
  Object.entries(buckets).forEach(([r,c]) => {
    const pct = Math.round(c/scores.length*100);
    console.log('  ' + r.padEnd(8) + c.toString().padStart(5) + ' (' + pct + '%)');
  });
  console.log('  Avg:', Math.round(scores.reduce((a,b)=>a+b,0)/scores.length));
  console.log('  Min:', Math.min(...scores), '| Max:', Math.max(...scores));
}

rebuild().catch(console.error);
