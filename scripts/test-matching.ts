/**
 * test-matching.ts
 * Tests matching between startups and investors
 * Run: npx tsx scripts/test-matching.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function test() {
  console.log('🔍 PYTH AI - MATCHING TEST\n');

  // Get sample startup
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, stage, total_god_score')
    .eq('status', 'approved')
    .not('total_god_score', 'is', null)
    .limit(3);

  // Get sample investors
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, sectors, stage, check_size_min, check_size_max')
    .limit(3);

  console.log('Sample Startups:');
  startups?.forEach(s => console.log(`  - ${s.name} (${s.stage}) - Sectors: ${s.sectors?.join(', ')}`));

  console.log('\nSample Investors:');
  investors?.forEach(i => console.log(`  - ${i.name} @ ${i.firm} - Sectors: ${i.sectors?.join(', ')}`));

  // Check for sector overlap
  const startupSectors = new Set(startups?.flatMap(s => s.sectors || []));
  const investorSectors = new Set(investors?.flatMap(i => i.sectors || []));
  const overlap = [...startupSectors].filter(s => investorSectors.has(s));

  console.log(`\n📊 Sector Overlap: ${overlap.length > 0 ? overlap.join(', ') : 'NONE'}`);

  // Check recent matches
  const { count } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total Matches in DB: ${count}`);
  console.log('\n✅ MATCHING TEST COMPLETE');
}

test().catch(console.error);
