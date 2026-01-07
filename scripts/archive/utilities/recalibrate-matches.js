require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function recalibrate() {
  console.log('Recalibrating match scores for better distribution...\n');

  // Current issue: GOD scores + sector bonuses are too high
  // Solution: Apply a scaling factor to spread scores 50-95 range
  
  const { data: matches } = await supabase
    .from('startup_investor_matches')
    .select('id, match_score')
    .gte('match_score', 60)
    .limit(5000);

  console.log('Matches to recalibrate:', matches.length);

  let updated = 0;
  
  for (const m of matches) {
    const oldScore = m.match_score;
    
    // Scale down: 99 -> 95, 90 -> 82, 80 -> 70, 70 -> 60
    // Formula: newScore = 50 + (oldScore - 60) * 0.9
    let newScore = Math.round(50 + (oldScore - 60) * 0.85);
    newScore = Math.max(50, Math.min(newScore, 95));
    
    if (newScore !== oldScore) {
      await supabase.from('startup_investor_matches')
        .update({ match_score: newScore })
        .eq('id', m.id);
      updated++;
    }
    
    if (updated % 500 === 0 && updated > 0) {
      process.stdout.write('\rUpdated: ' + updated);
    }
  }

  console.log('\nDone. Updated:', updated);

  // Check new distribution
  const { data: sample } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(1000);

  const sc = sample.map(m => m.match_score).filter(Boolean);
  const buckets = {'90+':0,'80-89':0,'70-79':0,'60-69':0,'50-59':0,'<50':0};
  
  sc.forEach(x => {
    if(x>=90) buckets['90+']++;
    else if(x>=80) buckets['80-89']++;
    else if(x>=70) buckets['70-79']++;
    else if(x>=60) buckets['60-69']++;
    else if(x>=50) buckets['50-59']++;
    else buckets['<50']++;
  });

  console.log('\nNEW DISTRIBUTION:');
  Object.entries(buckets).forEach(([r,c]) => {
    console.log(r.padEnd(8) + c.toString().padStart(5) + ' (' + Math.round(c/sc.length*100) + '%)');
  });
  console.log('Avg:', Math.round(sc.reduce((a,b)=>a+b,0)/sc.length));
}

recalibrate().catch(console.error);
