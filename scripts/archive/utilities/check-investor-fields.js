require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get column names from investors table
  const { data } = await s.from('investors').select('*').limit(1);
  if (data && data[0]) {
    console.log('=== INVESTOR TABLE FIELDS ===');
    Object.keys(data[0]).forEach(k => {
      const v = data[0][k];
      const type = Array.isArray(v) ? 'array' : typeof v;
      const sample = v ? (typeof v === 'string' ? v.substring(0, 50) : JSON.stringify(v).substring(0, 50)) : 'null';
      console.log(`  ${k}: ${type} = ${sample}`);
    });
  }
  
  // Check a few investors with good data
  const { data: good } = await s.from('investors')
    .select('name, firm, notable_investments, focus_areas, blog_url, last_investment_date, portfolio_companies, signals')
    .not('notable_investments', 'is', null)
    .limit(3);
  
  console.log('\n=== SAMPLE INVESTORS WITH DATA ===');
  good?.forEach(i => {
    console.log(`\n${i.name} @ ${i.firm}`);
    console.log('  notable_investments:', JSON.stringify(i.notable_investments)?.substring(0, 100));
    console.log('  focus_areas:', JSON.stringify(i.focus_areas)?.substring(0, 100));
    console.log('  blog_url:', i.blog_url);
    console.log('  last_investment_date:', i.last_investment_date);
    console.log('  portfolio_companies:', JSON.stringify(i.portfolio_companies)?.substring(0, 100));
  });
}
check();
