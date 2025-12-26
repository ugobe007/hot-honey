require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function deleteBad() {
  const badNames = [
    'from Vista Equity',
    'and advice for (Firstround)',
    'boldicorn Ed Sim (Boldstart)',
    'ai Antoine Moyroud (Lsvp)',
    'stage VC fund',
    'service wealth management',
    'up shares where (Firstround)',
    'from our (A16zcrypto)',
    'launches debut fund'
  ];
  
  let deleted = 0;
  for (const name of badNames) {
    const { error } = await s.from('investors').delete().eq('name', name);
    if (!error) {
      console.log('Deleted:', name);
      deleted++;
    }
  }
  
  console.log('\nDeleted', deleted, 'bad records');
  
  const { count } = await s.from('investors').select('id', { count: 'exact', head: true });
  console.log('Remaining investors:', count);
}
deleteBad();
