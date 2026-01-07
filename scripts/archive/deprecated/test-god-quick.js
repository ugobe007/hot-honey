require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  // Get 50 random startups with varied scores
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, team_score, market_score, product_score, traction_score, sectors, stage, team_size, has_technical_cofounder, is_launched, has_demo, mrr, arr, customer_count, description, tagline')
    .eq('status', 'approved')
    .limit(50);

  console.log('\n=== GOD SCORE ANALYSIS (n=50) ===\n');

  // Distribution
  const buckets = {'0-20': [], '21-35': [], '36-50': [], '51-70': [], '71+': []};
  startups.forEach(s => {
    const sc = s.total_god_score || 0;
    if (sc <= 20) buckets['0-20'].push(s);
    else if (sc <= 35) buckets['21-35'].push(s);
    else if (sc <= 50) buckets['36-50'].push(s);
    else if (sc <= 70) buckets['51-70'].push(s);
    else buckets['71+'].push(s);
  });

  console.log('DISTRIBUTION:');
  Object.entries(buckets).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.length} (${(v.length/50*100).toFixed(0)}%)`);
  });

  const scores = startups.map(s => s.total_god_score).filter(x => x);
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  console.log(`\nAvg: ${avg.toFixed(1)}, Min: ${Math.min(...scores)}, Max: ${Math.max(...scores)}`);

  // Show examples from each bucket
  console.log('\n--- LOW SCORES (0-20) ---');
  buckets['0-20'].slice(0, 3).forEach(s => {
    console.log(`${s.name}: ${s.total_god_score} | T:${s.team_score} M:${s.market_score} P:${s.product_score} Tr:${s.traction_score}`);
    console.log(`  team_size=${s.team_size}, tech_cofounder=${s.has_technical_cofounder}, launched=${s.is_launched}, demo=${s.has_demo}`);
    console.log(`  mrr=${s.mrr}, customers=${s.customer_count}, sectors=${(s.sectors||[]).join(',')}`);
  });

  console.log('\n--- MID SCORES (36-50) ---');
  buckets['36-50'].slice(0, 3).forEach(s => {
    console.log(`${s.name}: ${s.total_god_score} | T:${s.team_score} M:${s.market_score} P:${s.product_score} Tr:${s.traction_score}`);
    console.log(`  team_size=${s.team_size}, tech_cofounder=${s.has_technical_cofounder}, launched=${s.is_launched}, demo=${s.has_demo}`);
    console.log(`  mrr=${s.mrr}, customers=${s.customer_count}, sectors=${(s.sectors||[]).join(',')}`);
  });

  console.log('\n--- HIGH SCORES (71+) ---');
  buckets['71+'].slice(0, 3).forEach(s => {
    console.log(`${s.name}: ${s.total_god_score} | T:${s.team_score} M:${s.market_score} P:${s.product_score} Tr:${s.traction_score}`);
    console.log(`  team_size=${s.team_size}, tech_cofounder=${s.has_technical_cofounder}, launched=${s.is_launched}, demo=${s.has_demo}`);
    console.log(`  mrr=${s.mrr}, customers=${s.customer_count}, sectors=${(s.sectors||[]).join(',')}`);
  });

  // Data completeness check
  console.log('\n--- DATA COMPLETENESS ---');
  let hasTeam = 0, hasTech = 0, hasLaunch = 0, hasDemo = 0, hasMrr = 0, hasCust = 0;
  startups.forEach(s => {
    if (s.team_size > 0) hasTeam++;
    if (s.has_technical_cofounder) hasTech++;
    if (s.is_launched) hasLaunch++;
    if (s.has_demo) hasDemo++;
    if (s.mrr > 0) hasMrr++;
    if (s.customer_count > 0) hasCust++;
  });
  console.log(`  team_size: ${hasTeam}/50 (${hasTeam*2}%)`);
  console.log(`  tech_cofounder: ${hasTech}/50 (${hasTech*2}%)`);
  console.log(`  is_launched: ${hasLaunch}/50 (${hasLaunch*2}%)`);
  console.log(`  has_demo: ${hasDemo}/50 (${hasDemo*2}%)`);
  console.log(`  mrr > 0: ${hasMrr}/50 (${hasMrr*2}%)`);
  console.log(`  customers > 0: ${hasCust}/50 (${hasCust*2}%)`);
}

test();
