#!/usr/bin/env node
/**
 * CHECK RECENT DELETIONS
 * ======================
 * Checks if any startups or investors were recently deleted
 * to help verify if cleanup accidentally deleted important data
 * 
 * Usage: node scripts/check-recent-deletions.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRecentDeletions() {
  console.log('🔍 Checking for recent deletions...\n');
  
  // Note: Supabase doesn't have built-in audit logs for deletions
  // This script checks for patterns that suggest deletions happened
  
  // 1. Check current counts
  const { count: startupCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  
  const { count: investorCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  const { count: matchCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  console.log('📊 CURRENT COUNTS:');
  console.log(`   Startups: ${startupCount}`);
  console.log(`   Investors: ${investorCount}`);
  console.log(`   Matches: ${matchCount}`);
  
  // 2. Check for orphaned matches (matches pointing to deleted startups/investors)
  console.log('\n🔍 Checking for orphaned matches...');
  
  const { data: matches } = await supabase
    .from('startup_investor_matches')
    .select('id, startup_id, investor_id')
    .limit(1000);
  
  if (matches && matches.length > 0) {
    const startupIds = [...new Set(matches.map(m => m.startup_id).filter(Boolean))];
    const investorIds = [...new Set(matches.map(m => m.investor_id).filter(Boolean))];
    
    // Check if startups exist
    const { data: existingStartups } = await supabase
      .from('startup_uploads')
      .select('id')
      .in('id', startupIds);
    
    const existingStartupIds = new Set((existingStartups || []).map(s => s.id));
    const orphanedStartups = startupIds.filter(id => !existingStartupIds.has(id));
    
    // Check if investors exist
    const { data: existingInvestors } = await supabase
      .from('investors')
      .select('id')
      .in('id', investorIds);
    
    const existingInvestorIds = new Set((existingInvestors || []).map(i => i.id));
    const orphanedInvestors = investorIds.filter(id => !existingInvestorIds.has(id));
    
    if (orphanedStartups.length > 0) {
      console.log(`   ⚠️  Found ${orphanedStartups.length} matches pointing to deleted startups`);
      console.log(`      Sample IDs: ${orphanedStartups.slice(0, 5).join(', ')}`);
    }
    
    if (orphanedInvestors.length > 0) {
      console.log(`   ⚠️  Found ${orphanedInvestors.length} matches pointing to deleted investors`);
      console.log(`      Sample IDs: ${orphanedInvestors.slice(0, 5).join(', ')}`);
    }
    
    if (orphanedStartups.length === 0 && orphanedInvestors.length === 0) {
      console.log('   ✅ No orphaned matches found');
    }
  }
  
  // 3. Check recent status changes (startups marked as rejected)
  console.log('\n🔍 Checking for recently rejected startups...');
  
  const { data: rejected } = await supabase
    .from('startup_uploads')
    .select('id, name, status, updated_at')
    .eq('status', 'rejected')
    .order('updated_at', { ascending: false })
    .limit(20);
  
  if (rejected && rejected.length > 0) {
    console.log(`   Found ${rejected.length} rejected startups (recent):`);
    rejected.slice(0, 10).forEach(s => {
      console.log(`      • ${s.name} (${s.updated_at})`);
    });
  } else {
    console.log('   ✅ No rejected startups found');
  }
  
  console.log('\n💡 Note: Supabase doesn\'t track deletion history by default.');
  console.log('   If you need audit logs, consider adding a deleted_at column');
  console.log('   or using soft deletes (status = "deleted") instead of hard deletes.\n');
}

checkRecentDeletions().catch(console.error);

