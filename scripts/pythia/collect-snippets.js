#!/usr/bin/env node
/**
 * Pythia Snippet Collection Script
 * Collects speech snippets from various sources and stores them in the database
 * 
 * This is a template/starter script. You'll need to adapt it based on your data sources.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Derive tier from source_type
 */
function deriveTier(sourceType) {
  const tier1 = ['qa_transcript', 'forum_post', 'support_thread', 'postmortem', 'investor_letter'];
  const tier2 = ['podcast_transcript', 'conf_talk', 'social_post'];
  
  if (tier1.includes(sourceType)) return 1;
  if (tier2.includes(sourceType)) return 2;
  return 3;
}

/**
 * Generate hash for deduplication
 */
function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Save a snippet to the database
 */
async function saveSnippet(snippetData) {
  const {
    entity_id,
    entity_type = 'startup',
    text,
    source_url,
    date_published,
    source_type,
    context_label,
    tier = null
  } = snippetData;
  
  if (!entity_id || !text || !source_type) {
    console.error('❌ Missing required fields: entity_id, text, source_type');
    return null;
  }
  
  // Derive tier if not provided
  const finalTier = tier || deriveTier(source_type);
  
  // Generate hash for deduplication
  const textHash = hashText(text);
  
  // Check for duplicates
  const { data: existing } = await supabase
    .from('pythia_speech_snippets')
    .select('id')
    .eq('text_hash', textHash)
    .eq('entity_id', entity_id)
    .eq('entity_type', entity_type)
    .limit(1)
    .single();
  
  if (existing) {
    console.log(`   ⏭️  Duplicate snippet skipped (hash: ${textHash.substring(0, 8)}...)`);
    return existing;
  }
  
  // Insert snippet
  const { data, error } = await supabase
    .from('pythia_speech_snippets')
    .insert({
      entity_id,
      entity_type,
      text: text.trim(),
      source_url,
      date_published: date_published || new Date().toISOString(),
      source_type,
      tier: finalTier,
      context_label,
      text_hash: textHash
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error saving snippet:`, error.message);
    return null;
  }
  
  console.log(`   ✅ Saved snippet (Tier ${finalTier}, ${source_type})`);
  return data;
}

/**
 * Example: Collect snippets from startup descriptions/pitches (Tier 3)
 * This is a starter - adapt for your actual data sources
 */
async function collectFromStartupProfiles(limit = 100) {
  console.log('\n📊 Collecting snippets from startup profiles...\n');
  
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, description, pitch, tagline, website')
    .eq('status', 'approved')
    .not('description', 'is', null)
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }
  
  console.log(`Found ${startups.length} startups to process\n`);
  
  let saved = 0;
  let skipped = 0;
  
  for (const startup of startups) {
    // Combine text fields
    const texts = [
      { text: startup.description, context: 'product' },
      { text: startup.pitch, context: 'product' },
      { text: startup.tagline, context: 'product' }
    ].filter(item => item.text && item.text.length > 50);
    
    for (const item of texts) {
      const result = await saveSnippet({
        entity_id: startup.id,
        entity_type: 'startup',
        text: item.text,
        source_url: startup.website,
        date_published: null,
        source_type: 'company_blog', // Tier 3
        context_label: item.context
      });
      
      if (result) saved++;
      else skipped++;
    }
  }
  
  console.log(`\n✅ Done: ${saved} snippets saved, ${skipped} skipped\n`);
}

// CLI
const command = process.argv[2];
const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;

if (command === 'startups') {
  collectFromStartupProfiles(limit).catch(console.error);
} else {
  console.log(`
📊 PYTHIA SNIPPET COLLECTION

Usage:
  node scripts/pythia/collect-snippets.js startups [limit]

Examples:
  node scripts/pythia/collect-snippets.js startups
  node scripts/pythia/collect-snippets.js startups 50

Note: For RSS articles, use: npm run pythia:collect:rss
  `);
}
