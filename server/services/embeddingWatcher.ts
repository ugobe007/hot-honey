/**
 * EMBEDDING WATCHER SERVICE (Polling-based fallback)
 * Polls database for new startups without embeddings and generates them
 * More reliable than real-time subscriptions for development
 */

import { supabase } from '../config/supabase';
import { generateStartupEmbedding } from './embeddingGenerator';

let watcherInterval: NodeJS.Timeout | null = null;
let isWatching = false;
let lastCheck = new Date();

/**
 * Start watching for startups needing embeddings (polling every 5 seconds)
 */
export async function startEmbeddingWatcher() {
  if (isWatching) {
    console.log('⚠️  Embedding watcher already running');
    return;
  }

  console.log('👀 Starting embedding watcher (polling mode)...');
  isWatching = true;
  lastCheck = new Date();

  // Check immediately
  await checkForNewStartups();

  // Then check every 5 seconds
  watcherInterval = setInterval(async () => {
    await checkForNewStartups();
  }, 5000);

  console.log('✅ Embedding watcher started (checks every 5s)');
}

/**
 * Stop the embedding watcher
 */
export function stopEmbeddingWatcher() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    isWatching = false;
    console.log('⏹️  Embedding watcher stopped');
  }
}

/**
 * Check for ANY startups that need embeddings (simpler approach)
 */
async function checkForNewStartups() {
  try {
    // Find ALL startups without embeddings (simpler and more reliable)
    const { data: startups, error } = await supabase
      .from('startup_uploads')
      .select('id, name, created_at')
      .is('embedding', null)
      .order('created_at', { ascending: false })
      .limit(10); // Process up to 10 at a time

    if (error) {
      console.error('❌ Error checking for new startups:', error.message);
      return;
    }

    if (startups && startups.length > 0) {
      console.log(`\n📢 Found ${startups.length} startup(s) needing embeddings`);
      
      for (const startup of startups) {
        console.log(`   Processing: ${startup.name} (${startup.id})`);
        
        try {
          await generateStartupEmbedding(startup.id);
          console.log(`   ✅ Embedding generated for: ${startup.name}`);
        } catch (error: any) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }
  } catch (error: any) {
    console.error('❌ Watcher error:', error.message);
  }
}

/**
 * Manually check for any startup missing embeddings (not just new ones)
 */
export async function checkAllMissingEmbeddings() {
  console.log('\n🔍 Checking for ALL startups missing embeddings...');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .is('embedding', null);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!startups || startups.length === 0) {
    console.log('✅ All startups have embeddings!');
    return;
  }

  console.log(`📊 Found ${startups.length} startup(s) without embeddings`);
  
  for (const startup of startups) {
    try {
      await generateStartupEmbedding(startup.id);
      console.log(`✅ Generated: ${startup.name}`);
    } catch (error: any) {
      console.error(`❌ Failed ${startup.name}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Batch generation complete\n');
}
