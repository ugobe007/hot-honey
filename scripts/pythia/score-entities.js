#!/usr/bin/env node
/**
 * Pythia Scoring Script
 * Scores entities (startups/founders) using collected speech snippets
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { computePythiaScore } = require('./scoring-engine');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate hash for deduplication
 */
function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Score a single entity
 */
async function scoreEntity(entityId, entityType = 'startup') {
  console.log(`\n🔮 Scoring ${entityType} ${entityId}...`);
  
  // Fetch all snippets for this entity
  const { data: snippets, error } = await supabase
    .from('pythia_speech_snippets')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .order('date_published', { ascending: true });
  
  if (error) {
    console.error(`❌ Error fetching snippets:`, error.message);
    return null;
  }
  
  if (!snippets || snippets.length === 0) {
    console.log(`   ⏭️  No snippets found for ${entityType} ${entityId}`);
    return null;
  }
  
  console.log(`   📊 Found ${snippets.length} snippets`);
  
  // Compute Pythia score
  const result = computePythiaScore(snippets);
  
  // Calculate metadata
  const dates = snippets.map(s => s.date_published).filter(Boolean).sort();
  const temporalSpan = dates.length >= 2 
    ? Math.floor((new Date(dates[dates.length - 1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24))
    : 0;
  
  const uniqueContexts = new Set(snippets.map(s => s.context_label).filter(Boolean)).size;
  const uniqueSources = new Set(snippets.map(s => s.source_url || s.source_type).filter(Boolean)).size;
  
  // Save score to database
  // Ensure all integer fields are properly converted to integers
  const scoreData = {
    entity_id: entityId,
    entity_type: entityType,
    pythia_score: Math.round(result.pythia_score), // Ensure integer
    confidence: result.confidence,
    constraint_score: result.breakdown.constraint_score,
    mechanism_score: result.breakdown.mechanism_score,
    reality_contact_score: result.breakdown.reality_contact_score,
    adjective_verb_penalty: result.breakdown.penalties > 0 ? Math.min(10, result.breakdown.penalties * 0.4) : 0,
    narrative_no_constraint_penalty: result.breakdown.penalties > 10 ? Math.min(10, result.breakdown.penalties - 10) : 0,
    unfalsifiable_penalty: Math.max(0, result.breakdown.penalties - 20),
    tier1_pct: result.source_mix.tier1_pct,
    tier2_pct: result.source_mix.tier2_pct,
    tier3_pct: result.source_mix.tier3_pct,
    snippet_count: Math.round(snippets.length),
    source_count: Math.round(uniqueSources),
    context_diversity: Math.round(uniqueContexts),
    temporal_span_days: Math.round(temporalSpan),
    constraint_markers_count: Math.round(result.features.constraint_markers || 0),
    mechanism_tokens_count: Math.round(result.features.mechanism_tokens || 0),
    reality_markers_count: Math.round(result.features.reality_markers || 0),
    adjective_count: Math.round(result.features.adjective_count || 0),
    action_verb_count: Math.round(result.features.verb_count || 0),
    computed_at: new Date().toISOString()
  };
  
  const { error: insertError } = await supabase
    .from('pythia_scores')
    .insert(scoreData);
  
  if (insertError) {
    console.error(`❌ Error saving score:`, insertError.message);
    return null;
  }
  
  console.log(`   ✅ Score: ${result.pythia_score}/100 (confidence: ${result.confidence.toFixed(2)})`);
  console.log(`      Constraint: ${result.breakdown.constraint_score.toFixed(1)}, Mechanism: ${result.breakdown.mechanism_score.toFixed(1)}, Reality: ${result.breakdown.reality_contact_score.toFixed(1)}`);
  console.log(`      Penalties: ${result.breakdown.penalties.toFixed(1)}, Source mix: T1=${result.source_mix.tier1_pct.toFixed(0)}% T2=${result.source_mix.tier2_pct.toFixed(0)}% T3=${result.source_mix.tier3_pct.toFixed(0)}%`);
  
  return result;
}

/**
 * Score all entities with snippets
 */
async function scoreAllEntities(entityType = 'startup', limit = null) {
  console.log(`\n🔮 PYTHIA SCORING - ${entityType.toUpperCase()}`);
  console.log('═'.repeat(70));
  
  // Get entities that have snippets
  let query = supabase
    .from('pythia_speech_snippets')
    .select('entity_id, entity_type')
    .eq('entity_type', entityType);
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data: entities, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching entities:', error.message);
    return;
  }
  
  if (!entities || entities.length === 0) {
    console.log(`\n⚠️  No ${entityType}s with snippets found.`);
    console.log('   Run snippet collection first.');
    return;
  }
  
  // Get unique entity IDs
  const uniqueEntities = [...new Set(entities.map(e => e.entity_id))];
  console.log(`\n📊 Found ${uniqueEntities.length} ${entityType}s with snippets to score\n`);
  
  let scored = 0;
  let failed = 0;
  
  for (const entityId of uniqueEntities) {
    try {
      const result = await scoreEntity(entityId, entityType);
      if (result) {
        scored++;
      } else {
        failed++;
      }
      
      // Small delay to avoid overwhelming database
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`❌ Error scoring entity ${entityId}:`, error.message);
      failed++;
    }
  }
  
  console.log(`\n✅ Done: ${scored} scored, ${failed} failed (${uniqueEntities.length} total)\n`);
}

// CLI
const command = process.argv[2];
const entityType = process.argv[3] || 'startup';
const limit = process.argv[4] ? parseInt(process.argv[4]) : null;

if (command === 'score') {
  scoreAllEntities(entityType, limit).catch(console.error);
} else if (command && !isNaN(parseInt(command))) {
  // If first arg is a number, treat it as entity_id
  scoreEntity(parseInt(command), entityType).catch(console.error);
} else {
  console.log(`
🔮 PYTHIA SCORING SCRIPT

Usage:
  node scripts/pythia/score-entities.js score [entity_type] [limit]
  node scripts/pythia/score-entities.js <entity_id> [entity_type]

Examples:
  node scripts/pythia/score-entities.js score startup
  node scripts/pythia/score-entities.js score startup 10
  node scripts/pythia/score-entities.js 123 startup
  `);
}
