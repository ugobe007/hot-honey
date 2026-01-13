const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Fetch all records with pagination to avoid the 1000-row limit
  let allStats = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data: batch } = await supabase.from('startup_uploads')
      .select('total_god_score, team_score, traction_score, market_score, vision_score')
      .eq('status', 'approved')
      .range(offset, offset + batchSize - 1);
    
    if (!batch || batch.length === 0) break;
    allStats = allStats.concat(batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  
  const stats = allStats;
  
  const scores = stats.map(s => s.total_god_score).filter(Boolean);
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  const sorted = [...scores].sort((a,b) => a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  
  // Distribution buckets
  const bands = {
    'Elite (80-100)': scores.filter(s => s >= 80).length,
    'Strong (60-79)': scores.filter(s => s >= 60 && s < 80).length,
    'Solid (40-59)': scores.filter(s => s >= 40 && s < 60).length,
    'Fair (30-39)': scores.filter(s => s >= 30 && s < 40).length,
    'Weak (20-29)': scores.filter(s => s >= 20 && s < 30).length,
    'Poor (0-19)': scores.filter(s => s < 20).length
  };
  
  console.log('\n📊 GOD SCORE DISTRIBUTION\n');
  console.log('Band             Count    %');
  console.log('─'.repeat(35));
  for (const [band, count] of Object.entries(bands)) {
    const pct = (count * 100 / scores.length).toFixed(1);
    console.log(`${band.padEnd(17)} ${String(count).padStart(5)}  ${pct.padStart(5)}%`);
  }
  
  console.log('─'.repeat(35));
  console.log(`Total:           ${scores.length}`);
  console.log(`\n📈 Summary:`);
  console.log(`   Average: ${avg.toFixed(1)}`);
  console.log(`   Median: ${median}`);
  console.log(`   Below 40: ${scores.filter(s => s < 40).length} (${(scores.filter(s => s < 40).length*100/scores.length).toFixed(1)}%)`);
  console.log(`   40+ (Solid): ${scores.filter(s => s >= 40).length} (${(scores.filter(s => s >= 40).length*100/scores.length).toFixed(1)}%)`);
  
  // Component averages
  const teamAvg = stats.map(s => s.team_score).filter(Boolean).reduce((a,b)=>a+b,0)/stats.length;
  const tractAvg = stats.map(s => s.traction_score).filter(Boolean).reduce((a,b)=>a+b,0)/stats.length;
  const mktAvg = stats.map(s => s.market_score).filter(Boolean).reduce((a,b)=>a+b,0)/stats.length;
  const visAvg = stats.map(s => s.vision_score).filter(Boolean).reduce((a,b)=>a+b,0)/stats.length;
  
  console.log(`\n📊 Component Averages:`);
  console.log(`   Team: ${teamAvg.toFixed(1)}`);
  console.log(`   Traction: ${tractAvg.toFixed(1)}`);
  console.log(`   Market: ${mktAvg.toFixed(1)}`);
  console.log(`   Vision: ${visAvg.toFixed(1)}`);
})();
