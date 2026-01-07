require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Search for Parrish
  const { data: parrish } = await s.from('investors')
    .select('name, firm, photo_url, bio, notable_investments')
    .ilike('name', '%Parrish%');
  
  console.log('Investors with Parrish:', parrish?.length || 0);
  if (parrish) parrish.forEach(i => console.log(' -', i.name));
  
  // Get a random sample of investors to see data quality
  const { data: sample } = await s.from('investors')
    .select('name, firm, photo_url, bio, notable_investments, investment_thesis')
    .limit(10);
  
  console.log('\n10 Sample investors:');
  sample.forEach(inv => {
    console.log('\n' + inv.name);
    console.log('  Photo:', inv.photo_url ? 'YES' : 'NO');
    console.log('  Bio:', inv.bio ? inv.bio.substring(0, 40) + '...' : 'NO');
    console.log('  Notable:', inv.notable_investments ? inv.notable_investments.slice(0, 2).join(', ') : 'NO');
    console.log('  Thesis:', inv.investment_thesis ? inv.investment_thesis.substring(0, 40) + '...' : 'NO');
  });
}
check();
