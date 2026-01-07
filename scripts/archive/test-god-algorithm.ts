/**
 * test-god-algorithm.ts
 * Tests GOD score calculation
 * Run: npx tsx scripts/test-god-algorithm.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function test() {
  console.log('🔍 HOT MATCH - GOD ALGORITHM TEST\n');

  // Get sample startups with scores
  const { data } = await supabase
    .from('startup_uploads')
    .select('name, total_god_score, team_score, traction_score, market_score, product_score, vision_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .order('total_god_score', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) {
    console.log('❌ No startups with GOD scores found');
    return;
  }

  console.log('Top 10 by GOD Score:\n');
  data.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name}: ${s.total_god_score}`);
    console.log(`   Team: ${s.team_score} | Traction: ${s.traction_score} | Market: ${s.market_score} | Product: ${s.product_score} | Vision: ${s.vision_score}`);
  });

  // Score distribution
  const scores = data.map(s => s.total_god_score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  console.log(`\n📊 Score Stats: Avg=${avg}, Min=${min}, Max=${max}`);
  console.log('\n✅ GOD ALGORITHM TEST COMPLETE');
}

test().catch(console.error);
