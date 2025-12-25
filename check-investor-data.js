require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkInvestorData() {
  const { data: investors } = await s.from('investors')
    .select('*')
    .limit(10);
  
  console.log('SAMPLE INVESTOR DATA:\n');
  
  investors.forEach(inv => {
    console.log('Name:', inv.name);
    console.log('  Firm:', inv.firm || 'MISSING');
    console.log('  Email:', inv.email || 'MISSING');
    console.log('  LinkedIn:', inv.linkedin_url || 'MISSING');
    console.log('  Twitter:', inv.twitter_url || 'MISSING');
    console.log('  Photo:', inv.photo_url ? 'YES' : 'MISSING');
    console.log('  Bio:', inv.bio ? inv.bio.substring(0, 50) + '...' : 'MISSING');
    console.log('  Sectors:', (inv.sectors || []).join(', ') || 'MISSING');
    console.log('  Stage:', (inv.stage || []).join(', ') || 'MISSING');
    console.log('  Check Size:', inv.check_size_min, '-', inv.check_size_max || 'MISSING');
    console.log('  Location:', inv.location || 'MISSING');
    console.log('');
  });
  
  // Count missing fields
  const { data: all } = await s.from('investors').select('*').not('sectors', 'eq', '{}');
  
  const missing = {
    firm: 0, email: 0, linkedin: 0, twitter: 0, photo: 0, bio: 0, check_size: 0, location: 0
  };
  
  all.forEach(inv => {
    if (!inv.firm) missing.firm++;
    if (!inv.email) missing.email++;
    if (!inv.linkedin_url) missing.linkedin++;
    if (!inv.twitter_url) missing.twitter++;
    if (!inv.photo_url) missing.photo++;
    if (!inv.bio) missing.bio++;
    if (!inv.check_size_min && !inv.check_size_max) missing.check_size++;
    if (!inv.location) missing.location++;
  });
  
  console.log('MISSING DATA SUMMARY (out of', all.length, 'investors):');
  Object.entries(missing).forEach(([field, count]) => {
    const pct = Math.round(count / all.length * 100);
    console.log('  ' + field.padEnd(12) + count.toString().padStart(5) + ' (' + pct + '% missing)');
  });
}

checkInvestorData();
