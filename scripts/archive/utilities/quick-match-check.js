require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Count matches
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const { data } = await s.from('startup_investor_matches').select('id').range(i*100000, (i+1)*100000-1);
    if (!data || data.length === 0) break;
    total += data.length;
    console.log(`Batch ${i+1}: ${data.length} (total: ${total})`);
  }
  
  // Check suggested matches (what the UI shows)
  const { data: suggested } = await s.from('startup_investor_matches')
    .select('id')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .limit(1000);
  
  console.log('\nSuggested matches (score >= 35): ' + (suggested?.length || 0));
}
check();
