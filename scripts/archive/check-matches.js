require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function addAndCheck() {
  // 1. Find startups without matches
  const { data: allStartups } = await s.from('startup_uploads').select('id').eq('status','approved');
  const { data: matched } = await s.from('startup_investor_matches').select('startup_id');
  const matchedSet = new Set(matched.map(m => m.startup_id));
  const unmatched = allStartups.filter(st => matchedSet.has(st.id) === false);

  console.log('=== ADDING UNMATCHED ===');
  console.log('Unmatched startups:', unmatched.length);

  if (unmatched.length > 0) {
    const jobs = unmatched.map(st => ({ startup_id: st.id, status: 'pending', attempts: 0 }));
    const { error } = await s.from('matching_queue').upsert(jobs, { onConflict: 'startup_id' });
    console.log('Added to queue:', error ? 'ERROR ' + error.message : 'SUCCESS');
  }

  // 2. Check match quality
  console.log('\n=== MATCH QUALITY ===');
  const { data: scores } = await s.from('startup_investor_matches').select('match_score').limit(50000);

  const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  let total = 0, sum = 0;
  scores.forEach(r => {
    const sc = r.match_score || 0;
    sum += sc; total++;
    if (sc <= 20) buckets['0-20']++;
    else if (sc <= 40) buckets['21-40']++;
    else if (sc <= 60) buckets['41-60']++;
    else if (sc <= 80) buckets['61-80']++;
    else buckets['81-100']++;
  });

  console.log('Score Distribution (50k sample):');
  Object.entries(buckets).forEach(([range, count]) => {
    const pct = (count/total*100).toFixed(1);
    const bar = '█'.repeat(Math.round(pct/2));
    console.log('  ' + range + ': ' + bar + ' ' + pct + '%');
  });
  console.log('  Average:', (sum/total).toFixed(1));
}
addAndCheck();
