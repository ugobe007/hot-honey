require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function clearMatches() {
  console.log('Clearing matches in small batches...');
  let total = 0;
  
  for (let i = 0; i < 500; i++) {
    const { data, error } = await s.from('startup_investor_matches')
      .delete()
      .limit(2000)
      .gte('id', '00000000-0000-0000-0000-000000000000')
      .select('id');
    
    if (error) {
      console.log('Error:', error.message);
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    if (data === null || data.length === 0) {
      console.log('\nNo more matches to delete');
      break;
    }
    total += data.length;
    process.stdout.write('\r  Deleted: ' + total);
    
    // Small delay to avoid timeouts
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\nTotal deleted:', total);
  
  const { count } = await s.from('startup_investor_matches').select('id', { count: 'exact', head: true });
  console.log('Remaining:', count);
}

clearMatches();
