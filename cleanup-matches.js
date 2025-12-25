require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanup() {
  console.log('Deleting low-quality matches (below 55)...');
  let total = 0;
  
  while (total < 200000) {
    const { data, error } = await s.from('startup_investor_matches').delete().lt('match_score', 55).select('id').limit(5000);
    if (error) { console.log('Error:', error.message); break; }
    if (data.length === 0) break;
    total += data.length;
    console.log('Deleted:', total);
  }
  
  console.log('Done. Total deleted:', total);
  
  const { count } = await s.from('startup_investor_matches').select('id', { count: 'exact', head: true });
  console.log('Remaining matches:', count);
}
cleanup();
