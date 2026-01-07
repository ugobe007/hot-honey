#!/usr/bin/env node
/**
 * ENHANCED QUEUE PROCESSOR v2
 * ============================
 * 
 * Uses DynamicMatch v2 + EnhancedMatchingService for intelligent matching.
 * 
 * Run: node queue-processor-v2.js
 * PM2: pm2 start queue-processor-v2.js --name queue-v2
 * 
 * Expected improvements:
 * - Match scores: 40 avg → 55+ avg
 * - High-quality matches: 2% → 30%
 * - Better investor-startup alignment
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { EnhancedMatchingService } = require('./server/services/EnhancedMatchingService');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const matchingService = new EnhancedMatchingService(supabase);

// Configuration
const CONFIG = {
  BATCH_SIZE: 10,          // Smaller batches for enrichment
  POLL_INTERVAL: 5000,     // 5 seconds
  MAX_ATTEMPTS: 3,
  MIN_MATCH_SCORE: 35,     // Only create matches above this
  MAX_MATCHES_PER_STARTUP: 50
};

let isProcessing = false;
let stats = {
  processed: 0,
  successful: 0,
  failed: 0,
  totalMatches: 0,
  avgScore: 0,
  startTime: Date.now()
};

async function processJob(job) {
  try {
    // Mark as processing
    await supabase
      .from('matching_queue')
      .update({ status: 'processing', attempts: job.attempts + 1 })
      .eq('id', job.id);

    // Use enhanced matching service
    const result = await matchingService.generateMatches(job.startup_id, {
      maxMatches: CONFIG.MAX_MATCHES_PER_STARTUP,
      minScore: CONFIG.MIN_MATCH_SCORE
    });

    if (result.success) {
      // Mark as completed
      await supabase
        .from('matching_queue')
        .update({ status: 'completed' })
        .eq('id', job.id);

      stats.successful++;
      stats.totalMatches += result.matchCount;
      stats.avgScore = (stats.avgScore * (stats.successful - 1) + result.avgScore) / stats.successful;

      console.log(`  ✅ ${job.startup_id.slice(0, 8)}... → ${result.matchCount} matches (avg: ${result.avgScore}, top: ${result.topScore})`);
      return true;
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error(`  ❌ ${job.startup_id.slice(0, 8)}...: ${error.message}`);
    stats.failed++;

    const newStatus = job.attempts + 1 >= CONFIG.MAX_ATTEMPTS ? 'failed' : 'pending';
    await supabase
      .from('matching_queue')
      .update({ status: newStatus, error: error.message })
      .eq('id', job.id);

    return false;
  }
}

async function processBatch() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Get pending jobs
    const { data: jobs, error } = await supabase
      .from('matching_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', CONFIG.MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(CONFIG.BATCH_SIZE);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      isProcessing = false;
      return;
    }

    console.log(`\n📦 Processing ${jobs.length} jobs...`);

    for (const job of jobs) {
      stats.processed++;
      await processJob(job);
    }

    console.log(`✅ Batch done | Total: ${stats.successful} ok, ${stats.failed} err | Avg score: ${Math.round(stats.avgScore)}`);

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

async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 ENHANCED QUEUE PROCESSOR v2');
  console.log('   Powered by DynamicMatch v2');
  console.log('═'.repeat(60));
  console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE}`);
  console.log(`⏱️  Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
  console.log(`🎯 Min match score: ${CONFIG.MIN_MATCH_SCORE}`);
  console.log('');

  // Show initial stats
  const queueStats = await getQueueStats();
  console.log('📊 Queue Status:');
  console.log(`   Pending: ${queueStats.pending}`);
  console.log(`   Completed: ${queueStats.completed}`);
  console.log(`   Failed: ${queueStats.failed}`);
  console.log('');

  if (queueStats.pending === 0) {
    console.log('✅ No pending jobs. Watching for new jobs...');
  }

  // Initial run
  await processBatch();

  // Poll continuously
  setInterval(processBatch, CONFIG.POLL_INTERVAL);

  // Status update every 60 seconds
  setInterval(async () => {
    const qs = await getQueueStats();
    const elapsed = Math.round((Date.now() - stats.startTime) / 60000);
    console.log(`\n📊 [${elapsed}m] Queue: ${qs.pending} pending | Session: ${stats.successful} ok, ${stats.failed} err | Avg: ${Math.round(stats.avgScore)}`);
  }, 60000);
}

main().catch(console.error);
