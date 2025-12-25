require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data } = await s.from('investors')
    .select('*')
    .ilike('name', 'Jay Parrish, Ph.D.')
    .single();
  
  console.log('Jay Parrish, Ph.D. full data:');
  console.log(JSON.stringify(data, null, 2));
}
check();
