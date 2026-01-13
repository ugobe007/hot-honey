#!/usr/bin/env node
/**
 * Cleanup Bad RSS Matches
 * Removes snippets that were incorrectly matched to fake startup names
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Common words that were incorrectly matched as startup names
const COMMON_WORDS_TO_REMOVE = new Set([
  'are', 'x', 'tv', 'tin', 'looking', 'route', 'demo', 'test', 'figure', 
  'hone', 'four', 'ceo', 'king', 'one', 'coa', 'grok', 'ukraine', 'atl', 
  'and', 'future', 'asset', 'raise', 'crypto', 'our', 'ingo'
]);

async function cleanupBadMatches() {
  console.log('\n🧹 Cleaning up bad RSS matches...\n');
  
  // Get all startups to create a lookup set
  const { data: startups, error: startupError } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved')
    .limit(10000);
  
  if (startupError || !startups) {
    console.error('❌ Error fetching startups:', startupError?.message);
    return;
  }
  
  const validStartupIds = new Set(startups.map(s => s.id));
  const startupNamesLower = new Set(startups.map(s => s.name.toLowerCase()));
  
  console.log(`📊 Found ${startups.length} valid startups\n`);
  
  // Get all press quote snippets
  const { data: snippets, error: snippetError } = await supabase
    .from('pythia_speech_snippets')
    .select('id, entity_id, text, source_type')
    .eq('source_type', 'press_quote')
    .limit(10000);
  
  if (snippetError || !snippets) {
    console.error('❌ Error fetching snippets:', snippetError?.message);
    return;
  }
  
  console.log(`📰 Found ${snippets.length} press quote snippets to check\n`);
  
  // Check each snippet's entity_id against valid startups
  const badSnippetIds = [];
  
  for (const snippet of snippets) {
    // Check if entity_id is a valid startup
    if (!validStartupIds.has(snippet.entity_id)) {
      badSnippetIds.push(snippet.id);
      continue;
    }
    
    // Also check if the startup name is a common word
    const startup = startups.find(s => s.id === snippet.entity_id);
    if (startup && COMMON_WORDS_TO_REMOVE.has(startup.name.toLowerCase())) {
      badSnippetIds.push(snippet.id);
    }
  }
  
  console.log(`🔍 Found ${badSnippetIds.length} bad matches to remove\n`);
  
  if (badSnippetIds.length === 0) {
    console.log('✅ No bad matches found!\n');
    return;
  }
  
  // Delete in batches
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < badSnippetIds.length; i += batchSize) {
    const batch = badSnippetIds.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from('pythia_speech_snippets')
      .delete()
      .in('id', batch);
    
    if (deleteError) {
      console.error(`❌ Error deleting batch: ${deleteError.message}`);
    } else {
      deleted += batch.length;
      console.log(`   ✅ Deleted ${deleted}/${badSnippetIds.length} bad matches...`);
    }
  }
  
  console.log(`\n✅ Cleanup complete: ${deleted} bad matches removed\n`);
}

cleanupBadMatches().catch(console.error);
