require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get any investor
  const { data, error } = await s.from('investors')
    .select('name, photo_url, location, linkedin_url, notable_investments, firm, bio')
    .limit(5);
  
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('Sample investors:');
  data.forEach(inv => {
    console.log('\n' + inv.name);
    console.log('  Firm:', inv.firm);
    console.log('  Photo:', inv.photo_url || 'NULL');
    console.log('  Location:', inv.location || 'NULL');
    console.log('  LinkedIn:', inv.linkedin_url || 'NULL');
    console.log('  Notable:', inv.notable_investments ? inv.notable_investments.slice(0, 3).join(', ') : 'NULL');
    console.log('  Bio:', inv.bio ? inv.bio.substring(0, 60) + '...' : 'NULL');
  });
  
  // Count enriched fields
  const { data: all } = await s.from('investors').select('photo_url, location, linkedin_url, notable_investments').limit(1000);
  
  let photos = 0, locations = 0, linkedins = 0, notables = 0;
  all.forEach(inv => {
    if (inv.photo_url) photos++;
    if (inv.location) locations++;
    if (inv.linkedin_url) linkedins++;
    if (inv.notable_investments && inv.notable_investments.length > 0) notables++;
  });
  
  console.log('\n\nEnriched counts (out of', all.length, '):');
  console.log('  Photos:', photos);
  console.log('  Locations:', locations);
  console.log('  LinkedIns:', linkedins);
  console.log('  Notable investments:', notables);
}

check();
