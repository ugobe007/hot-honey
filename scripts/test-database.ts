/**
 * test-database.ts
 * Quick database health check - no hanging
 * Run: npx tsx scripts/test-database.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function test() {
  console.log('🔍 HOT MATCH - DATABASE TEST\n');

  // Test 1: Connection
  const { error } = await supabase.from('startup_uploads').select('id').limit(1);
  console.log(error ? '❌ Connection failed' : '✅ Database connected');

  // Test 2: Startups count
  const { count: startups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  console.log(`✅ Startups: ${startups}`);

  // Test 3: Investors count
  const { count: investors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  console.log(`✅ Investors: ${investors}`);

  // Test 4: Matches count
  const { count: matches } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  console.log(`✅ Matches: ${matches}`);

  // Test 5: GOD scores
  const { count: withScores } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .gt('total_god_score', 0);
  console.log(`✅ Startups with GOD scores: ${withScores}`);

  console.log('\n✅ DATABASE TEST COMPLETE');
}

test().catch(console.error);
