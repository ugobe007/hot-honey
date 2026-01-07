require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  console.log('Testing optimized two-step query...\n');
  
  // Step 1: Get match IDs only (fast)
  console.log('Step 1: Fetching match IDs...');
  const start1 = Date.now();
  const { data: matchIds, error: matchError } = await s
    .from('startup_investor_matches')
    .select('id, match_score, confidence_level, startup_id, investor_id')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(100);
  
  console.log('  Time:', Date.now() - start1, 'ms');
  console.log('  Error:', matchError?.message || 'none');
  console.log('  Count:', matchIds?.length || 0);
  
  if (!matchIds || matchIds.length === 0) {
    console.log('No matches found!');
    return;
  }
  
  // Step 2: Fetch startup and investor details separately
  console.log('\nStep 2: Fetching details...');
  const startupIds = [...new Set(matchIds.map(m => m.startup_id))];
  const investorIds = [...new Set(matchIds.map(m => m.investor_id))];
  
  console.log('  Unique startups:', startupIds.length);
  console.log('  Unique investors:', investorIds.length);
  
  const start2 = Date.now();
  const [startupsRes, investorsRes] = await Promise.all([
    s.from('startup_uploads').select('id, name, tagline, description, sectors, stage, total_god_score, raise_amount').in('id', startupIds),
    s.from('investors').select('id, name, firm, bio, type, sectors, stage, check_size_min, check_size_max, geography_focus, notable_investments, investment_thesis').in('id', investorIds)
  ]);
  
  console.log('  Time:', Date.now() - start2, 'ms');
  console.log('  Startups fetched:', startupsRes.data?.length || 0);
  console.log('  Investors fetched:', investorsRes.data?.length || 0);
  
  // Combine
  const startupMap = new Map((startupsRes.data || []).map(s => [s.id, s]));
  const investorMap = new Map((investorsRes.data || []).map(i => [i.id, i]));
  
  const matchData = matchIds.map(m => ({
    ...m,
    startup_uploads: startupMap.get(m.startup_id) || null,
    investors: investorMap.get(m.investor_id) || null
  })).filter(m => m.startup_uploads && m.investors);
  
  console.log('\n✅ Final matches:', matchData.length);
  console.log('\nTop 3 matches:');
  matchData.slice(0, 3).forEach(m => {
    console.log(`  ${m.startup_uploads.name} <-> ${m.investors.name} @ ${m.investors.firm} (score: ${m.match_score})`);
  });
}
test();
