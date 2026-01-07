require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testQuery() {
  const { data, error } = await s
    .from('startup_investor_matches')
    .select(`
      id,
      match_score,
      confidence_level,
      startup_id,
      investor_id,
      startup_uploads (
        id, name, tagline, description, sectors, stage,
        total_god_score, extracted_data
      ),
      investors (
        id, name, firm, bio, type, sectors, stage,
        check_size_min, check_size_max, notable_investments,
        geography_focus, investment_thesis
      )
    `)
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(10);

  if (error) {
    console.log('ERROR:', error.message);
    return;
  }

  console.log('Query works!');
  console.log('Matches found:', data?.length);
  if (data?.[0]) {
    console.log('Sample - Startup:', data[0].startup_uploads?.name);
    console.log('Sample - Investor:', data[0].investors?.name);
    console.log('Sample - Score:', data[0].match_score);
  }
}
testQuery();
