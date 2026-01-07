require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Check this specific investor
  const { data: nimi } = await s.from('investors')
    .select('*')
    .ilike('name', '%Nimi%')
    .single();
  
  console.log('=== NIMI KATRAGADDA ===');
  console.log(JSON.stringify(nimi, null, 2));
  
  // Check overall investor data completeness
  const { data: investors } = await s.from('investors')
    .select('id, name, firm, bio, investment_thesis, notable_investments, check_size_min, check_size_max, linkedin_url, twitter_url')
    .limit(500);
  
  let hasBio = 0, hasThesis = 0, hasNotable = 0, hasCheckSize = 0, hasLinkedin = 0;
  
  investors.forEach(i => {
    if (i.bio && i.bio.length > 20) hasBio++;
    if (i.investment_thesis && i.investment_thesis.length > 20) hasThesis++;
    if (i.notable_investments && i.notable_investments.length > 0) hasNotable++;
    if (i.check_size_min > 0 || i.check_size_max > 0) hasCheckSize++;
    if (i.linkedin_url) hasLinkedin++;
  });
  
  console.log('\n=== INVESTOR DATA COMPLETENESS (n=' + investors.length + ') ===');
  console.log('Has bio:              ' + hasBio + ' (' + (hasBio/investors.length*100).toFixed(1) + '%)');
  console.log('Has thesis:           ' + hasThesis + ' (' + (hasThesis/investors.length*100).toFixed(1) + '%)');
  console.log('Has notable investments: ' + hasNotable + ' (' + (hasNotable/investors.length*100).toFixed(1) + '%)');
  console.log('Has check size:       ' + hasCheckSize + ' (' + (hasCheckSize/investors.length*100).toFixed(1) + '%)');
  console.log('Has LinkedIn:         ' + hasLinkedin + ' (' + (hasLinkedin/investors.length*100).toFixed(1) + '%)');
  
  // Show a few examples with good data
  console.log('\n=== INVESTORS WITH GOOD DATA ===');
  const good = investors.filter(i => i.bio && i.investment_thesis && i.notable_investments?.length > 0);
  good.slice(0, 3).forEach(i => {
    console.log('\n' + i.name + ' @ ' + i.firm);
    console.log('  Bio: ' + (i.bio || '').substring(0, 80) + '...');
    console.log('  Thesis: ' + (i.investment_thesis || '').substring(0, 80) + '...');
    console.log('  Notable: ' + (i.notable_investments || []).slice(0, 3).join(', '));
  });
}
check();
