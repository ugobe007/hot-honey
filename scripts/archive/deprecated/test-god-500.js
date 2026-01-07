require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  // Get 500 random startups
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, vision_score, market_score, traction_score, team_score, sectors, description, website')
    .eq('status', 'approved')
    .limit(500);

  console.log('\n=== GOD SCORE ANALYSIS (n=' + startups.length + ') ===\n');

  // Distribution
  const buckets = {'0-15': [], '16-25': [], '26-35': [], '36-50': [], '51-70': [], '71+': []};
  startups.forEach(s => {
    const sc = s.total_god_score || 0;
    if (sc <= 15) buckets['0-15'].push(s);
    else if (sc <= 25) buckets['16-25'].push(s);
    else if (sc <= 35) buckets['26-35'].push(s);
    else if (sc <= 50) buckets['36-50'].push(s);
    else if (sc <= 70) buckets['51-70'].push(s);
    else buckets['71+'].push(s);
  });

  console.log('DISTRIBUTION:');
  Object.entries(buckets).forEach(([k, v]) => {
    const pct = (v.length / startups.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${k.padEnd(6)}: ${v.length.toString().padStart(3)} (${pct.padStart(5)}%) ${bar}`);
  });

  const scores = startups.map(s => s.total_god_score).filter(x => x);
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  console.log(`\nAvg: ${avg.toFixed(1)}, Min: ${Math.min(...scores)}, Max: ${Math.max(...scores)}`);

  // Show examples from each tier
  console.log('\n--- TIER C: SPARSE DATA (0-20) ---');
  buckets['0-15'].concat(buckets['16-25'].filter(s => s.total_god_score <= 20)).slice(0, 5).forEach(s => {
    console.log(`${s.name.substring(0,25).padEnd(27)}: ${s.total_god_score.toString().padStart(2)} | V:${s.vision_score} M:${s.market_score} Tr:${s.traction_score} T:${s.team_score}`);
    console.log(`  sectors: ${(s.sectors || []).join(', ') || 'none'}`);
    console.log(`  desc: ${(s.description || '').substring(0,60) || '(empty)'}...`);
  });

  console.log('\n--- TIER B: SOME DATA (21-35) ---');
  buckets['26-35'].slice(0, 5).forEach(s => {
    console.log(`${s.name.substring(0,25).padEnd(27)}: ${s.total_god_score.toString().padStart(2)} | V:${s.vision_score} M:${s.market_score} Tr:${s.traction_score} T:${s.team_score}`);
    console.log(`  sectors: ${(s.sectors || []).join(', ') || 'none'}`);
    console.log(`  desc: ${(s.description || '').substring(0,60) || '(empty)'}...`);
  });

  console.log('\n--- TIER A: RICH DATA (36-50) ---');
  buckets['36-50'].slice(0, 5).forEach(s => {
    console.log(`${s.name.substring(0,25).padEnd(27)}: ${s.total_god_score.toString().padStart(2)} | V:${s.vision_score} M:${s.market_score} Tr:${s.traction_score} T:${s.team_score}`);
    console.log(`  sectors: ${(s.sectors || []).join(', ') || 'none'}`);
    console.log(`  desc: ${(s.description || '').substring(0,60) || '(empty)'}...`);
  });

  console.log('\n--- TOP PERFORMERS (51+) ---');
  buckets['51-70'].concat(buckets['71+']).slice(0, 5).forEach(s => {
    console.log(`${s.name.substring(0,25).padEnd(27)}: ${s.total_god_score.toString().padStart(2)} | V:${s.vision_score} M:${s.market_score} Tr:${s.traction_score} T:${s.team_score}`);
    console.log(`  sectors: ${(s.sectors || []).join(', ') || 'none'}`);
    console.log(`  desc: ${(s.description || '').substring(0,60) || '(empty)'}...`);
  });

  // Component score analysis
  console.log('\n--- COMPONENT SCORE RANGES ---');
  const vScores = startups.map(s => s.vision_score || 0);
  const mScores = startups.map(s => s.market_score || 0);
  const trScores = startups.map(s => s.traction_score || 0);
  const tScores = startups.map(s => s.team_score || 0);
  
  console.log(`  Vision/Content:  avg ${(vScores.reduce((a,b)=>a+b,0)/vScores.length).toFixed(1)}, max ${Math.max(...vScores)}`);
  console.log(`  Market:          avg ${(mScores.reduce((a,b)=>a+b,0)/mScores.length).toFixed(1)}, max ${Math.max(...mScores)}`);
  console.log(`  Traction:        avg ${(trScores.reduce((a,b)=>a+b,0)/trScores.length).toFixed(1)}, max ${Math.max(...trScores)}`);
  console.log(`  Team:            avg ${(tScores.reduce((a,b)=>a+b,0)/tScores.length).toFixed(1)}, max ${Math.max(...tScores)}`);
}

test();
