require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Sector inference from text
function inferSectors(text) {
  const t = (text || '').toLowerCase();
  const sectors = [];
  
  if (t.includes('ai') || t.includes('machine learn') || t.includes('llm') || t.includes('gpt')) sectors.push('AI/ML');
  if (t.includes('saas') || t.includes('software') || t.includes('platform')) sectors.push('SaaS');
  if (t.includes('fintech') || t.includes('payment') || t.includes('bank') || t.includes('lending')) sectors.push('FinTech');
  if (t.includes('health') || t.includes('medical') || t.includes('bio') || t.includes('pharma')) sectors.push('HealthTech');
  if (t.includes('climate') || t.includes('clean') || t.includes('carbon') || t.includes('sustain')) sectors.push('Climate');
  if (t.includes('energy') || t.includes('solar') || t.includes('battery') || t.includes('grid')) sectors.push('Energy');
  if (t.includes('robot') || t.includes('automat') || t.includes('drone')) sectors.push('Robotics');
  if (t.includes('space') || t.includes('satellite') || t.includes('rocket')) sectors.push('SpaceTech');
  if (t.includes('defense') || t.includes('security') || t.includes('cyber')) sectors.push('Defense');
  if (t.includes('crypto') || t.includes('blockchain') || t.includes('web3') || t.includes('defi')) sectors.push('Crypto');
  if (t.includes('enterprise') || t.includes('b2b')) sectors.push('Enterprise');
  if (t.includes('consumer') || t.includes('b2c') || t.includes('retail')) sectors.push('Consumer');
  if (t.includes('developer') || t.includes('api') || t.includes('devops')) sectors.push('Developer Tools');
  if (t.includes('gaming') || t.includes('game') || t.includes('esport')) sectors.push('Gaming');
  if (t.includes('edtech') || t.includes('education') || t.includes('learning')) sectors.push('EdTech');
  if (t.includes('proptech') || t.includes('real estate')) sectors.push('PropTech');
  if (t.includes('food') || t.includes('agri')) sectors.push('FoodTech');
  if (t.includes('legal') || t.includes('law')) sectors.push('LegalTech');
  if (t.includes('deep tech') || t.includes('quantum') || t.includes('hardware')) sectors.push('DeepTech');
  
  return sectors.length > 0 ? sectors : ['SaaS'];
}

// GOD score inference
function inferGodScore(startup) {
  let score = 35;
  const text = ((startup.name || '') + ' ' + (startup.tagline || '')).toLowerCase();
  
  if (startup.funding && startup.funding > 50000000) score += 15;
  else if (startup.funding && startup.funding > 10000000) score += 10;
  else if (startup.funding && startup.funding > 1000000) score += 5;
  
  if (startup.team_size && startup.team_size > 50) score += 8;
  else if (startup.team_size && startup.team_size > 10) score += 4;
  
  if (text.includes('ai') || text.includes('llm')) score += 5;
  if (text.includes('defense') || text.includes('space')) score += 3;
  
  if (startup.stage === 4) score += 10;
  else if (startup.stage === 3) score += 5;
  else if (startup.stage === 1) score -= 5;
  
  return Math.max(25, Math.min(64, score));
}

// Check if startup already exists
async function startupExists(name) {
  const { data } = await supabase
    .from('startup_uploads')
    .select('id')
    .ilike('name', name)
    .limit(1);
  return data && data.length > 0;
}

// Check if company is public/mature
function isPublicOrMature(name) {
  const publicCompanies = [
    'apple', 'google', 'microsoft', 'amazon', 'meta', 'facebook', 'netflix',
    'palantir', 'coinbase', 'stripe', 'roblox', 'square', 'block',
    'snowflake', 'datadog', 'mongodb', 'elastic', 'splunk', 'twilio',
    'uber', 'lyft', 'airbnb', 'doordash', 'instacart', 'robinhood',
    'tesla', 'rivian', 'lucid', 'nio', 'xpeng', 'li auto',
    'spacex', 'openai', 'anthropic', 'databricks', 'canva',
  ];
  return publicCompanies.some(c => name.toLowerCase().includes(c));
}

// Add a single startup
async function addStartup(startup) {
  if (!startup.name || startup.name.length < 2) return { skipped: true, reason: 'invalid name' };
  if (await startupExists(startup.name)) return { skipped: true, reason: 'exists' };
  if (isPublicOrMature(startup.name)) return { skipped: true, reason: 'public/mature' };
  
  const sectors = startup.sectors || inferSectors(startup.name + ' ' + (startup.tagline || ''));
  const godScore = startup.god_score || inferGodScore(startup);
  
  const { error } = await supabase.from('startup_uploads').insert({
    name: startup.name,
    tagline: startup.tagline || '',
    sectors: sectors,
    stage: startup.stage || 2,
    source_type: 'url',
    source_url: startup.source_url || '',
    status: 'approved',
    total_god_score: godScore,
    created_at: new Date().toISOString()
  });
  
  if (error) return { skipped: true, reason: error.message };
  return { added: true, godScore, sectors };
}

// Batch add startups
async function batchAdd(startups) {
  console.log('Processing', startups.length, 'startups...\n');
  
  let added = 0, skipped = 0;
  
  for (const s of startups) {
    const result = await addStartup(s);
    if (result.added) {
      added++;
      console.log('✓', s.name.padEnd(30), 'GOD:', result.godScore, '|', result.sectors.join(', '));
    } else {
      skipped++;
    }
  }
  
  console.log('\nAdded:', added, '| Skipped:', skipped);
  return { added, skipped };
}

// Generate matches for new startups
async function generateMatchesForNew() {
  // Find startups without matches
  const { data: allStartups } = await supabase
    .from('startup_uploads')
    .select('id')
    .eq('status', 'approved');
  
  const { data: matchedStartups } = await supabase
    .from('startup_investor_matches')
    .select('startup_id');
  
  const matchedIds = new Set((matchedStartups || []).map(m => m.startup_id));
  const unmatchedIds = (allStartups || []).filter(s => !matchedIds.has(s.id)).map(s => s.id);
  
  if (unmatchedIds.length === 0) {
    console.log('All startups have matches.');
    return;
  }
  
  console.log('Found', unmatchedIds.length, 'startups without matches. Generating...');
  
  // Load the unmatched startups
  let startups = [];
  for (let i = 0; i < unmatchedIds.length; i += 100) {
    const batch = unmatchedIds.slice(i, i + 100);
    const { data } = await supabase
      .from('startup_uploads')
      .select('*')
      .in('id', batch);
    if (data) startups = startups.concat(data);
  }
  
  if (startups.length === 0) {
    console.log('No startups to process.');
    return;
  }
  
  // Load all investors
  let allInvestors = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('investors')
      .select('*')
      .not('sectors', 'eq', '{}')
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    allInvestors = allInvestors.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  
  function normSector(sec) {
    const s = (sec || '').toLowerCase().trim();
    if (s.includes('ai') || s.includes('ml')) return 'ai';
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
    
    let sectorBonus = 0, matchCount = 0;
    for (const sec of sSec) {
      if (iSec.includes(sec)) { sectorBonus += 6; matchCount++; }
    }
    sectorBonus = Math.min(sectorBonus, 18);
    
    const iStages = (investor.stage || []).map(x => x.toLowerCase());
    const stageNames = ['idea', 'pre-seed', 'seed', 'series a', 'series b'];
    const sStage = stageNames[startup.stage || 2] || 'seed';
    let stageBonus = iStages.length > 0 
      ? (iStages.some(x => x.includes(sStage) || sStage.includes(x)) ? 8 : 0)
      : 4;
    
    const penalty = matchCount === 0 ? -5 : 0;
    return Math.round(Math.max(20, Math.min(god + sectorBonus + stageBonus + penalty, 95)) * 10) / 10;
  }
  
  const allMatches = [];
  for (const startup of startups) {
    const scored = allInvestors.map(inv => ({
      startup_id: startup.id,
      investor_id: inv.id,
      match_score: calcScore(startup, inv)
    }));
    scored.sort((a, b) => b.match_score - a.match_score);
    allMatches.push(...scored.slice(0, 10));
  }
  
  // Insert matches
  for (let i = 0; i < allMatches.length; i += 500) {
    await supabase.from('startup_investor_matches').insert(allMatches.slice(i, i + 500));
  }
  
  console.log('Generated', allMatches.length, 'matches for', startups.length, 'startups');
}

module.exports = { addStartup, batchAdd, generateMatchesForNew, inferSectors, inferGodScore };

if (require.main === module) {
  const testStartups = [
    { name: 'TestAI', tagline: 'AI-powered testing automation', stage: 2 },
  ];
  batchAdd(testStartups).then(() => generateMatchesForNew());
}
