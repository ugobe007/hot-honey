/**
 * MATCHING QUEUE PROCESSOR
 * Continuously polls the matching_queue table and processes pending matches
 * This runs automatically in the background when the server starts
 */

import { createClient } from '@supabase/supabase-js';
import { autoGenerateMatches } from './autoMatchService.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface QueueJob {
  id: string;
  startup_id: string; // UUID stored as string
  status: string;
  attempts: number;
  created_at: string;
}

const MAX_ATTEMPTS = 3;
const POLL_INTERVAL = 5000; // Check every 10 seconds
const BATCH_SIZE = 20; // Process 5 at a time

let isProcessing = false;

/**
 * Process a single matching job
 */
async function processJob(job: QueueJob): Promise<boolean> {
  console.log(`\n🎯 Processing match job for startup: ${job.startup_id}`);
  
  try {
    // Mark as processing
    await supabase
      .from('matching_queue')
      .update({ status: 'processing', attempts: job.attempts + 1 })
      .eq('id', job.id);

    // Generate matches
    await autoGenerateMatches(job.startup_id);

    // Count matches created
    const { count } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', job.startup_id);

    // Mark as completed
    await supabase
      .from('matching_queue')
      .update({ 
        status: 'completed', 
        processed_at: new Date().toISOString(),
        error_message: null 
      })
      .eq('id', job.id);

    console.log(`✅ Match job completed: ${count || 0} matches created`);
    return true;

  } catch (error: any) {
    console.error(`❌ Match job failed:`, error.message);

    // Update with error
    const newStatus = job.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending';
    
    await supabase
      .from('matching_queue')
      .update({ 
        status: newStatus,
        error_message: error.message,
        processed_at: newStatus === 'failed' ? new Date().toISOString() : null
      })
      .eq('id', job.id);

    return false;
  }
}

/**
 * Process batch of pending jobs
 */
async function processBatch(): Promise<void> {
  if (isProcessing) {
    console.log('⏳ Already processing batch, skipping...');
    return;
  }

  isProcessing = true;

  try {
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
      return; // No jobs to process
    }

    console.log(`\n📋 Processing ${jobs.length} matching jobs...`);

    // Process jobs sequentially (to avoid overwhelming API)
    for (const job of jobs) {
      await processJob(job);
      
      // Small delay between jobs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Batch processing complete\n`);

  } catch (error) {
    console.error('❌ Batch processing error:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the queue processor (runs continuously)
 */
export function startMatchingQueueProcessor(): void {
  console.log('🚀 Starting matching queue processor...');
  console.log(`📊 Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log(`📦 Batch size: ${BATCH_SIZE}`);
  console.log(`🔄 Max attempts: ${MAX_ATTEMPTS}\n`);

  // Process immediately on start
  processBatch();

  // Then poll at intervals
  setInterval(() => {
    processBatch();
  }, POLL_INTERVAL);
}

/**
 * Manually trigger processing (for testing)
 */
export async function triggerImmediateProcessing(): Promise<void> {
  console.log('🎯 Manual trigger: Processing queue now...');
  await processBatch();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<any> {
  const { data: pending } = await supabase
    .from('matching_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'pending');

  const { data: processing } = await supabase
    .from('matching_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'processing');

  const { data: completed } = await supabase
    .from('matching_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'completed');

  const { data: failed } = await supabase
    .from('matching_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'failed');

  return {
    pending: pending?.length || 0,
    processing: processing?.length || 0,
    completed: completed?.length || 0,
    failed: failed?.length || 0,
    total: (pending?.length || 0) + (processing?.length || 0) + (completed?.length || 0) + (failed?.length || 0)
  };
}
