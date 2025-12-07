/**
 * AUTOMATIC EMBEDDING GENERATION SERVICE
 * Generates embeddings for startups as soon as they're created
 * Ensures all startups have embeddings ready for matching
 */

import { supabase } from '../config/supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface StartupData {
  name: string;
  tagline?: string;
  pitch?: string;
  description?: string;
  extracted_data?: any;
}

/**
 * Generate embedding for a startup
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Build embedding text from startup data
 */
function buildEmbeddingText(startup: StartupData): string {
  const extractedData = startup.extracted_data || {};
  
  const parts = [
    startup.name,
    startup.tagline || '',
    startup.pitch || '',
    startup.description || '',
    extractedData.problem || '',
    extractedData.solution || '',
    extractedData.industry || '',
    extractedData.team || '',
  ];
  
  return parts
    .filter(Boolean)
    .join(' ')
    .substring(0, 8000); // Limit to 8000 chars
}

/**
 * Generate and store embedding for a startup
 * Called automatically when startup is created/updated
 */
export async function generateStartupEmbedding(startupId: string): Promise<void> {
  console.log(`📊 Generating embedding for startup: ${startupId}`);
  
  try {
    // Fetch startup data
    const { data: startup, error: fetchError } = await supabase
      .from('startup_uploads')
      .select('id, name, tagline, pitch, description, extracted_data, embedding')
      .eq('id', startupId)
      .single();
    
    if (fetchError || !startup) {
      console.error(`  ❌ Startup not found: ${startupId}`);
      return;
    }
    
    // Skip if already has embedding
    if (startup.embedding && Array.isArray(startup.embedding) && startup.embedding.length > 0) {
      console.log(`  ✅ Embedding already exists (${startup.embedding.length} dims)`);
      return;
    }
    
    // Build text for embedding
    const text = buildEmbeddingText(startup);
    console.log(`  📝 Text length: ${text.length} chars`);
    
    // Generate embedding
    const embedding = await generateEmbedding(text);
    console.log(`  🤖 Generated ${embedding.length}-dim vector`);
    
    // Store in database
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ embedding })
      .eq('id', startupId);
    
    if (updateError) {
      console.error(`  ❌ Failed to save embedding: ${updateError.message}`);
      throw updateError;
    }
    
    console.log(`  ✅ Embedding saved to database`);
    
  } catch (error: any) {
    console.error(`  ❌ Error generating embedding: ${error.message}`);
    throw error;
  }
}

/**
 * Generate embeddings for multiple startups in batch
 */
export async function batchGenerateEmbeddings(startupIds: string[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  console.log(`\n🚀 Batch generating embeddings for ${startupIds.length} startups\n`);
  
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];
  
  for (let i = 0; i < startupIds.length; i++) {
    const startupId = startupIds[i];
    
    try {
      console.log(`[${i + 1}/${startupIds.length}] Processing: ${startupId}`);
      await generateStartupEmbedding(startupId);
      success++;
      
      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      failed++;
      errors.push({ id: startupId, error: error.message });
    }
  }
  
  console.log(`\n📊 Batch complete: ${success} success, ${failed} failed\n`);
  
  return { success, failed, errors };
}

/**
 * Check and generate embeddings for all startups missing them
 */
export async function ensureAllEmbeddings(): Promise<void> {
  console.log('🔍 Checking for startups without embeddings...\n');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .is('embedding', null);
  
  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('✅ All startups have embeddings!\n');
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups without embeddings\n`);
  
  const ids = startups.map(s => s.id);
  await batchGenerateEmbeddings(ids);
}
