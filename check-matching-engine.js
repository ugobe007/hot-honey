require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkEngine() {
  console.log('=== MATCHING ENGINE ANALYSIS ===\n');

  // 1. Overall stats
  const { count: startupCount } = await supabase.from('startup_uploads').select('id', { count: 'exact', head: true }).eq('status', 'approved');
  const { count: investorCount } = await supabase.from('investors').select('id', { count: 'exact', head: true }).not('sectors', 'eq', '{}');
  const { count: matchCount } = await supabase.from('startup_investor_matches').select('id', { count: 'exact', head: true });

  console.log('OVERVIEW:');
  console.log('  Startups:', startupCount);
  console.log('  Investors:', investorCount);
  console.log('  Matches:', matchCount);
  console.log('  Matches per startup:', Math.round(matchCount / startupCount));

  // 2. Match score distribution
  console.log('\nMATCH SCORE DISTRIBUTION:');
  const buckets = [
    { name: '90-95 (Elite)', min: 90, max: 95 },
    { name: '85-89 (Strong)', min: 85, max: 89 },
    { name: '75-84 (Good)', min: 75, max: 84 },
    { name: '65-74 (Fair)', min: 65, max: 74 },
    { name: '55-64 (Moderate)', min: 55, max: 64 },
    { name: '45-54 (Low)', min: 45, max: 54 },
    { name: '<45 (Early)', min: 0, max: 44 },
  ];

  for (const b of buckets) {
    const { count } = await supabase.from('startup_investor_matches')
      .select('id', { count: 'exact', head: true })
      .gte('match_score', b.min)
      .lte('match_score', b.max);
    const pct = Math.round(count / matchCount * 100);
    console.log('  ' + b.name.padEnd(20) + count.toString().padStart(6) + ' (' + pct + '%)');
  }

  // 3. Top matches
  console.log('\nTOP 10 MATCHES:');
  const { data: topMatches } = await supabase.from('startup_investor_matches')
    .select('match_score, startup_id, investor_id')
    .order('match_score', { ascending: false })
    .limit(10);

  for (const m of topMatches) {
    const { data: st } = await supabase.from('startup_uploads').select('name, total_god_score, sectors').eq('id', m.startup_id).single();
    const { data: inv } = await supabase.from('investors').select('name').eq('id', m.investor_id).single();
    console.log('  ' + m.match_score.toString().padStart(2) + ' | ' + st.name.padEnd(25) + ' <-> ' + inv.name);
  }

  // 4. Sector coverage
  console.log('\nSECTOR COVERAGE (startups):');
  const { data: startups } = await supabase.from('startup_uploads').select('sectors').eq('status', 'approved');
  const sectorCounts = {};
  startups.forEach(s => {
    (s.sectors || []).forEach(sec => {
      const key = sec.toLowerCase();
      sectorCounts[key] = (sectorCounts[key] || 0) + 1;
    });
  });
  Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([sec, count]) => {
      const pct = Math.round(count / startups.length * 100);
      console.log('  ' + sec.padEnd(20) + count.toString().padStart(5) + ' (' + pct + '%)');
    });

  // 5. GOD score distribution
  console.log('\nGOD SCORE DISTRIBUTION:');
  const godBuckets = [
    { name: '60+ (Elite)', min: 60, max: 100 },
    { name: '50-59 (Strong)', min: 50, max: 59 },
    { name: '40-49 (Good)', min: 40, max: 49 },
    { name: '30-39 (Early)', min: 30, max: 39 },
    { name: '<30 (Very Early)', min: 0, max: 29 },
  ];

  for (const b of godBuckets) {
    const { count } = await supabase.from('startup_uploads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('total_god_score', b.min)
      .lte('total_god_score', b.max);
    const pct = Math.round(count / startupCount * 100);
    console.log('  ' + b.name.padEnd(20) + count.toString().padStart(5) + ' (' + pct + '%)');
  }

  // 6. Investor stage distribution
  console.log('\nINVESTOR STAGE FOCUS:');
  const { data: investors } = await supabase.from('investors').select('stage').not('sectors', 'eq', '{}');
  const stageCounts = {};
  investors.forEach(i => {
    (i.stage || []).forEach(st => {
      const key = st.toLowerCase();
      stageCounts[key] = (stageCounts[key] || 0) + 1;
    });
  });
  Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([stage, count]) => {
      console.log('  ' + stage.padEnd(15) + count.toString().padStart(5));
    });

  // 7. Match quality by sector
  console.log('\nAVG MATCH SCORE BY STARTUP SECTOR:');
  const sectorAvgs = {};
  const { data: allMatches } = await supabase.from('startup_investor_matches')
    .select('match_score, startup_id')
    .limit(5000);
  
  const startupMap = {};
  startups.forEach(s => { /* need id */ });
  
  // Simplified: just show overall avg
  const avgScore = allMatches.reduce((sum, m) => sum + m.match_score, 0) / allMatches.length;
  console.log('  Overall avg match score:', avgScore.toFixed(1));
}

checkEngine();
