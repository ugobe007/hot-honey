require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Import the scoring function from god-score-v2-engine
const fs = require('fs');
const vm = require('vm');

// We'll inline a simplified version for testing
async function main() {
  console.log('\n🔄 RESCORING ALL STARTUPS\n');
  
  let allStartups = [];
  let offset = 0;
  const batchSize = 1000;
  
  // Fetch ALL startups with pagination
  while (true) {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('id, name, total_god_score, team_score, market_score, product_score, traction_score')
      .eq('status', 'approved')
      .range(offset, offset + batchSize - 1);
    
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    
    allStartups = allStartups.concat(data);
    console.log(`  Fetched ${allStartups.length} startups...`);
    offset += batchSize;
    if (data.length < batchSize) break;
  }
  
  console.log(`\n📊 Total: ${allStartups.length} startups`);
  
  // Analyze current distribution
  const buckets = {'0-20': 0, '21-35': 0, '36-50': 0, '51-70': 0, '71+': 0};
  let hasOldScores = 0;
  
  allStartups.forEach(s => {
    const sc = s.total_god_score || 0;
    if (sc <= 20) buckets['0-20']++;
    else if (sc <= 35) buckets['21-35']++;
    else if (sc <= 50) buckets['36-50']++;
    else if (sc <= 70) buckets['51-70']++;
    else buckets['71+']++;
    
    // Check for uncapped component scores (old data)
    if (s.team_score > 20 || s.market_score > 20 || s.product_score > 20 || s.traction_score > 20) {
      hasOldScores++;
    }
  });
  
  const scores = allStartups.map(s => s.total_god_score).filter(x => x);
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  
  console.log('\nCURRENT DISTRIBUTION:');
  Object.entries(buckets).forEach(([k, v]) => {
    const pct = (v / allStartups.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct / 2));
    console.log(`  ${k.padEnd(6)}: ${v.toString().padStart(4)} (${pct.padStart(5)}%) ${bar}`);
  });
  console.log(`\nAvg: ${avg.toFixed(1)}, Min: ${Math.min(...scores)}, Max: ${Math.max(...scores)}`);
  console.log(`\n⚠️  Startups with OLD uncapped scores: ${hasOldScores}`);
}

main();
