#!/usr/bin/env node
/**
 * Entity Resolution System
 * 
 * You must normalize identity or everything downstream breaks.
 * 
 * Use a deterministic "EntityKey"
 * - entity_key = normalize(domain) if domain exists
 * - else normalize(name) + "|" + normalize(country) etc.
 * 
 * Match candidates using:
 * - domain exact match (highest)
 * - normalized name match (strip Inc/LLC, punctuation)
 * - token Jaccard similarity
 * - optional: local embeddings (MiniLM) for near-matches
 * 
 * Implementing EXACTLY as specified in architecture document.
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

/**
 * Normalize domain
 */
function normalizeDomain(domain) {
  if (!domain) return null;
  
  try {
    const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    return url.hostname.replace(/^www\./, '').toLowerCase().trim();
  } catch {
    return null;
  }
}

/**
 * Normalize name (strip Inc/LLC, punctuation)
 */
function normalizeName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|limited)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate EntityKey
 */
function generateEntityKey(domain, name, country) {
  // Priority 1: Domain (highest confidence)
  const normalizedDomain = normalizeDomain(domain);
  if (normalizedDomain) {
    return normalizedDomain;
  }
  
  // Priority 2: Normalized name + country
  const normalizedName = normalizeName(name);
  const normalizedCountry = (country || '').toLowerCase().trim();
  
  return normalizedCountry ? `${normalizedName}|${normalizedCountry}` : normalizedName;
}

/**
 * Tokenize text
 */
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Calculate Jaccard similarity (token-based)
 */
function jaccardSimilarity(text1, text2) {
  const tokens1 = new Set(tokenize(text1));
  const tokens2 = new Set(tokenize(text2));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Find matching entity by domain (exact match - highest confidence)
 */
async function findEntityByDomain(domain) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) return null;
  
  // Search in startup_uploads
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, website')
    .eq('status', 'approved');
  
  if (!startups) return null;
  
  for (const startup of startups) {
    const startupDomain = normalizeDomain(startup.website);
    if (startupDomain === normalizedDomain) {
      return {
        entity_id: startup.id,
        entity_type: 'startup',
        match_type: 'domain_exact',
        confidence: 1.0,
        matched_field: 'website'
      };
    }
  }
  
  return null;
}

/**
 * Find matching entity by normalized name
 */
async function findEntityByName(name, threshold = 0.8) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;
  
  // Search in startup_uploads
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .eq('status', 'approved');
  
  if (!startups) return null;
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const startup of startups) {
    const startupNameNormalized = normalizeName(startup.name);
    const similarity = jaccardSimilarity(normalizedName, startupNameNormalized);
    
    if (similarity >= threshold && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = {
        entity_id: startup.id,
        entity_type: 'startup',
        match_type: 'name_normalized',
        confidence: similarity,
        matched_field: 'name'
      };
    }
  }
  
  return bestMatch;
}

/**
 * Resolve entity (try domain first, then name)
 */
async function resolveEntity(domain, name, country) {
  // Try domain match first (highest confidence)
  if (domain) {
    const domainMatch = await findEntityByDomain(domain);
    if (domainMatch) {
      return domainMatch;
    }
  }
  
  // Try normalized name match
  if (name) {
    const nameMatch = await findEntityByName(name);
    if (nameMatch) {
      return nameMatch;
    }
  }
  
  return null;
}

/**
 * Save entity key to database (for future resolution)
 */
async function saveEntityKey(entityId, entityType, domain, name, country) {
  const entityKey = generateEntityKey(domain, name, country);
  const normalizedDomain = normalizeDomain(domain);
  const normalizedName = normalizeName(name);
  
  // This would go to an entity_keys table if it exists
  // For now, we'll just return the key
  return {
    entity_id: entityId,
    entity_type: entityType,
    entity_key: entityKey,
    domain: normalizedDomain,
    normalized_name: normalizedName,
    created_at: new Date().toISOString()
  };
}

/**
 * Main function
 */
async function resolveEntities(entities) {
  console.log('\n🔗 ENTITY RESOLUTION');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Resolving ${entities.length} entities...\n`);
  
  const resolved = [];
  const unmatched = [];
  
  for (const entity of entities) {
    const match = await resolveEntity(entity.domain, entity.name, entity.country);
    
    if (match) {
      resolved.push({
        ...entity,
        match
      });
      console.log(`   ✅ ${entity.name}: Matched to ${match.entity_id} (${match.match_type}, confidence: ${match.confidence.toFixed(2)})`);
    } else {
      unmatched.push(entity);
      console.log(`   ❌ ${entity.name}: No match found`);
    }
  }
  
  console.log(`\n✅ Resolved: ${resolved.length}/${entities.length} entities`);
  console.log(`   📊 Unmatched: ${unmatched.length}\n`);
  
  return { resolved, unmatched };
}

// Run if called directly
if (require.main === module) {
  // Example usage
  const testEntities = [
    { name: 'Stripe', domain: 'stripe.com', country: 'US' },
    { name: 'OpenAI', domain: 'openai.com', country: 'US' }
  ];
  
  resolveEntities(testEntities).catch(console.error);
}

module.exports = {
  generateEntityKey,
  normalizeDomain,
  normalizeName,
  jaccardSimilarity,
  resolveEntity,
  saveEntityKey
};
