require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  console.log('Testing simpler query...\n');
  
  // Test 1: Just the matches table (no joins)
  console.log('1. Matches only (no joins):');
  const start1 = Date.now();
  const { data: m1, error: e1 } = await s
    .from('startup_investor_matches')
    .select('id, startup_id, investor_id, match_score')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(100);
  console.log('   Time:', Date.now() - start1, 'ms');
  console.log('   Error:', e1?.message || 'none');
  console.log('   Count:', m1?.length || 0);
  
  // Test 2: With startup join only
  console.log('\n2. With startup join:');
  const start2 = Date.now();
  const { data: m2, error: e2 } = await s
    .from('startup_investor_matches')
    .select('id, match_score, startup_uploads(id, name, total_god_score)')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(100);
  console.log('   Time:', Date.now() - start2, 'ms');
  console.log('   Error:', e2?.message || 'none');
  console.log('   Count:', m2?.length || 0);
  
  // Test 3: With both joins but fewer fields
  console.log('\n3. Both joins, minimal fields:');
  const start3 = Date.now();
  const { data: m3, error: e3 } = await s
    .from('startup_investor_matches')
    .select('id, match_score, startup_uploads(id, name), investors(id, name, firm)')
    .eq('status', 'suggested')
    .gte('match_score', 35)
    .order('match_score', { ascending: false })
    .limit(100);
  console.log('   Time:', Date.now() - start3, 'ms');
  console.log('   Error:', e3?.message || 'none');
  console.log('   Count:', m3?.length || 0);
  
  if (m3 && m3.length > 0) {
    console.log('\n   Sample:', m3[0].startup_uploads?.name, '<->', m3[0].investors?.name, '(', m3[0].match_score, ')');
  }
}
test();
