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

function calcScoreManual(startup, investor) {
  const god = startup.total_god_score || 40;
  const sSec = [...new Set((startup.sectors || []).map(normSector).filter(s => s !== 'other'))];
  const iSec = [...new Set((investor.sectors || []).map(normSector).filter(s => s !== 'other'))];
  
  let sectorBonus = 0;
  let matchCount = 0;
  const matches = [];
  
  for (const sec of sSec) {
    if (iSec.includes(sec)) {
      sectorBonus += 6;
      matchCount++;
      matches.push(sec);
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
  const final = Math.round(Math.max(20, Math.min(raw, 95)) * 10) / 10;
  
  return { god, sectorBonus, stageBonus, penalty, matches, final };
}

async function testMath() {
  console.log('=== TESTING MATCH MATH ===\n');
  
  const testStartups = ['Mistral AI', 'Anduril', 'LearnAI', 'Uniswap', 'Figure'];
  
  for (const name of testStartups) {
    const { data: startup } = await supabase
      .from('startup_uploads')
      .select('*')
      .ilike('name', name)
      .eq('status', 'approved')
      .single();
    
    if (!startup) {
      console.log('NOT FOUND:', name, '\n');
      continue;
    }
    
    const { data: match } = await supabase
      .from('startup_investor_matches')
      .select('match_score, investor_id')
      .eq('startup_id', startup.id)
      .order('match_score', { ascending: false })
      .limit(1)
      .single();
    
    if (!match) {
      console.log('NO MATCH FOR:', name, '\n');
      continue;
    }
    
    const { data: investor } = await supabase
      .from('investors')
      .select('*')
      .eq('id', match.investor_id)
      .single();
    
    const calc = calcScoreManual(startup, investor);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STARTUP:', startup.name, '| GOD:', startup.total_god_score);
    console.log('  Sectors:', startup.sectors.join(', '));
    console.log('INVESTOR:', investor.name);
    console.log('  Sectors:', (investor.sectors || []).slice(0, 5).join(', '));
    console.log('  Stages:', (investor.stage || []).join(', '));
    console.log('CALC: GOD(' + calc.god + ') + Sector(' + calc.sectorBonus + ') + Stage(' + calc.stageBonus + ') + Penalty(' + calc.penalty + ') = ' + calc.final);
    console.log('STORED:', match.match_score, calc.final === match.match_score ? '✓' : '✗ MISMATCH');
    console.log('');
  }
}

testMath();
