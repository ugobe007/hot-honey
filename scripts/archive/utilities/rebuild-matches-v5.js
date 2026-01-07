require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Comprehensive sector normalization
function normSector(sec) {
  const s = (sec || '').toLowerCase().trim();
  
  // AI/ML family
  if (s.includes('ai') || s.includes('ml') || s.includes('machine learn') || s.includes('artificial') || s.includes('llm') || s.includes('gpt')) return 'ai';
  
  // SaaS/Software
  if (s.includes('saas') || s === 'software' || s.includes('cloud computing')) return 'saas';
  
  // FinTech
  if (s.includes('fintech') || s.includes('financial') || s.includes('payment') || s.includes('banking') || s.includes('insur') || s.includes('defi')) return 'fintech';
  
  // HealthTech
  if (s.includes('health') || s.includes('medical') || s.includes('biotech') || s.includes('pharma') || s.includes('bio') || s.includes('clinical') || s.includes('telemedicine')) return 'health';
  
  // Enterprise
  if (s.includes('enterprise') || s.includes('b2b')) return 'enterprise';
  
  // Consumer
  if (s.includes('consumer') || s.includes('b2c') || s.includes('retail') || s.includes('ecommerce') || s.includes('e-commerce') || s.includes('marketplace')) return 'consumer';
  
  // Developer Tools
  if (s.includes('developer') || s.includes('devtool') || s.includes('devops') || s.includes('infrastructure') || s.includes('api') || s.includes('cloud')) return 'developer';
  
  // SpaceTech
  if (s.includes('space') || s.includes('aerospace') || s.includes('satellite') || s.includes('aviation')) return 'space';
  
  // Defense/Security
  if (s.includes('defense') || s.includes('security') || s.includes('cyber')) return 'defense';
  
  // Energy
  if (s.includes('energy') || s.includes('power') || s.includes('grid') || s.includes('solar') || s.includes('battery')) return 'energy';
  
  // Climate/CleanTech
  if (s.includes('climate') || s.includes('clean') || s.includes('green') || s.includes('sustain')) return 'climate';
  
  // Robotics
  if (s.includes('robot') || s.includes('automat') || s.includes('drone')) return 'robotics';
  
  // DeepTech/Materials
  if (s.includes('deep') || s.includes('quantum') || s.includes('material') || s.includes('hardware')) return 'deeptech';
  
  // Gaming
  if (s.includes('game') || s.includes('gaming') || s.includes('esport')) return 'gaming';
  
  // Crypto/Web3
  if (s.includes('crypto') || s.includes('blockchain') || s.includes('web3') || s.includes('token') || s.includes('nft')) return 'crypto';
  
  // EdTech
  if (s.includes('edtech') || s.includes('education') || s.includes('learning') || s.includes('school')) return 'education';
  
  // PropTech
  if (s.includes('proptech') || s.includes('real estate') || s.includes('property')) return 'proptech';
  
  // FoodTech
  if (s.includes('food') || s.includes('agri') || s.includes('farm') || s.includes('beverage')) return 'food';
  
  // LegalTech
  if (s.includes('legal') || s.includes('law') || s.includes('compliance')) return 'legal';
  
  // HR Tech
  if (s.includes('hr') || s.includes('human resource') || s.includes('recruit') || s.includes('hiring')) return 'hr';
  
  // Delivery/Logistics
  if (s.includes('delivery') || s.includes('logistics') || s.includes('supply chain')) return 'logistics';
  
  // Mobile
  if (s.includes('mobile') || s.includes('app')) return 'mobile';
  
  // Content/Media
  if (s.includes('content') || s.includes('media') || s.includes('entertainment')) return 'media';
  
  return 'other';
}

function calcScore(startup, investor) {
  const god = startup.total_god_score || 40;
  
  const sSec = [...new Set((startup.sectors || []).map(normSector).filter(s => s !== 'other'))];
  const iSec = [...new Set((investor.sectors || []).map(normSector).filter(s => s !== 'other'))];
  
  // Sector overlap
  let sectorBonus = 0;
  let matchCount = 0;
  
  for (const sec of sSec) {
    if (iSec.includes(sec)) {
      sectorBonus += 6;
      matchCount++;
    }
  }
  sectorBonus = Math.min(sectorBonus, 18);
  
  // Stage bonus
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
  console.log('REBUILDING MATCHES v5 - Better normalization\n');

  const startups = await loadAll('startup_uploads', q => q.eq('status', 'approved'));
  const investors = await loadAll('investors', q => q.not('sectors', 'eq', '{}'));
  console.log('Startups:', startups.length, '| Investors:', investors.length);

  // Test normalization
  const testCases = [
    { raw: 'edtech', expected: 'education' },
    { raw: 'web3', expected: 'crypto' },
    { raw: 'devops', expected: 'developer' },
    { raw: 'b2c', expected: 'consumer' },
    { raw: 'foodtech', expected: 'food' },
    { raw: 'legal tech', expected: 'legal' },
  ];
  
  console.log('\nNormalization tests:');
  testCases.forEach(t => {
    const result = normSector(t.raw);
    const ok = result === t.expected;
    console.log('  ' + t.raw.padEnd(15) + ' -> ' + result.padEnd(12) + (ok ? '✓' : '✗ expected ' + t.expected));
  });

  // Clear and rebuild
  console.log('\nClearing...');
  while (true) {
    const { data } = await supabase.from('startup_investor_matches').delete().gte('match_score', 0).select('id').limit(5000);
    if (!data || data.length === 0) break;
  }

  console.log('Generating...');
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

  console.log('Inserting', allMatches.length, 'matches...');
  for (let i = 0; i < allMatches.length; i += 500) {
    await supabase.from('startup_investor_matches').insert(allMatches.slice(i, i + 500));
  }

  // Distribution
  const buckets = [
    { name: '85+', min: 85, max: 100 },
    { name: '70-84', min: 70, max: 84 },
    { name: '55-69', min: 55, max: 69 },
    { name: '40-54', min: 40, max: 54 },
    { name: '<40', min: 0, max: 39 }
  ];
  
  console.log('\nFINAL DISTRIBUTION:');
  for (const b of buckets) {
    const { count } = await supabase.from('startup_investor_matches')
      .select('id', { count: 'exact', head: true })
      .gte('match_score', b.min)
      .lte('match_score', b.max);
    console.log('  ' + b.name.padEnd(8) + count.toString().padStart(6));
  }
}

rebuild().catch(console.error);
