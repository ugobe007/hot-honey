/**
 * PYTH AI - SYSTEM TEST SUITE
 * 
 * Run: npx tsx scripts/test-hotmatch.ts
 * 
 * Tests all critical systems:
 * 1. Database connection
 * 2. Startups data
 * 3. Investors data
 * 4. GOD scores
 * 5. Matching capability
 * 6. Schema integrity
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Test results
const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

function log(test: string, status: 'PASS' | 'FAIL', details: string) {
  results.push({ test, status, details });
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${test}: ${details}`);
}

// ============================================================================
// TESTS
// ============================================================================

async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase.from('startup_uploads').select('id').limit(1);
    if (error) throw error;
    log('Database Connection', 'PASS', 'Connected to Supabase');
  } catch (err: any) {
    log('Database Connection', 'FAIL', err.message);
  }
}

async function testStartupsTable() {
  try {
    // Count total
    const { count: total } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true });

    // Count approved
    const { count: approved } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    // Count with GOD scores
    const { count: withScores } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .not('total_god_score', 'is', null)
      .gt('total_god_score', 0);

    log('Startups - Total', total ? 'PASS' : 'FAIL', `${total || 0} startups in database`);
    log('Startups - Approved', (approved || 0) >= 100 ? 'PASS' : 'FAIL', `${approved || 0} approved (need 100+)`);
    log('Startups - GOD Scores', (withScores || 0) >= 100 ? 'PASS' : 'FAIL', `${withScores || 0} have GOD scores`);

  } catch (err: any) {
    log('Startups Table', 'FAIL', err.message);
  }
}

async function testInvestorsTable() {
  try {
    // Count total
    const { count: total } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true });

    // Count active (case-insensitive)
    const { count: active } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.active,status.eq.Active');

    // Count with sectors (correct column name)
    const { count: withSectors } = await supabase
      .from('investors')
      .select('*', { count: 'exact', head: true })
      .not('sectors', 'is', null);

    log('Investors - Total', total ? 'PASS' : 'FAIL', `${total || 0} investors in database`);
    log('Investors - Active', (active || 0) >= 10 ? 'PASS' : 'FAIL', `${active || 0} active`);
    log('Investors - With Sectors', (withSectors || 0) >= 10 ? 'PASS' : 'FAIL', `${withSectors || 0} have sector data`);

  } catch (err: any) {
    log('Investors Table', 'FAIL', err.message);
  }
}

async function testGODScores() {
  try {
    const { data } = await supabase
      .from('startup_uploads')
      .select('name, total_god_score, team_score, traction_score, market_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null)
      .order('total_god_score', { ascending: false })
      .limit(5);

    if (!data || data.length === 0) {
      log('GOD Scores', 'FAIL', 'No startups with GOD scores found');
      return;
    }

    const scores = data.map(s => s.total_god_score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    log('GOD Scores - Range', max > 50 ? 'PASS' : 'FAIL', `Range: ${min}-${max}, Avg: ${avg}`);
    log('GOD Scores - Top 5', 'PASS', data.map(s => `${s.name}: ${s.total_god_score}`).join(', '));

    // Check component scores exist
    const hasComponents = data.every(s => s.team_score && s.traction_score && s.market_score);
    log('GOD Scores - Components', hasComponents ? 'PASS' : 'FAIL', 
      hasComponents ? 'All component scores present' : 'Missing component scores');

  } catch (err: any) {
    log('GOD Scores', 'FAIL', err.message);
  }
}

async function testStageData() {
  try {
    const { data } = await supabase
      .from('startup_uploads')
      .select('stage')
      .not('stage', 'is', null)
      .limit(100);

    if (!data || data.length === 0) {
      log('Stage Data', 'FAIL', 'No stage data found');
      return;
    }

    // Check for consistency (should be text like 'Seed', 'Series A')
    const stages = [...new Set(data.map(s => s.stage))];
    const validTextStages = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Growth', 'Late Stage'];
    const hasValidStages = stages.every(s => validTextStages.includes(s));

    if (hasValidStages) {
      log('Stage Data', 'PASS', `Normalized stages: ${stages.join(', ')}`);
    } else {
      const invalidStages = stages.filter(s => !validTextStages.includes(s));
      log('Stage Data', 'FAIL', `Invalid stages found: ${invalidStages.join(', ')}`);
    }

  } catch (err: any) {
    log('Stage Data', 'FAIL', err.message);
  }
}

async function testMatchingData() {
  try {
    // Get sample startup
    const { data: startups } = await supabase
      .from('startup_uploads')
      .select('id, name, sectors, stage, total_god_score')
      .eq('status', 'approved')
      .not('total_god_score', 'is', null)
      .limit(5);

    // Get sample investor - use sectors not sectors
    const { data: investors } = await supabase
      .from('investors')
      .select('id, name, sectors, stage, check_size_min, check_size_max')
      .or('status.eq.active,status.eq.Active')
      .limit(5);

    if (!startups || startups.length === 0) {
      log('Matching - Startups', 'FAIL', 'No matchable startups');
      return;
    }

    if (!investors || investors.length === 0) {
      log('Matching - Investors', 'FAIL', 'No matchable investors');
      return;
    }

    log('Matching - Startups Ready', 'PASS', `${startups.length} startups available for matching`);
    log('Matching - Investors Ready', 'PASS', `${investors.length} investors available for matching`);

    // Check for sector overlap potential - investors use sectors
    const startupSectors = new Set(startups.flatMap(s => s.sectors || []));
    const investorSectors = new Set(investors.flatMap(i => i.sectors || []));
    const overlap = [...startupSectors].filter(s => investorSectors.has(s));

    log('Matching - Sector Overlap', overlap.length > 0 ? 'PASS' : 'FAIL', 
      overlap.length > 0 ? `Common sectors: ${overlap.slice(0, 5).join(', ')}` : 'No sector overlap - matching may fail');

  } catch (err: any) {
    log('Matching Data', 'FAIL', err.message);
  }
}

async function testMatchesTable() {
  try {
    // Check if table exists and has correct columns
    const { data, error } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        log('Matches Table', 'FAIL', 'Table startup_investor_matches does not exist');
      } else {
        log('Matches Table', 'FAIL', error.message);
      }
      return;
    }

    // Count existing matches
    const { count } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true });

    log('Matches Table', 'PASS', `Table exists with ${count || 0} saved matches`);

  } catch (err: any) {
    log('Matches Table', 'FAIL', err.message);
  }
}

async function testSchemaIntegrity() {
  try {
    // Test startup required fields
    const { data: startup } = await supabase
      .from('startup_uploads')
      .select('name, source_type, status')
      .limit(1)
      .single();

    if (startup) {
      log('Schema - Startup Required Fields', 'PASS', 'name, source_type accessible');
    }

    // Test investor required fields (correct column names)
    const { data: investor } = await supabase
      .from('investors')
      .select('name, firm, stage, sectors')
      .limit(1)
      .single();

    if (investor) {
      log('Schema - Investor Fields', 'PASS', 'name, firm, stage, sectors accessible');
    }

  } catch (err: any) {
    log('Schema Integrity', 'FAIL', err.message);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('🔥 PYTH AI - SYSTEM TEST SUITE');
  console.log('═'.repeat(50));
  console.log('');

  await testDatabaseConnection();
  console.log('');
  
  await testStartupsTable();
  console.log('');
  
  await testInvestorsTable();
  console.log('');
  
  await testGODScores();
  console.log('');
  
  await testStageData();
  console.log('');
  
  await testMatchingData();
  console.log('');
  
  await testMatchesTable();
  console.log('');
  
  await testSchemaIntegrity();
  console.log('');

  // Summary
  console.log('═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Score: ${Math.round((passed / results.length) * 100)}%`);
  
  if (failed > 0) {
    console.log('');
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.details}`);
    });
  }
  
  console.log('');
  console.log('═'.repeat(50));
}

main();
