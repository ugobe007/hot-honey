require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debug() {
  // Replicate the exact query from MatchingEngine.tsx
  const { data, error, count } = await s
    .from('startup_investor_matches')
    .select(`
      id,
      match_score,
      confidence_level,
      startup_id,
      investor_id,
      startup_uploads (
        id, name, tagline, description, sectors, stage, 
        total_god_score, extracted_data, pitch, sectors,
        raise_amount
      ),
      investors (
        id, name, firm, bio, type, sectors, stage,
        check_size_min, check_size_max, geography_focus, 
        notable_investments, investment_thesis
      )
    `, { count: 'exact' })
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(250);

  console.log('Query result:');
  console.log('  Error:', error?.message || 'none');
  console.log('  Count:', count);
  console.log('  Data length:', data?.length || 0);
  
  if (data && data.length > 0) {
    console.log('\nSample match:');
    console.log('  Startup:', data[0].startup_uploads?.name);
    console.log('  Investor:', data[0].investors?.name);
    console.log('  Score:', data[0].match_score);
  }
}
debug();
