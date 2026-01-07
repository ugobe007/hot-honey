#!/usr/bin/env node
/**
 * STANDALONE QUEUE PROCESSOR
 * ==========================
 * Run with: node queue-processor.js
 * Or add to PM2: pm2 start queue-processor.js --name queue-processor
 * 
 * This processes the matching_queue table and generates matches for startups.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 20;
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_ATTEMPTS = 3;

let isProcessing = false;
let totalProcessed = 0;
let totalErrors = 0;

async function processJob(job) {
  console.log(`  🎯 Processing: ${job.startup_id.slice(0, 8)}...`);
  
  try {
    // Mark as processing
    await supabase
      .from('matching_queue')
      .update({ status: 'processing', attempts: job.attempts + 1 })
      .eq('id', job.id);

    // Generate matches using the autoMatchService
    // We need to dynamically import it since it may be TypeScript
    let autoGenerateMatches;
    try {
      // Try CommonJS require first
      const autoMatch = require('./server/services/autoMatchService.js');
      autoGenerateMatches = autoMatch.autoGenerateMatches;
    } catch (e) {
      // If that fails, try to call the matching logic directly
      await generateMatchesDirectly(job.startup_id);
      
      // Mark as completed
      const { error: updateError } = await supabase
        .from('matching_queue')
        .update({ status: 'completed' })
        .eq('id', job.id);

      if (updateError) {
        console.error(`  ⚠️  Failed to mark job as completed: ${updateError.message}`);
        throw updateError;
      }

      totalProcessed++;
      return true;
    }

    if (autoGenerateMatches) {
      await autoGenerateMatches(job.startup_id);
    }

    // Mark as completed
    const { error: updateError } = await supabase
      .from('matching_queue')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', job.id);

    if (updateError) {
      console.error(`  ⚠️  Failed to mark job as completed: ${updateError.message}`);
      throw updateError;
    }

    totalProcessed++;
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    totalErrors++;
    
    const newStatus = job.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending';
    await supabase
      .from('matching_queue')
      .update({ status: newStatus, error: error.message })
      .eq('id', job.id);
    
    return false;
  }
}

/**
 * Direct matching logic if autoMatchService isn't available
 */
async function generateMatchesDirectly(startupId) {
  // Get startup
  const { data: startup, error: startupError } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('id', startupId)
    .single();

  if (startupError || !startup) {
    throw new Error(`Startup not found: ${startupId}`);
  }

  // Get investors
  const { data: investors, error: investorError } = await supabase
    .from('investors')
    .select('id, name, sectors, stage, check_size_min, check_size_max')
    .eq('status', 'active')
    .limit(100);

  if (investorError || !investors || investors.length === 0) {
    throw new Error('No active investors found');
  }

  // Simple matching: match based on sector overlap
  const startupSectors = startup.sectors || [];
  const matches = [];

  for (const investor of investors) {
    const investorSectors = investor.sectors || [];
    
    // Calculate basic match score
    let score = 35; // Base score
    
    // Sector overlap bonus
    const sectorOverlap = startupSectors.filter(s => 
      investorSectors.some(is => is.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(is.toLowerCase()))
    ).length;
    
    if (sectorOverlap > 0) {
      score += Math.min(sectorOverlap * 10, 30);
    }

    // GOD score bonus
    if (startup.total_god_score >= 58) score += 15;
    else if (startup.total_god_score >= 50) score += 10;
    else if (startup.total_god_score >= 40) score += 5;

    matches.push({
      startup_id: startupId,
      investor_id: investor.id,
      match_score: Math.min(score, 100),
      confidence_level: score >= 60 ? 'medium' : 'low',
      status: 'suggested',
      fit_analysis: {
        sector_overlap: sectorOverlap,
        startup_god_score: startup.total_god_score,
        method: 'queue_processor_direct'
      }
    });
  }

  // Sort by score and take top 20
  const topMatches = matches
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 20);

  // Insert matches (upsert to avoid duplicates)
  for (const match of topMatches) {
    await supabase
      .from('startup_investor_matches')
      .upsert(match, { onConflict: 'startup_id,investor_id' });
  }

  console.log(`    Created ${topMatches.length} matches`);
}

async function processBatch() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    // Reset jobs stuck in processing (they'll be retried)
    // This handles cases where the processor crashed or was interrupted
    const { data: stuckJobs } = await supabase
      .from('matching_queue')
      .select('id, created_at')
      .eq('status', 'processing')
      .limit(100);

    if (stuckJobs && stuckJobs.length > 0) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const stuck = stuckJobs.filter(job => new Date(job.created_at) < fiveMinutesAgo);
      
      if (stuck.length > 0) {
        console.log(`  🔄 Resetting ${stuck.length} stuck processing jobs...`);
        await supabase
          .from('matching_queue')
          .update({ status: 'pending' })
          .in('id', stuck.map(j => j.id));
      }
    }

    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('matching_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    
    if (!jobs || jobs.length === 0) {
      isProcessing = false;
      return;
    }

    console.log(`\n📦 Processing batch of ${jobs.length} jobs...`);

    for (const job of jobs) {
      await processJob(job);
    }

    console.log(`✅ Batch complete | Total: ${totalProcessed} processed, ${totalErrors} errors`);
  } catch (error) {
    console.error('❌ Batch error:', error.message);
  } finally {
    isProcessing = false;
  }
}

async function getQueueStats() {
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

// Main
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 QUEUE PROCESSOR STARTED');
  console.log('═'.repeat(60));
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);
  console.log('');

  // Show initial stats
  const stats = await getQueueStats();
  console.log('📊 Initial Queue Status:');
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Processing: ${stats.processing}`);
  console.log(`   Completed: ${stats.completed}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log('');

  if (stats.pending === 0) {
    console.log('✅ No pending jobs. Watching for new jobs...');
  }

  // Initial run
  await processBatch();

  // Poll continuously
  setInterval(processBatch, POLL_INTERVAL);

  // Status update every 60 seconds
  setInterval(async () => {
    const stats = await getQueueStats();
    console.log(`\n📊 Status: ${stats.pending} pending | ${stats.processing} processing | ${stats.completed} completed | ${stats.failed} failed`);
  }, 60000);
}

main().catch(console.error);

