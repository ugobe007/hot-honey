#!/usr/bin/env node
/**
 * POPULATE MATCHING QUEUE
 * 
 * Adds approved startups without matches to the matching_queue
 * so the queue-processor-v16.js can generate matches for them.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function populateQueue() {
  console.log('\n🔗 POPULATING MATCHING QUEUE\n');
  
  // Get all approved startups
  const { data: startups, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved')
    .limit(1000);
  
  if (startupsError) {
    console.error('Error fetching startups:', startupsError);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('No approved startups found');
    return;
  }
  
  console.log(`Found ${startups.length} approved startups`);
  
  // Get startups that already have matches
  const { data: matchedStartups } = await supabase
    .from('startup_investor_matches')
    .select('startup_id')
    .limit(10000);
  
  const matchedIds = new Set((matchedStartups || []).map(m => m.startup_id));
  
  // Get startups already in queue (any status - unique constraint prevents duplicates)
  const { data: queuedStartups } = await supabase
    .from('matching_queue')
    .select('startup_id, status');
  
  const queuedIds = new Set((queuedStartups || []).map(q => q.startup_id));
  const pendingIds = new Set((queuedStartups || [])
    .filter(q => q.status === 'pending' || q.status === 'processing')
    .map(q => q.startup_id));
  
  // Filter to startups without matches and not in queue
  const toQueue = startups.filter(s => 
    !matchedIds.has(s.id) && !queuedIds.has(s.id)
  );
  
  // Also get startups that are in queue but completed/failed (reset them to pending)
  const toReset = startups.filter(s => 
    !matchedIds.has(s.id) && 
    queuedIds.has(s.id) && 
    !pendingIds.has(s.id)
  );
  
  console.log(`  ${matchedIds.size} already have matches`);
  console.log(`  ${queuedIds.size} already in queue (any status)`);
  console.log(`  ${pendingIds.size} pending/processing`);
  console.log(`  ${toQueue.length} need to be queued`);
  console.log(`  ${toReset.length} need to be reset to pending\n`);
  
  let added = 0;
  let reset = 0;
  
  // Reset completed/failed jobs to pending (in batches with progress)
  if (toReset.length > 0) {
    console.log(`\n🔄 Resetting ${toReset.length} completed/failed jobs to pending...`);
    
    const resetBatchSize = 50;
    for (let i = 0; i < toReset.length; i += resetBatchSize) {
      const batch = toReset.slice(i, i + resetBatchSize);
      const startupIds = batch.map(s => s.id);
      
      try {
        const { error, count } = await supabase
          .from('matching_queue')
          .update({ 
            status: 'pending', 
            attempts: 0,
            error_message: null,
            processed_at: null
          })
          .in('startup_id', startupIds);
        
        if (error) {
          console.error(`  ⚠️  Error resetting batch ${Math.floor(i / resetBatchSize) + 1}:`, error.message);
        } else {
          reset += batch.length;
          console.log(`  ✅ Reset batch ${Math.floor(i / resetBatchSize) + 1}: ${batch.length} jobs (${reset}/${toReset.length})`);
        }
      } catch (err) {
        console.error(`  ❌ Exception resetting batch ${Math.floor(i / resetBatchSize) + 1}:`, err.message);
      }
    }
    console.log(`  ✅ Reset ${reset} jobs to pending\n`);
  }
  
  if (toQueue.length === 0) {
    console.log('✅ All startups are already queued or have matches');
    return;
  }
  
  // Add to queue in batches using upsert to handle any edge cases
  const batchSize = 50;
  
  for (let i = 0; i < toQueue.length; i += batchSize) {
    const batch = toQueue.slice(i, i + batchSize);
    
    const queueJobs = batch.map(startup => ({
      startup_id: startup.id,
      status: 'pending',
      attempts: 0,
      created_at: new Date().toISOString()
    }));
    
    // Use upsert with onConflict to handle duplicates gracefully
    try {
      const { error } = await supabase
        .from('matching_queue')
        .upsert(queueJobs, { 
          onConflict: 'startup_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`  ⚠️  Error adding batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        // Try individual inserts to see which ones fail
        for (const startup of batch) {
          try {
            const { error: singleError } = await supabase
              .from('matching_queue')
              .upsert({
                startup_id: startup.id,
                status: 'pending',
                attempts: 0,
                created_at: new Date().toISOString()
              }, { onConflict: 'startup_id' });
            
            if (!singleError) {
              added++;
            }
          } catch (singleErr) {
            // Skip individual failures
          }
        }
      } else {
        added += batch.length;
        console.log(`  ✅ Added ${batch.length} startups to queue (${added}/${toQueue.length})`);
      }
    } catch (batchErr) {
      console.error(`  ❌ Exception adding batch ${Math.floor(i / batchSize) + 1}:`, batchErr.message);
    }
  }
  
  console.log(`\n✅ Added ${added} startups to matching queue`);
  if (reset > 0) {
    console.log(`✅ Reset ${reset} existing jobs to pending`);
  }
}

populateQueue().catch(console.error);

