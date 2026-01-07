require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test() {
  const { data: startup } = await supabase.from('startup_uploads').select('id').eq('status', 'approved').limit(1).single();
  const { data: investor } = await supabase.from('investors').select('id').limit(1).single();
  
  console.log('Startup:', startup?.id);
  console.log('Investor:', investor?.id);
  
  const { data, error } = await supabase.from('matches').insert({
    startup_id: startup.id,
    investor_id: investor.id,
    match_score: 75,
    match_reasons: { test: 'Test match' },
    status: 'pending'
  }).select();
  
  console.log('Insert result:', data);
  if (error) console.log('Insert error:', error);
  
  const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true });
  console.log('Total matches:', count);
}
test();
