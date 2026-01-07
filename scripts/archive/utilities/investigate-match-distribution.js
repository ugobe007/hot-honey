#!/usr/bin/env node
/**
 * INVESTIGATE MATCH DISTRIBUTION
 * 
 * Check which startups have matches and why only 9 are showing up.
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

async function investigate() {
  console.log('\n🔍 Investigating Match Distribution...\n');

  // Get all matches with startup info
  const { data: matches, error: matchesError } = await supabase
    .from('startup_investor_matches')
    .select('startup_id, match_score')
    .limit(10000);

  if (matchesError) {
    console.error('❌ Error:', matchesError);
    return;
  }

  console.log(`📊 Total matches sampled: ${matches.length}`);

  // Count unique startups
  const startupIds = new Set(matches.map(m => m.startup_id));
  console.log(`🚀 Unique startups with matches: ${startupIds.size}`);

  // Get startup names
  const { data: startups, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score')
    .in('id', Array.from(startupIds).slice(0, 20));

  if (startups) {
    console.log(`\n📋 Sample startups with matches:`);
    startups.forEach(s => {
      const matchCount = matches.filter(m => m.startup_id === s.id).length;
      console.log(`   ${s.name} (GOD: ${s.total_god_score || 'N/A'}) - ${matchCount} matches`);
    });
  }

  // Check if there's a limit issue
  const { count: totalMatches, error: countError } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total matches in database: ${totalMatches || 0}`);

  // Get all unique startup IDs (no limit)
  const { data: allMatches, error: allMatchesError } = await supabase
    .from('startup_investor_matches')
    .select('startup_id');

  if (allMatches) {
    const allStartupIds = new Set(allMatches.map(m => m.startup_id));
    console.log(`🚀 Total unique startups with matches: ${allStartupIds.size}`);
  }
}

investigate().catch(console.error);





