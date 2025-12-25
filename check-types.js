require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Check distinct type values
  const { data: types, error } = await s.from('investors')
    .select('type')
    .limit(1000);
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  const typeCount = {};
  types.forEach(t => {
    typeCount[t.type || 'NULL'] = (typeCount[t.type || 'NULL'] || 0) + 1;
  });
  
  console.log('Investor type distribution:');
  Object.entries(typeCount).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log('  ' + type + ': ' + count);
  });
  
  // Check a sample investor to see all fields
  const { data: sample } = await s.from('investors')
    .select('id, name, type, firm, photo_url, bio, notable_investments')
    .limit(3);
  
  console.log('\nSample investors:');
  sample.forEach(inv => {
    console.log('  ' + inv.name);
    console.log('    type:', inv.type);
    console.log('    photo:', inv.photo_url ? 'YES' : 'NO');
    console.log('    notable:', inv.notable_investments ? JSON.stringify(inv.notable_investments).slice(0, 50) : 'NULL');
  });
}
check();
