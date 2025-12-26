require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get 5 random investors that would appear in matches
  const { data } = await s.from('investors')
    .select('name, firm, photo_url, bio, sectors, stage, check_size_min, check_size_max, notable_investments, geography_focus, active_fund_size, investment_thesis')
    .not('sectors', 'eq', '{}')
    .limit(10);
  
  console.log('SAMPLE INVESTOR DATA (what cards should display):\n');
  
  data.forEach((inv, i) => {
    console.log(`--- Investor ${i+1}: ${inv.name} ---`);
    console.log('  Firm:', inv.firm || 'NOT SET');
    console.log('  Photo:', inv.photo_url ? '✅ ' + inv.photo_url.substring(0, 40) + '...' : '❌ MISSING');
    console.log('  Bio:', inv.bio ? '✅ ' + inv.bio.substring(0, 50) + '...' : '❌ MISSING');
    console.log('  Sectors:', inv.sectors?.length > 0 ? '✅ ' + inv.sectors.slice(0, 3).join(', ') : '❌ MISSING');
    console.log('  Stage:', inv.stage?.length > 0 ? '✅ ' + inv.stage.join(', ') : '❌ MISSING');
    console.log('  Check Size:', inv.check_size_min || inv.check_size_max ? `✅ $${inv.check_size_min/1000000}M - $${inv.check_size_max/1000000}M` : '❌ MISSING');
    console.log('  Notable:', inv.notable_investments?.length > 0 ? '✅ ' + inv.notable_investments.slice(0, 3).join(', ') : '⚠️ None');
    console.log('  Geography:', inv.geography_focus?.length > 0 ? '✅ ' + inv.geography_focus.join(', ') : '⚠️ None');
    console.log('  Fund Size:', inv.active_fund_size ? '✅ $' + (inv.active_fund_size/1000000000).toFixed(1) + 'B' : '⚠️ None');
    console.log('');
  });
}
check();
