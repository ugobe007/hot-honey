require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanup() {
  // Delete bad investor names
  const badNames = ['YanSenior Finance', 'sits on the (Panteracapital)', 'in new equity'];
  
  for (const name of badNames) {
    const { error, count } = await s.from('investors')
      .delete()
      .eq('name', name);
    
    if (!error) {
      console.log('Deleted:', name);
    }
  }
  
  // Find any other weird names
  const { data: weird } = await s.from('investors')
    .select('name')
    .or('name.ilike.%sits on%,name.ilike.%Senior Finance%,name.eq.the,name.eq.and,name.eq.of')
    .limit(10);
  
  console.log('\nRemaining weird names:', weird?.map(i => i.name) || 'none');
}
cleanup();
