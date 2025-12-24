#!/usr/bin/env node
/**
 * INCREMENTAL MATCH UPDATER
 * =========================
 * Uses database triggers for real-time match generation.
 * This script only handles edge cases and initial backfill.
 * 
 * How it works:
 * 1. Database triggers auto-generate matches when startups/investors are added
 * 2. This script handles: orphaned startups, periodic cleanup, manual backfill
 * 
 * Run manually: node scripts/incremental-match-updater.js
 * Or: node scripts/incremental-match-updater.js --backfill
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findStartupsWithoutMatches() {
  // Find approved startups that have no matches
  const { data, error } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT s.id, s.name
      FROM startup_uploads s
      LEFT JOIN startup_investor_matches m ON s.id = m.startup_id
      WHERE s.status = 'approved'
        AND m.id IS NULL
      LIMIT 100
    `
  });
  
  return data || [];
}

async function findInvestorsWithoutMatches() {
  // Find investors that have no matches
  const { data, error } = await supabase.rpc('exec_sql_rows', {
    sql_query: `
      SELECT i.id, i.name
      FROM investors i
      LEFT JOIN startup_investor_matches m ON i.id = m.investor_id
      WHERE m.id IS NULL
      LIMIT 100
    `
  });
  
  return data || [];
}

async function generateMatchesForStartup(startupId) {
  const { data, error } = await supabase.rpc('generate_matches_for_startup', {
    p_startup_id: startupId
  });
  
  if (error) {
    console.error(`  ❌ Error for startup ${startupId}:`, error.message);
    return 0;
  }
  return data || 0;
}

async function generateMatchesForInvestor(investorId) {
  const { data, error } = await supabase.rpc('generate_matches_for_investor', {
    p_investor_id: investorId
  });
  
  if (error) {
    console.error(`  ❌ Error for investor ${investorId}:`, error.message);
    return 0;
  }
  return data || 0;
}

async function runIncrementalUpdate() {
  console.log('═'.repeat(60));
  console.log('    🔄 INCREMENTAL MATCH UPDATE');
  console.log('═'.repeat(60));
  console.log(`\n📅 ${new Date().toLocaleString()}\n`);

  let totalMatches = 0;

  // 1. Find startups without matches
  console.log('🔍 Finding startups without matches...');
  const startupsWithoutMatches = await findStartupsWithoutMatches();
  
  if (startupsWithoutMatches.length > 0) {
    console.log(`   Found ${startupsWithoutMatches.length} startups needing matches\n`);
    
    for (const startup of startupsWithoutMatches) {
      const matches = await generateMatchesForStartup(startup.id);
      totalMatches += matches;
      console.log(`   ✅ ${startup.name}: ${matches} matches`);
    }
  } else {
    console.log('   ✅ All startups have matches\n');
  }

  // 2. Find investors without matches
  console.log('\n🔍 Finding investors without matches...');
  const investorsWithoutMatches = await findInvestorsWithoutMatches();
  
  if (investorsWithoutMatches.length > 0) {
    console.log(`   Found ${investorsWithoutMatches.length} investors needing matches\n`);
    
    for (const investor of investorsWithoutMatches) {
      const matches = await generateMatchesForInvestor(investor.id);
      totalMatches += matches;
      console.log(`   ✅ ${investor.name}: ${matches} matches`);
    }
  } else {
    console.log('   ✅ All investors have matches\n');
  }

  // 3. Get current stats
  const { count: matchCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '═'.repeat(60));
  console.log('    📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   New matches created: ${totalMatches}`);
  console.log(`   Total matches in DB: ${matchCount?.toLocaleString()}`);
  console.log('═'.repeat(60));
}

async function runFullBackfill() {
  console.log('═'.repeat(60));
  console.log('    🔄 FULL MATCH BACKFILL');
  console.log('═'.repeat(60));
  console.log('\n⚠️  This will regenerate ALL matches. Use sparingly!\n');

  // Get all approved startups
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved');

  if (!startups || startups.length === 0) {
    console.log('No approved startups found.');
    return;
  }

  console.log(`Found ${startups.length} startups to process...\n`);

  let totalMatches = 0;
  let processed = 0;

  for (const startup of startups) {
    const matches = await generateMatchesForStartup(startup.id);
    totalMatches += matches;
    processed++;

    if (processed % 50 === 0) {
      console.log(`   Progress: ${processed}/${startups.length} (${totalMatches} matches)`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`   ✅ Backfill complete: ${totalMatches} matches for ${processed} startups`);
  console.log('═'.repeat(60));
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--backfill')) {
    await runFullBackfill();
  } else {
    await runIncrementalUpdate();
  }
}

main().catch(console.error);
