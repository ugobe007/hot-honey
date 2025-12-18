const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function fixRSS() {
  console.log('\n🔧 FIXING RSS SOURCES...\n');
  
  // Get all sources
  const { data: sources } = await supabase.from('rss_sources').select('*');
  
  const active = sources.filter(s => s.active === true);
  const inactive = sources.filter(s => s.active === false);
  
  console.log('Current Status:');
  console.log('  Active:', active.length);
  console.log('  Inactive:', inactive.length);
  
  // Reactivate ALL sources
  const { error } = await supabase
    .from('rss_sources')
    .update({ active: true })
    .eq('active', false);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\n✅ Reactivated', inactive.length, 'RSS sources!');
  }
  
  // Final count
  const { data: final } = await supabase.from('rss_sources').select('*');
  const finalActive = final.filter(s => s.active === true);
  console.log('\nFinal Status:');
  console.log('  Active:', finalActive.length, '/', final.length, 'sources');
  console.log('\n🚀 RSS scraper should now find new startups!');
}

fixRSS().catch(console.error);
