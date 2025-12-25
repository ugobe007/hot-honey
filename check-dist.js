require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get ALL startups in batches
  let allData = [];
  let offset = 0;
  
  while (true) {
    const { data } = await s.from('startup_uploads')
      .select('total_god_score, source_type')
      .eq('status', 'approved')
      .range(offset, offset + 999);
    
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  
  const scores = allData.map(x => x.total_god_score).filter(Boolean);
  
  const buckets = {'55+':0,'50-54':0,'45-49':0,'40-44':0,'35-39':0,'30-34':0,'<30':0};
  scores.forEach(x => {
    if(x>=55) buckets['55+']++;
    else if(x>=50) buckets['50-54']++;
    else if(x>=45) buckets['45-49']++;
    else if(x>=40) buckets['40-44']++;
    else if(x>=35) buckets['35-39']++;
    else if(x>=30) buckets['30-34']++;
    else buckets['<30']++;
  });
  
  console.log('GOD SCORE DISTRIBUTION:\n');
  Object.entries(buckets).forEach(([r,c]) => {
    const pct = scores.length ? Math.round(c/scores.length*100) : 0;
    const bar = '#'.repeat(Math.round(pct/2));
    console.log(r.padEnd(8) + c.toString().padStart(5) + ' (' + pct.toString().padStart(2) + '%) ' + bar);
  });
  
  console.log('\nTotal startups:', allData.length);
  
  // Check for low GOD scores specifically
  const lowScores = scores.filter(x => x < 40);
  console.log('Startups with GOD < 40:', lowScores.length);
  if (lowScores.length > 0) {
    console.log('Low scores:', lowScores.sort((a,b) => a-b).join(', '));
  }
}

check();
