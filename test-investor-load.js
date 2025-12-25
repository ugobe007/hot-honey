require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  // Simulate what getAllInvestors does
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('RAW INVESTOR FROM DB:');
  const inv = data[0];
  console.log('  name:', inv.name);
  console.log('  firm:', inv.firm);
  console.log('  photo_url:', inv.photo_url ? 'YES: ' + inv.photo_url.substring(0, 40) : 'NULL');
  console.log('  bio:', inv.bio ? inv.bio.substring(0, 50) : 'NULL');
  console.log('  notable_investments:', inv.notable_investments);
  console.log('  check_size_min:', inv.check_size_min);
  console.log('  check_size_max:', inv.check_size_max);
  console.log('  geography_focus:', inv.geography_focus);
  console.log('  active_fund_size:', inv.active_fund_size);
  console.log('  sectors:', inv.sectors);
  console.log('  stage:', inv.stage);

  // Now check what the adapter would produce
  console.log('\n\nAFTER ADAPTER (what component receives):');
  const adapted = {
    ...inv,
    notableInvestments: inv.notable_investments || [],
    portfolioCount: inv.total_investments || undefined,
    exits: inv.successful_exits || undefined,
  };
  console.log('  notableInvestments:', adapted.notableInvestments);
  console.log('  photo_url:', adapted.photo_url ? 'YES' : 'NULL');
}

test();
