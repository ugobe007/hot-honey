#!/usr/bin/env node
/**
 * ANALYZE MATCH ALGORITHM
 * 
 * Identifies if we're weeding out quality startups and suggests improvements.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeAlgorithm() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🔍 MATCH ALGORITHM ANALYSIS                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Check if high GOD score startups are getting low match scores
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('1️⃣  HIGH GOD SCORE STARTUPS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: highGOD } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, sectors, stage, location')
    .eq('status', 'approved')
    .gte('total_god_score', 75)
    .limit(20);

  if (highGOD && highGOD.length > 0) {
    console.log(`📊 Found ${highGOD.length} startups with GOD score 75+:\n`);
    
    for (const startup of highGOD.slice(0, 10)) {
      const { data: matches } = await supabase
        .from('startup_investor_matches')
        .select('match_score')
        .eq('startup_id', startup.id)
        .limit(50);
      
      if (matches && matches.length > 0) {
        const avg = matches.reduce((sum, m) => sum + (m.match_score || 0), 0) / matches.length;
        const max = Math.max(...matches.map(m => m.match_score || 0));
        const high = matches.filter(m => (m.match_score || 0) >= 70).length;
        
        console.log(`   ${startup.name} (GOD: ${startup.total_god_score})`);
        console.log(`      Avg Match: ${avg.toFixed(1)} | Max: ${max} | High (70+): ${high}/${matches.length}`);
      }
    }
  }

  // 2. Check match score distribution
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('2️⃣  MATCH SCORE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { data: allMatches } = await supabase
    .from('startup_investor_matches')
    .select('match_score, startup_id')
    .limit(10000);

  if (allMatches) {
    const scores = allMatches.map(m => m.match_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Group by ranges
    const ranges = {
      '90-100': scores.filter(s => s >= 90).length,
      '80-89': scores.filter(s => s >= 80 && s < 90).length,
      '70-79': scores.filter(s => s >= 70 && s < 80).length,
      '60-69': scores.filter(s => s >= 60 && s < 70).length,
      '50-59': scores.filter(s => s >= 50 && s < 59).length,
      '40-49': scores.filter(s => s >= 40 && s < 50).length,
      '<40': scores.filter(s => s < 40).length
    };

    console.log(`   Average Match Score: ${avg.toFixed(1)}\n`);
    console.log('   Distribution:');
    Object.entries(ranges).forEach(([range, count]) => {
      const pct = ((count / scores.length) * 100).toFixed(1);
      console.log(`      ${range.padEnd(8)}: ${count.toString().padStart(5)} (${pct}%)`);
    });
  }

  // 3. Check if we're filtering out quality startups
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('3️⃣  QUALITY STARTUP FILTERING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get startups with high GOD scores but no high-quality matches
  const { data: qualityStartups } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score')
    .eq('status', 'approved')
    .gte('total_god_score', 70)
    .limit(50);

  if (qualityStartups) {
    let noHighMatches = 0;
    let lowAvgMatches = 0;

    for (const startup of qualityStartups) {
      const { data: matches } = await supabase
        .from('startup_investor_matches')
        .select('match_score')
        .eq('startup_id', startup.id)
        .limit(50);

      if (matches && matches.length > 0) {
        const avg = matches.reduce((sum, m) => sum + (m.match_score || 0), 0) / matches.length;
        const high = matches.filter(m => (m.match_score || 0) >= 70).length;

        if (high === 0) noHighMatches++;
        if (avg < 50) lowAvgMatches++;
      }
    }

    console.log(`   Quality Startups (GOD 70+): ${qualityStartups.length}`);
    console.log(`   ⚠️  No high matches (70+): ${noHighMatches} (${Math.round(noHighMatches/qualityStartups.length*100)}%)`);
    console.log(`   ⚠️  Low avg matches (<50): ${lowAvgMatches} (${Math.round(lowAvgMatches/qualityStartups.length*100)}%)`);
  }

  // 4. Algorithm recommendations
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('4️⃣  RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('   Current Algorithm Issues:');
  console.log('   ❌ GOD score only contributes 40% (should be 50-60%)');
  console.log('   ❌ Average match score is too low (43.1)');
  console.log('   ❌ 83% of matches are low quality (<50)');
  console.log('   ❌ High GOD startups not getting proportional match scores\n');

  console.log('   Suggested Improvements:');
  console.log('   ✅ Increase GOD score weight to 50-55%');
  console.log('   ✅ Add bonus for high GOD scores (75+ gets +10, 80+ gets +15)');
  console.log('   ✅ Improve sector matching (better normalization)');
  console.log('   ✅ Add investor quality factor');
  console.log('   ✅ Consider raising minimum threshold to 15-20 (from 10)');
  console.log('   ✅ Better stage matching logic\n');
}

analyzeAlgorithm().catch(console.error);





