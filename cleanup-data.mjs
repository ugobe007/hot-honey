#!/usr/bin/env node
/**
 * DATA CLEANUP SCRIPT
 * ====================
 * Fixes data quality issues:
 * 1. Clears garbage locations
 * 2. Sets stage=1 for NULL stages
 * 3. Deletes corrupted investor names
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function cleanupGarbageLocations() {
  console.log('\n🧹 CLEANING GARBAGE LOCATIONS');
  console.log('─'.repeat(60));
  
  // Find all garbage locations
  const { data: badLoc } = await supabase
    .from('startup_uploads')
    .select('id, name, location')
    .or('location.ilike.%empowering%,location.ilike.%undefined%,location.eq.')
    .eq('status', 'approved');
  
  if (!badLoc || badLoc.length === 0) {
    console.log('✅ No garbage locations found');
    return 0;
  }
  
  console.log(`Found ${badLoc.length} startups with garbage locations`);
  
  // Clear them in batches
  const batchSize = 100;
  let fixed = 0;
  
  for (let i = 0; i < badLoc.length; i += batchSize) {
    const batch = badLoc.slice(i, i + batchSize);
    const ids = batch.map(s => s.id);
    
    const { error } = await supabase
      .from('startup_uploads')
      .update({ location: '' })
      .in('id', ids);
    
    if (error) {
      console.error(`❌ Error fixing batch ${i}:`, error.message);
    } else {
      fixed += ids.length;
      console.log(`✅ Fixed batch ${i + 1}-${Math.min(i + batchSize, badLoc.length)} (${fixed}/${badLoc.length})`);
    }
  }
  
  console.log(`\n📊 Fixed ${fixed} garbage locations`);
  return fixed;
}

async function fixNullStages() {
  console.log('\n🔧 FIXING NULL STAGES');
  console.log('─'.repeat(60));
  
  // Count startups with NULL stage
  const { count: noStage } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .is('stage', null)
    .eq('status', 'approved');
  
  if (!noStage || noStage === 0) {
    console.log('✅ No startups with NULL stage');
    return 0;
  }
  
  console.log(`Found ${noStage} startups with NULL stage`);
  
  // Set stage=1 for all NULL stages using RPC or direct update
  // Use smaller batches to avoid timeout
  const batchSize = 200;
  let fixed = 0;
  let offset = 0;
  
  while (true) {
    const { data: batch } = await supabase
      .from('startup_uploads')
      .select('id')
      .is('stage', null)
      .eq('status', 'approved')
      .range(offset, offset + batchSize - 1);
    
    if (!batch || batch.length === 0) break;
    
    const ids = batch.map(s => s.id);
    
    const { error } = await supabase
      .from('startup_uploads')
      .update({ stage: 1 })
      .in('id', ids);
    
    if (error) {
      console.error(`❌ Error fixing batch at offset ${offset}:`, error.message);
      // Continue with next batch instead of breaking
      offset += batchSize;
      continue;
    } else {
      fixed += ids.length;
      console.log(`✅ Fixed batch (${fixed}/${noStage})`);
    }
    
    if (batch.length < batchSize) break;
    offset += batchSize;
    
    // Small delay to avoid overwhelming the database
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log(`\n📊 Fixed ${fixed} NULL stages`);
  return fixed;
}

async function deleteCorruptedInvestors() {
  console.log('\n🗑️  DELETING CORRUPTED INVESTOR NAMES');
  console.log('─'.repeat(60));
  
  // Get all investors
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name');
  
  if (!investors) {
    console.log('✅ No investors found');
    return 0;
  }
  
  // Find corrupted names (>50 chars, likely concatenated)
  const corrupted = investors.filter(i => i.name && i.name.length > 50);
  
  if (corrupted.length === 0) {
    console.log('✅ No corrupted investor names found');
    return 0;
  }
  
  console.log(`Found ${corrupted.length} corrupted investors:`);
  corrupted.forEach((inv, i) => {
    console.log(`  ${i + 1}. ${inv.name.slice(0, 60)}... (${inv.name.length} chars)`);
  });
  
  // Delete them one at a time to handle foreign key constraints
  // First, delete any matches referencing these investors
  let deleted = 0;
  
  for (const inv of corrupted) {
    try {
      // Delete matches first (if they exist)
      const { error: matchError } = await supabase
        .from('startup_investor_matches')
        .delete()
        .eq('investor_id', inv.id);
      
      // Then delete the investor
      const { error } = await supabase
        .from('investors')
        .delete()
        .eq('id', inv.id);
      
      if (error) {
        console.error(`  ❌ Failed to delete ${inv.name.slice(0, 40)}: ${error.message}`);
      } else {
        deleted++;
        console.log(`  ✅ Deleted ${inv.name.slice(0, 40)}...`);
      }
      
      // Small delay to avoid overwhelming
      await new Promise(r => setTimeout(r, 50));
    } catch (err) {
      console.error(`  ❌ Error deleting ${inv.name.slice(0, 40)}:`, err.message);
    }
  }
  
  console.log(`\n📊 Deleted ${deleted}/${corrupted.length} corrupted investors`);
  return deleted;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  
  console.log('\n' + '═'.repeat(60));
  console.log('  🔍 DATA CLEANUP AUDIT');
  console.log('═'.repeat(60));
  
  // Audit first
  const { data: badLoc } = await supabase
    .from('startup_uploads')
    .select('id, name, location')
    .or('location.ilike.%empowering%,location.ilike.%undefined%,location.eq.')
    .eq('status', 'approved');
  
  const { count: noStage } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .is('stage', null)
    .eq('status', 'approved');
  
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name');
  
  const corrupted = investors?.filter(i => i.name && i.name.length > 50) || [];
  
  console.log('\n📊 AUDIT RESULTS:');
  console.log(`  Garbage locations: ${badLoc?.length || 0}`);
  console.log(`  NULL stages: ${noStage || 0}`);
  console.log(`  Corrupted investors: ${corrupted.length}`);
  
  if (!shouldFix) {
    console.log('\n💡 Run with --fix to apply cleanup');
    console.log('   Example: node cleanup-data.mjs --fix\n');
    return;
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('  🔧 APPLYING FIXES');
  console.log('═'.repeat(60));
  
  const results = {
    locations: await cleanupGarbageLocations(),
    stages: await fixNullStages(),
    investors: await deleteCorruptedInvestors()
  };
  
  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ CLEANUP COMPLETE');
  console.log('═'.repeat(60));
  console.log('\n📊 Summary:');
  console.log(`  Locations cleared: ${results.locations}`);
  console.log(`  Stages fixed: ${results.stages}`);
  console.log(`  Investors deleted: ${results.investors}`);
  console.log('\n');
}

main().catch(console.error);

