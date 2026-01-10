#!/usr/bin/env node
/**
 * POPULATE MATCHING QUEUE - ALL STARTUPS
 * Adds ALL startups from startup_uploads to matching_queue so queue processor can generate matches
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function populateQueue() {
  console.log('🔍 Checking matching_queue table...\n');

  // 1. Try to query it directly to see if it exists
  const { data: testQuery, error: testError } = await supabase
    .from('matching_queue')
    .select('id')
    .limit(1);

  if (testError) {
    if (testError.message?.includes('does not exist') || testError.code === '42P01') {
      console.log('❌ matching_queue table does not exist!');
      console.log('\n📝 Please run migrations/create_matching_queue_table.sql in Supabase SQL Editor first.\n');
      return;
    }
    throw testError;
  }

  console.log('✅ matching_queue table exists\n');

  // 2. Get all approved startups
  console.log('📊 Fetching all approved startups...');
  let allStartups = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('startup_uploads')
      .select('id, name, status')
      .eq('status', 'approved')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('❌ Error fetching startups:', error.message);
      break;
    }

    if (!data || data.length === 0) break;

    allStartups = allStartups.concat(data);
    offset += pageSize;

    if (data.length < pageSize) break;
  }

  console.log(`✅ Found ${allStartups.length} approved startups\n`);

  if (allStartups.length === 0) {
    console.log('⚠️  No approved startups found. Nothing to add to queue.');
    return;
  }

  // 3. Check which ones are already in queue
  console.log('🔍 Checking existing queue entries...');
  const startupIds = allStartups.map(s => s.id);
  
  let existingIds = new Set();
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('matching_queue')
      .select('startup_id')
      .in('startup_id', startupIds.slice(offset, offset + 1000));

    if (error) {
      console.error('⚠️  Error checking queue:', error.message);
      break;
    }

    if (data) {
      data.forEach(item => existingIds.add(item.startup_id));
    }

    offset += 1000;
    if (offset >= startupIds.length) break;
  }

  console.log(`✅ Found ${existingIds.size} startups already in queue\n`);

  // 4. Add missing startups to queue
  const missingStartups = allStartups.filter(s => !existingIds.has(s.id));
  console.log(`📝 Adding ${missingStartups.length} startups to queue...\n`);

  if (missingStartups.length === 0) {
    console.log('✅ All startups already in queue!');
    return;
  }

  // Insert in batches using upsert to handle duplicates gracefully
  const batchSize = 100;
  let added = 0;
  let skipped = 0;

  for (let i = 0; i < missingStartups.length; i += batchSize) {
    const batch = missingStartups.slice(i, i + batchSize);
    
    const queueEntries = batch.map(startup => ({
      startup_id: startup.id,
      status: 'pending',
      attempts: 0
    }));

    // Use upsert with onConflict to handle duplicates gracefully
    const { error } = await supabase
      .from('matching_queue')
      .upsert(queueEntries, { 
        onConflict: 'startup_id',
        ignoreDuplicates: false 
      });

    if (error) {
      // If it's a duplicate error, that's OK - just skip it
      if (error.message?.includes('duplicate') || error.code === '23505') {
        skipped += batch.length;
      } else {
        console.error(`⚠️  Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        skipped += batch.length;
      }
    } else {
      added += batch.length;
    }
    process.stdout.write(`\r📝 Processing: ${Math.min(i + batchSize, missingStartups.length)}/${missingStartups.length} (Added: ${added}, Skipped: ${skipped})...`);
  }

  console.log(`\n\n✅ Queue update complete!`);
  console.log(`   - Added: ${added} new startups`);
  console.log(`   - Skipped: ${skipped} (already in queue)`);
  console.log(`   - Total in queue: ${existingIds.size + added} startups\n`);
  
  if (added > 0 || missingStartups.length === 0) {
    console.log(`🚀 Next step: Run the queue processor:`);
    console.log(`   node scripts/core/queue-processor-v16.js`);
    console.log(`\n   Or with PM2 (runs continuously):`);
    console.log(`   pm2 start scripts/core/queue-processor-v16.js --name queue-processor`);
    console.log(`   pm2 logs queue-processor`);
  } else {
    console.log(`✅ All startups are already in the queue - ready to process!`);
  }
}

populateQueue().catch(console.error);
