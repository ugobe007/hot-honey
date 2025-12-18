/**
 * test-all.ts
 * Quick full system check - runs in <5 seconds
 * Run: npx tsx scripts/test-all.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function test() {
  console.log('\n🔥 HOT MATCH - FULL SYSTEM CHECK\n');
  console.log('═'.repeat(50));

  const checks: { name: string; status: string; value: any }[] = [];

  // 1. Database
  const { error } = await supabase.from('startup_uploads').select('id').limit(1);
  checks.push({ name: 'Database', status: error ? 'FAIL' : 'PASS', value: error ? error.message : 'Connected' });

  // 2. Startups
  const { count: startups } = await supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).eq('status', 'approved');
  checks.push({ name: 'Startups', status: (startups || 0) > 100 ? 'PASS' : 'WARN', value: startups });

  // 3. Investors
  const { count: investors } = await supabase.from('investors').select('*', { count: 'exact', head: true });
  checks.push({ name: 'Investors', status: (investors || 0) > 50 ? 'PASS' : 'WARN', value: investors });

  // 4. Matches
  const { count: matches } = await supabase.from('startup_investor_matches').select('*', { count: 'exact', head: true });
  checks.push({ name: 'Matches', status: (matches || 0) > 0 ? 'PASS' : 'WARN', value: matches });

  // 5. GOD Scores
  const { count: scores } = await supabase.from('startup_uploads').select('*', { count: 'exact', head: true }).gt('total_god_score', 0);
  checks.push({ name: 'GOD Scores', status: (scores || 0) > 100 ? 'PASS' : 'WARN', value: scores });

  // 6. RSS Feeds
  const { count: feeds } = await supabase.from('rss_sources').select('*', { count: 'exact', head: true }).eq('status', 'active');
  checks.push({ name: 'RSS Feeds', status: (feeds || 0) > 5 ? 'PASS' : 'WARN', value: `${feeds} active` });

  // Print results
  checks.forEach(c => {
    const icon = c.status === 'PASS' ? '✅' : c.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${c.name}: ${c.value}`);
  });

  const passed = checks.filter(c => c.status === 'PASS').length;
  const total = checks.length;

  console.log('\n' + '═'.repeat(50));
  console.log(`📊 Result: ${passed}/${total} checks passed`);
  console.log('═'.repeat(50) + '\n');
}

test().catch(console.error);
