require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  // Get an investor with actual data
  const { data } = await supabase
    .from('investors')
    .select('*')
    .not('notable_investments', 'is', null)
    .limit(1);

  const inv = data[0];
  console.log('DB Investor with notable_investments:');
  console.log('  name:', inv.name);
  console.log('  photo_url:', inv.photo_url ? 'YES' : 'NULL');
  console.log('  notable_investments:', inv.notable_investments);
  console.log('  bio:', inv.bio ? inv.bio.substring(0, 50) : 'NULL');

  // Simulate what the adapter does
  const adapted = {
    ...inv,
    notableInvestments: Array.isArray(inv.notable_investments) 
      ? inv.notable_investments 
      : (typeof inv.notable_investments === 'string' 
          ? JSON.parse(inv.notable_investments) 
          : (inv.notable_investments || [])),
  };

  console.log('\nAdapted investor:');
  console.log('  notableInvestments:', adapted.notableInvestments);
  console.log('  photo_url:', adapted.photo_url ? 'YES' : 'NULL');

  // Simulate what MatchingEngine does when creating the match
  const matchInvestor = {
    ...adapted,
    tags: adapted.sectors || [],
  };

  console.log('\nMatch investor object:');
  console.log('  notableInvestments:', matchInvestor.notableInvestments);
  console.log('  photo_url:', matchInvestor.photo_url ? 'YES' : 'NULL');
  console.log('  check_size_min:', matchInvestor.check_size_min);
  console.log('  check_size_max:', matchInvestor.check_size_max);
  console.log('  active_fund_size:', matchInvestor.active_fund_size);
  console.log('  geography_focus:', matchInvestor.geography_focus);

  // What gets passed to EnhancedInvestorCard
  console.log('\nPassed to EnhancedInvestorCard:');
  const cardProps = {
    ...matchInvestor,
    notable_investments: matchInvestor.notableInvestments,
    check_size_min: matchInvestor.check_size_min,
    check_size_max: matchInvestor.check_size_max,
    geography_focus: matchInvestor.geography_focus,
    active_fund_size: matchInvestor.active_fund_size,
  };
  console.log('  photo_url:', cardProps.photo_url ? 'YES' : 'NULL');
  console.log('  bio:', cardProps.bio ? cardProps.bio.substring(0, 50) : 'NULL');
  console.log('  notable_investments:', cardProps.notable_investments);
  console.log('  check_size_min:', cardProps.check_size_min);
  console.log('  check_size_max:', cardProps.check_size_max);
  console.log('  firm:', cardProps.firm);
}

test();
