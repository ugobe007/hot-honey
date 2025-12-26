require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
  // Find the "in new equity" investor
  const { data: badName } = await s.from('investors')
    .select('id, name, firm, notable_investments')
    .ilike('name', '%in new equity%');
  
  console.log('Investors with "in new equity":', badName);
  
  // Check notable_investments format
  const { data: withNotable } = await s.from('investors')
    .select('id, name, notable_investments')
    .not('notable_investments', 'is', null)
    .limit(3);
  
  console.log('\nNotable investments format check:');
  withNotable.forEach(inv => {
    console.log(inv.name + ':', typeof inv.notable_investments, Array.isArray(inv.notable_investments));
    if (inv.notable_investments) {
      console.log('  First item:', inv.notable_investments[0], typeof inv.notable_investments[0]);
    }
  });
}
fix();
