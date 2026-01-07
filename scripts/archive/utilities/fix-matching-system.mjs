#!/usr/bin/env node
/**
 * FIX MATCHING SYSTEM
 * ===================
 * 
 * Comprehensive fix for the matching system:
 * 1. Resets all stuck jobs
 * 2. Diagnoses matching issues
 * 3. Shows what needs to be fixed
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetStuckJobs() {
  console.log('\n🔧 RESETTING STUCK JOBS');
  console.log('─'.repeat(60));
  
  // Get all stuck jobs
  const { data: stuckJobs, error } = await supabase
    .from('matching_queue')
    .select('id')
    .eq('status', 'processing');
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  const count = stuckJobs?.length || 0;
  console.log(`Found ${count} stuck jobs in processing status`);
  
  if (count === 0) {
    console.log('✅ No stuck jobs to reset');
    return;
  }
  
  // Reset in batches
  const batchSize = 100;
  let reset = 0;
  
  for (let i = 0; i < count; i += batchSize) {
    const batch = stuckJobs.slice(i, i + batchSize);
    const ids = batch.map(j => j.id);
    
    const { error: updateError } = await supabase
      .from('matching_queue')
      .update({ status: 'pending', attempts: 0 })
      .in('id', ids);
    
    if (updateError) {
      console.error(`❌ Error resetting batch ${i}:`, updateError.message);
    } else {
      reset += ids.length;
      console.log(`✅ Reset ${ids.length} jobs (${reset}/${count})`);
    }
  }
  
  console.log(`\n📊 Reset ${reset} stuck jobs to pending`);
}

async function diagnoseMatching() {
  console.log('\n🔍 DIAGNOSING MATCHING SYSTEM');
  console.log('─'.repeat(60));
  
  // Counts
  const { count: startupCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { count: investorCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  const { count: matchCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
  
  const { count: pending } = await supabase
    .from('matching_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  const { count: processing } = await supabase
    .from('matching_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'processing');
  
  const { count: completed } = await supabase
    .from('matching_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');
  
  console.log('\n📊 Database Status:');
  console.log(`  Approved startups: ${startupCount || 0}`);
  console.log(`  Investors: ${investorCount || 0}`);
  console.log(`  Total matches: ${matchCount || 0}`);
  
  console.log('\n📋 Queue Status:');
  console.log(`  Pending: ${pending || 0}`);
  console.log(`  Processing: ${processing || 0}`);
  console.log(`  Completed: ${completed || 0}`);
  
  // Check match quality
  const { data: sampleMatches } = await supabase
    .from('startup_investor_matches')
    .select('match_score')
    .limit(100);
  
  if (sampleMatches && sampleMatches.length > 0) {
    const avgScore = sampleMatches.reduce((sum, m) => sum + (m.match_score || 0), 0) / sampleMatches.length;
    const lowQuality = sampleMatches.filter(m => (m.match_score || 0) < 35).length;
    
    console.log('\n🎯 Match Quality:');
    console.log(`  Average score: ${avgScore.toFixed(1)}`);
    console.log(`  Low quality (<35): ${lowQuality}/${sampleMatches.length} (${((lowQuality/sampleMatches.length)*100).toFixed(1)}%)`);
  }
  
  // Check startups without matches
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id')
    .eq('status', 'approved')
    .limit(100);
  
  if (startups) {
    let withoutMatches = 0;
    for (const s of startups.slice(0, 20)) {
      const { count } = await supabase
        .from('startup_investor_matches')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', s.id);
      
      if (!count || count === 0) withoutMatches++;
    }
    
    console.log('\n📈 Match Coverage (sample of 20):');
    console.log(`  Startups without matches: ${withoutMatches}/20`);
  }
}

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  🔧 FIX MATCHING SYSTEM');
  console.log('═'.repeat(60));
  
  await diagnoseMatching();
  await resetStuckJobs();
  
  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ DIAGNOSIS COMPLETE');
  console.log('═'.repeat(60));
  console.log('\n💡 Next steps:');
  console.log('  1. Check queue processor is running: pm2 list | grep queue');
  console.log('  2. Restart queue processor: pm2 restart queue-processor-v16');
  console.log('  3. Monitor logs: pm2 logs queue-processor-v16');
  console.log('\n');
}

main().catch(console.error);


