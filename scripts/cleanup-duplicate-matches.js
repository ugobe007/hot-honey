#!/usr/bin/env node
/**
 * CLEANUP DUPLICATE MATCHES
 * 
 * Identifies and removes duplicate/repeat matches from startup_investor_matches table
 * 
 * Issues:
 * - Same startup-investor pair matched multiple times
 * - Creates noise in matching engine
 * - Wastes database space
 * 
 * Solution:
 * - Find duplicate startup_id + investor_id pairs
 * - Keep the highest scoring match (or most recent)
 * - Remove the rest
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findDuplicateMatches() {
  console.log('\n🔍 Finding duplicate matches...\n');
  
  try {
    // Find duplicates using RPC or direct query
    // Get all matches grouped by startup_id + investor_id
    const { data: allMatches, error: fetchError } = await supabase
      .from('startup_investor_matches')
      .select('id, startup_id, investor_id, match_score, created_at')
      .order('created_at', { ascending: false });
    
    if (fetchError) throw fetchError;
    
    if (!allMatches || allMatches.length === 0) {
      console.log('✅ No matches found in database');
      return { duplicates: [], toKeep: [], toDelete: [] };
    }
    
    console.log(`📊 Total matches: ${allMatches.length}`);
    
    // Group by startup_id + investor_id
    const matchGroups = new Map();
    
    for (const match of allMatches) {
      const key = `${match.startup_id}-${match.investor_id}`;
      if (!matchGroups.has(key)) {
        matchGroups.set(key, []);
      }
      matchGroups.get(key).push(match);
    }
    
    // Find duplicates (groups with more than 1 match)
    const duplicates = [];
    const toKeep = [];
    const toDelete = [];
    
    for (const [key, matches] of matchGroups.entries()) {
      if (matches.length > 1) {
        // Sort by match_score (desc) then created_at (desc) to find best match
        matches.sort((a, b) => {
          if (b.match_score !== a.match_score) {
            return (b.match_score || 0) - (a.match_score || 0);
          }
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        // Keep the first one (highest score/most recent)
        const keep = matches[0];
        const deleteThese = matches.slice(1);
        
        duplicates.push({
          key,
          startup_id: keep.startup_id,
          investor_id: keep.investor_id,
          count: matches.length,
          keep_id: keep.id,
          keep_score: keep.match_score,
          delete_ids: deleteThese.map(m => m.id)
        });
        
        toKeep.push(keep.id);
        toDelete.push(...deleteThese.map(m => m.id));
      }
    }
    
    console.log(`\n📈 Analysis:`);
    console.log(`   Total unique pairs: ${matchGroups.size}`);
    console.log(`   Duplicate pairs: ${duplicates.length}`);
    console.log(`   Matches to keep: ${toKeep.length}`);
    console.log(`   Matches to delete: ${toDelete.length}`);
    
    // Show top 10 duplicates
    if (duplicates.length > 0) {
      console.log(`\n🔝 Top 10 duplicate pairs:`);
      duplicates
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach((dup, idx) => {
          console.log(`   ${idx + 1}. Startup ${dup.startup_id.substring(0, 8)}... + Investor ${dup.investor_id.substring(0, 8)}... = ${dup.count} matches (keeping best: score=${dup.keep_score})`);
        });
    }
    
    return { duplicates, toKeep, toDelete };
    
  } catch (error) {
    console.error('❌ Error finding duplicates:', error.message);
    throw error;
  }
}

async function removeDuplicates(dryRun = true) {
  console.log('\n' + '='.repeat(60));
  console.log(dryRun ? '🔍 DRY RUN MODE - No changes will be made' : '🗑️  REMOVING DUPLICATES');
  console.log('='.repeat(60) + '\n');
  
  const { duplicates, toDelete } = await findDuplicateMatches();
  
  if (toDelete.length === 0) {
    console.log('✅ No duplicate matches found. Database is clean!\n');
    return;
  }
  
  if (dryRun) {
    console.log(`\n📋 Would delete ${toDelete.length} duplicate matches`);
    console.log(`📋 Would keep ${duplicates.length} best matches`);
    console.log('\n💡 Run with --execute to actually delete duplicates\n');
    return;
  }
  
  // Delete in batches to avoid overwhelming the database
  const BATCH_SIZE = 100;
  let deleted = 0;
  let errors = 0;
  
  console.log(`\n🗑️  Deleting ${toDelete.length} duplicate matches in batches of ${BATCH_SIZE}...\n`);
  
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const batch = toDelete.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from('startup_investor_matches')
        .delete()
        .in('id', batch);
      
      if (error) throw error;
      
      deleted += batch.length;
      process.stdout.write(`   Deleted ${deleted}/${toDelete.length} matches...\r`);
      
    } catch (error) {
      console.error(`\n   ❌ Error deleting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n\n✅ Cleanup complete!`);
  console.log(`   Deleted: ${deleted} duplicate matches`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Kept: ${duplicates.length} best matches\n`);
}

// Main execution
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

removeDuplicates(dryRun)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
