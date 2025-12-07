/**
 * EMBEDDING LISTENER SERVICE
 * Listens to database notifications and generates embeddings automatically
 */

import { supabase } from '../config/supabase';
import { generateStartupEmbedding } from './embeddingGenerator';

let isListening = false;

/**
 * Start listening for new startup notifications
 */
export async function startEmbeddingListener() {
  if (isListening) {
    console.log('⚠️  Embedding listener already running');
    return;
  }

  console.log('🎧 Starting embedding listener...');
  
  // Subscribe to database changes on startup_uploads
  const channel = supabase
    .channel('startup_uploads_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'startup_uploads'
      },
      async (payload) => {
        const startup = payload.new;
        console.log(`\n📢 New startup detected: ${startup.name} (${startup.id})`);
        
        try {
          // Generate embedding immediately
          await generateStartupEmbedding(startup.id);
          console.log(`✅ Embedding generated for: ${startup.name}\n`);
        } catch (error: any) {
          console.error(`❌ Failed to generate embedding: ${error.message}\n`);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'startup_uploads',
        filter: 'embedding=is.null'
      },
      async (payload) => {
        const startup = payload.new;
        
        // Only process if embedding is still null
        if (!startup.embedding) {
          console.log(`\n📢 Startup updated without embedding: ${startup.name} (${startup.id})`);
          
          try {
            await generateStartupEmbedding(startup.id);
            console.log(`✅ Embedding generated for: ${startup.name}\n`);
          } catch (error: any) {
            console.error(`❌ Failed to generate embedding: ${error.message}\n`);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isListening = true;
        console.log('✅ Embedding listener subscribed to database changes');
        console.log('📊 Will auto-generate embeddings for new startups');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Embedding listener subscription error');
        isListening = false;
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️  Embedding listener subscription timed out');
        isListening = false;
      }
    });

  return channel;
}

/**
 * Stop the embedding listener
 */
export async function stopEmbeddingListener(channel: any) {
  if (channel) {
    await supabase.removeChannel(channel);
    isListening = false;
    console.log('🛑 Embedding listener stopped');
  }
}
