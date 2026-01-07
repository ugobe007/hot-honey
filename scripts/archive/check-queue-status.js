#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getQueueStatus() {
  // Get queue counts with proper pagination
  const [pending, processing, completed, failed] = await Promise.all([
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('matching_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed')
  ]);

  return {
    pending: pending.count || 0,
    processing: processing.count || 0,
    completed: completed.count || 0,
    failed: failed.count || 0
  };
}

async function getMatchCoverage() {
  // Get unique startups with matches
  const { data: matches, error: matchError } = await supabase
    .from('startup_investor_matches')
    .select('startup_id');

  if (matchError) {
    console.error('Error fetching matches:', matchError);
    return { unique: 0, total: 0 };
  }

  const unique = new Set((matches || []).map(m => m.startup_id));

  // Get total approved startups
  const { count: total, error: totalError } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  if (totalError) {
    console.error('Error fetching total startups:', totalError);
    return { unique: unique.size, total: 0 };
  }

  return {
    unique: unique.size,
    total: total || 0
  };
}

async function main() {
  console.log('📊 Queue Processor Status Check\n');
  console.log('═'.repeat(60));

  const queueStatus = await getQueueStatus();
  console.log('\n📦 Queue Status:');
  console.log(`   Pending:    ${queueStatus.pending}`);
  console.log(`   Processing: ${queueStatus.processing}`);
  console.log(`   Completed:  ${queueStatus.completed}`);
  console.log(`   Failed:     ${queueStatus.failed}`);

  const total = queueStatus.pending + queueStatus.processing + queueStatus.completed + queueStatus.failed;
  const progress = total > 0 ? Math.round((queueStatus.completed / total) * 100) : 0;
  console.log(`\n   Progress:   ${progress}% (${queueStatus.completed}/${total})`);

  const coverage = await getMatchCoverage();
  const coveragePercent = coverage.total > 0 ? Math.round((coverage.unique / coverage.total) * 100) : 0;
  console.log('\n🎯 Match Coverage:');
  console.log(`   Startups with matches: ${coverage.unique}/${coverage.total} (${coveragePercent}%)`);

  // Estimate time remaining
  if (queueStatus.pending > 0) {
    const jobsPerMinute = 240; // Based on user's estimate
    const minutesRemaining = Math.ceil(queueStatus.pending / jobsPerMinute);
    console.log(`\n⏱️  Estimated time remaining: ~${minutesRemaining} minutes`);
  } else if (queueStatus.completed > 0) {
    console.log('\n✅ Queue processing complete!');
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);



