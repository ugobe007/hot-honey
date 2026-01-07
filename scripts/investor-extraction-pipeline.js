#!/usr/bin/env node
/**
 * INVESTOR EXTRACTION PIPELINE
 * =============================
 * Two-layer system:
 *   Layer A: Investor Mentions (cheap, noisy, many) → investor_mentions_raw
 *   Layer B: Investor Entities (clean, sparse, trusted) → investors
 * 
 * This prevents creating entities from sentence fragments, article titles, etc.
 * 
 * Usage:
 *   node scripts/investor-extraction-pipeline.js --extract-from-text "text content" --source-url "https://..."
 *   node scripts/investor-extraction-pipeline.js --extract-from-article <article_id>
 *   node scripts/investor-extraction-pipeline.js --promote-mentions
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { validateInvestorEntity } = require('./investor-data-quality-gate');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// KNOWN FIRM NAMES (to reduce false positives)
// ============================================================================

const KNOWN_FIRM_NAMES = new Set([
  // Well-known VC firms (abbreviations and full names)
  'a16z', 'andreessen horowitz', 'andreesen horowitz',
  '500 startups', '500 global',
  'y combinator', 'yc',
  'sequoia capital', 'sequoia',
  'accel', 'accel partners',
  'greylock', 'greylock partners',
  'benchmark', 'benchmark capital',
  'first round', 'firstround', 'first round capital',
  'lightspeed', 'lightspeed venture partners',
  'kleiner perkins', 'kp', 'kleiner perkins caufield byers',
  'nea', 'new enterprise associates',
  'bessemer', 'bessemer venture partners',
  'insight partners', 'insight',
  'tiger global', 'tiger',
  'softbank', 'softbank vision fund',
  'general catalyst',
  'index ventures', 'index',
  'redpoint', 'redpoint ventures',
  'matrix partners', 'matrix',
  'spark capital', 'spark',
  'union square ventures', 'usv',
  'founders fund',
  'thrive capital', 'thrive',
  'coatue',
  'd1 capital',
  'gv', 'google ventures',
  'microsoft ventures',
  'salesforce ventures',
  'intel capital',
  'corporate venture capital', 'cvc',
  
  // Angel groups
  'angellist', 'angel list',
  'syndicate',
  'super angel',
  
  // Accelerators
  'techstars',
  'masschallenge',
  'startx',
  'alchemist',
  'er accelerator',
  
  // Numbers + common patterns
  '122west ventures',
  '1up ventures',
  '406 ventures',
  '645 ventures',
  '25madison',
]);

// ============================================================================
// LAYER A: INVESTOR MENTION EXTRACTION
// ============================================================================

/**
 * Extract investor mentions from text (cheap, noisy, many)
 * Returns array of mentions with confidence scores
 */
async function extractInvestorMentions(text, sourceUrl = '', context = {}) {
  // This is where you'd use NER, regex, or LLM to extract potential investors
  // For now, using a simplified pattern-based approach
  
  const mentions = [];
  
  // Pattern 1: "Name (Firm)" or "Name @ Firm"
  const nameFirmPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*(?:\(|@)\s*([^)]+)/gi;
  let match;
  while ((match = nameFirmPattern.exec(text)) !== null) {
    mentions.push({
      mention_text: match[0],
      name: match[1].trim(),
      firm: match[2].trim().replace(/[()]/g, ''),
      confidence: 0.6,
      extraction_method: 'name_firm_pattern',
      source_url: sourceUrl,
      context_snippet: text.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50),
    });
  }
  
  // Pattern 2: Firm names with known suffixes
  const firmPattern = /([A-Z][a-zA-Z\s]+(?:Capital|Ventures|Partners|Fund|Investments|Group|Equity|Holdings))/gi;
  while ((match = firmPattern.exec(text)) !== null) {
    const firmName = match[1].trim();
    if (!KNOWN_FIRM_NAMES.has(firmName.toLowerCase())) {
      mentions.push({
        mention_text: firmName,
        name: null,
        firm: firmName,
        confidence: 0.5,
        extraction_method: 'firm_suffix_pattern',
        source_url: sourceUrl,
        context_snippet: text.substring(Math.max(0, match.index - 50), match.index + firmName.length + 50),
      });
    }
  }
  
  // Pattern 3: Known firm names
  for (const knownFirm of KNOWN_FIRM_NAMES) {
    const regex = new RegExp(`\\b${knownFirm.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    if (regex.test(text)) {
      mentions.push({
        mention_text: knownFirm,
        name: null,
        firm: knownFirm,
        confidence: 0.8, // Higher confidence for known firms
        extraction_method: 'known_firm_match',
        source_url: sourceUrl,
        context_snippet: text.substring(0, 200), // First 200 chars as context
      });
    }
  }
  
  // Deduplicate by mention_text
  const uniqueMentions = [];
  const seen = new Set();
  for (const mention of mentions) {
    const key = `${mention.name || ''}|${mention.firm || ''}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMentions.push(mention);
    }
  }
  
  return uniqueMentions;
}

/**
 * Save mentions to investor_mentions_raw table
 */
async function saveMentions(mentions) {
  if (mentions.length === 0) return { saved: 0, errors: [] };
  
  // Ensure table exists
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS investor_mentions_raw (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mention_text TEXT NOT NULL,
        name TEXT,
        firm TEXT,
        confidence NUMERIC,
        extraction_method TEXT,
        source_url TEXT,
        context_snippet TEXT,
        promoted_to_entity_id UUID REFERENCES investors(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  }).catch(() => {
    // Table might already exist
  });
  
  const { data, error } = await supabase
    .from('investor_mentions_raw')
    .insert(mentions.map(m => ({
      mention_text: m.mention_text,
      name: m.name,
      firm: m.firm,
      confidence: m.confidence,
      extraction_method: m.extraction_method,
      source_url: m.source_url,
      context_snippet: m.context_snippet,
    })))
    .select();
  
  if (error) {
    console.error('❌ Error saving mentions:', error);
    return { saved: 0, errors: [error] };
  }
  
  return { saved: data.length, errors: [] };
}

// ============================================================================
// LAYER B: INVESTOR ENTITY PROMOTION
// ============================================================================

/**
 * Promote a mention to an investor entity (only if validated)
 */
async function promoteMentionToEntity(mentionId, mentionData) {
  // Import validation from quality gate
  const qualityGate = require('./investor-data-quality-gate');
  
  const validation = qualityGate.validateInvestorEntity(
    mentionData.name || mentionData.mention_text,
    mentionData.firm,
    mentionData.context_snippet || '',
    mentionData.source_url || ''
  );
  
  if (!validation.valid) {
    return {
      promoted: false,
      reason: validation.reason,
      message: validation.message,
    };
  }
  
  // Check if entity already exists
  const { data: existing } = await supabase
    .from('investors')
    .select('id')
    .or(`name.ilike.${mentionData.name || mentionData.mention_text},firm.ilike.${mentionData.firm || ''}`)
    .limit(1)
    .single();
  
  if (existing) {
    // Link mention to existing entity
    await supabase
      .from('investor_mentions_raw')
      .update({ promoted_to_entity_id: existing.id })
      .eq('id', mentionId);
    
    return {
      promoted: false,
      reason: 'entity_exists',
      entity_id: existing.id,
      message: 'Investor entity already exists',
    };
  }
  
  // Create new investor entity
  const { data: newEntity, error } = await supabase
    .from('investors')
    .insert({
      name: mentionData.name || mentionData.mention_text,
      firm: mentionData.firm,
      url: mentionData.source_url || null,
      // Set status to pending enrichment
      status: 'pending_enrichment',
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating investor entity:', error);
    return {
      promoted: false,
      reason: 'creation_failed',
      error: error.message,
    };
  }
  
  // Link mention to new entity
  await supabase
    .from('investor_mentions_raw')
    .update({ promoted_to_entity_id: newEntity.id })
    .eq('id', mentionId);
  
  return {
    promoted: true,
    entity_id: newEntity.id,
    confidence: validation.confidence,
    message: validation.message,
  };
}

/**
 * Promote eligible mentions to entities
 */
async function promoteEligibleMentions(limit = 100) {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 PROMOTING ELIGIBLE MENTIONS TO ENTITIES');
  console.log('='.repeat(80) + '\n');
  
  // Get mentions that haven't been promoted yet
  const { data: mentions, error } = await supabase
    .from('investor_mentions_raw')
    .select('*')
    .is('promoted_to_entity_id', null)
    .order('confidence', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching mentions:', error);
    return;
  }
  
  console.log(`📊 Found ${mentions.length} unpromoted mentions\n`);
  
  let promoted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const mention of mentions) {
    const result = await promoteMentionToEntity(mention.id, mention);
    
    if (result.promoted) {
      promoted++;
      console.log(`✅ Promoted: ${mention.mention_text} → Entity ${result.entity_id}`);
    } else if (result.reason === 'entity_exists') {
      skipped++;
      console.log(`⏭️  Skipped (exists): ${mention.mention_text} → Entity ${result.entity_id}`);
    } else {
      errors++;
      console.log(`❌ Failed: ${mention.mention_text} - ${result.reason}: ${result.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 PROMOTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Promoted: ${promoted}`);
  console.log(`   Skipped (exists): ${skipped}`);
  console.log(`   Failed: ${errors}`);
  console.log('');
}

// ============================================================================
// MAIN EXTRACTION WORKFLOW
// ============================================================================

/**
 * Extract investors from text and save as mentions
 */
async function extractFromText(text, sourceUrl = '') {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 EXTRACTING INVESTOR MENTIONS FROM TEXT');
  console.log('='.repeat(80) + '\n');
  
  const mentions = await extractInvestorMentions(text, sourceUrl);
  console.log(`📊 Extracted ${mentions.length} mentions\n`);
  
  if (mentions.length > 0) {
    const { saved, errors } = await saveMentions(mentions);
    console.log(`✅ Saved ${saved} mentions to investor_mentions_raw`);
    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
    }
  }
  
  return mentions;
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--extract-from-text')) {
  const textIndex = args.indexOf('--extract-from-text');
  const text = args[textIndex + 1];
  const urlIndex = args.indexOf('--source-url');
  const sourceUrl = urlIndex >= 0 ? args[urlIndex + 1] : '';
  
  if (!text) {
    console.error('Usage: node scripts/investor-extraction-pipeline.js --extract-from-text "text" [--source-url "url"]');
    process.exit(1);
  }
  
  extractFromText(text, sourceUrl).catch(console.error);
  
} else if (args.includes('--promote-mentions')) {
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 100;
  
  promoteEligibleMentions(limit).catch(console.error);
  
} else {
  console.log(`
INVESTOR EXTRACTION PIPELINE
=============================

Usage:
  node scripts/investor-extraction-pipeline.js --extract-from-text "text content" [--source-url "https://..."]
  node scripts/investor-extraction-pipeline.js --promote-mentions [--limit 100]

This implements a two-layer system:
  Layer A: Mentions (cheap, noisy, many) → investor_mentions_raw
  Layer B: Entities (clean, sparse, trusted) → investors
  `);
}

