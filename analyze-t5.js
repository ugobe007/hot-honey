require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyze() {
  const { data } = await s.from('startup_uploads')
    .select('name, tagline, description, website, sectors')
    .eq('status', 'approved')
    .lt('total_god_score', 35)
    .limit(30);

  console.log('T5 STARTUPS - MISSING DATA ANALYSIS\n');
  
  let noTagline = 0, noDesc = 0, noWebsite = 0, placeholder = 0;
  
  data?.forEach(startup => {
    const hasDesc = startup.description && startup.description.length > 20;
    const hasWebsite = startup.website && startup.website.length > 5;
    const isPlaceholder = startup.tagline && startup.tagline.includes(' - ') && startup.tagline.includes('company');
    
    if (isPlaceholder) placeholder++;
    if (hasDesc === false) noDesc++;
    if (hasWebsite === false) noWebsite++;
    
    console.log(startup.name);
    console.log('  Tagline:', (startup.tagline || 'NONE').slice(0, 60));
    console.log('  Website:', startup.website || 'NONE');
    console.log('  Desc:', hasDesc ? 'YES' : 'NO');
    console.log('');
  });
  
  console.log('SUMMARY:');
  console.log('  Placeholder taglines:', placeholder);
  console.log('  Missing description:', noDesc);
  console.log('  Missing website:', noWebsite);
}

analyze();
