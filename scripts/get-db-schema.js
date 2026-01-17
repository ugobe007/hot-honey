const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

async function getSchema() {
  // Get startup_uploads sample
  const { data: su, error: suErr } = await supabase.from('startup_uploads').select('*').limit(1);
  console.log('=== startup_uploads columns ===');
  if (su && su[0]) {
    console.log(Object.keys(su[0]).join('\n'));
  } else {
    console.log('Error:', suErr);
  }
  
  // Get investors sample
  const { data: inv, error: invErr } = await supabase.from('investors').select('*').limit(1);
  console.log('\n=== investors columns ===');
  if (inv && inv[0]) {
    console.log(Object.keys(inv[0]).join('\n'));
  } else {
    console.log('Error:', invErr);
  }
  
  // Get startup_investor_matches sample
  const { data: matches, error: matchErr } = await supabase.from('startup_investor_matches').select('*').limit(1);
  console.log('\n=== startup_investor_matches columns ===');
  if (matches && matches[0]) {
    console.log(Object.keys(matches[0]).join('\n'));
  } else {
    console.log('Error:', matchErr);
  }
  
  // Check for FOMO tables
  const { data: fomo, error: fomoErr } = await supabase.from('startup_fomo_triggers').select('*').limit(1);
  console.log('\n=== startup_fomo_triggers columns ===');
  if (fomo && fomo[0]) {
    console.log(Object.keys(fomo[0]).join('\n'));
  } else {
    console.log('Table may not exist or empty:', fomoErr?.message || 'no data');
  }
  
  const { data: fomoRoll, error: fomoRollErr } = await supabase.from('startup_fomo_rolling').select('*').limit(1);
  console.log('\n=== startup_fomo_rolling columns ===');
  if (fomoRoll && fomoRoll[0]) {
    console.log(Object.keys(fomoRoll[0]).join('\n'));
  } else {
    console.log('Table may not exist or empty:', fomoRollErr?.message || 'no data');
  }
  
  // Get counts
  const { count: suCount } = await supabase.from('startup_uploads').select('*', { count: 'exact', head: true });
  const { count: invCount } = await supabase.from('investors').select('*', { count: 'exact', head: true });
  const { count: matchCount } = await supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true });
  
  console.log('\n=== Table Counts ===');
  console.log(`startup_uploads: ${suCount}`);
  console.log(`investors: ${invCount}`);
  console.log(`startup_investor_matches: ${matchCount}`);
}

getSchema().then(() => process.exit(0));
