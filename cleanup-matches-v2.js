require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanup() {
  console.log('Deleting low-quality matches in small batches...');
  let total = 0;
  
  for (let i = 0; i < 100; i++) {
    const { data, error } = await s.from('startup_investor_matches').delete().lt('match_score', 50).select('id').limit(500);
    if (error) { console.log('Error:', error.message); continue; }
    if (data.length === 0) { console.log('No more to delete'); break; }
    total += data.length;
    process.stdout.write('\rDeleted: ' + total);
  }
  
  console.log('\nDone. Total deleted:', total);
}
cleanup();
