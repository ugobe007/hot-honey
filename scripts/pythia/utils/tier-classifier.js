#!/usr/bin/env node
/**
 * Tier Classifier Utility
 * 
 * Shared utility for classifying speech snippets into tiers (1, 2, 3)
 * based on content signals and source context.
 * 
 * Rules:
 * - Tier 1: Earned speech (HN comments, GitHub issues, postmortems, support threads)
 * - Tier 2: Semi-earned (default for company_blog/RSS, engineering posts, reality contact)
 * - Tier 3: PR/marketed (PR-dominant AND no hardness signals)
 */

/**
 * Normalize apostrophes (curly to straight)
 */
function normalizeApostrophes(text) {
  return (text || '').replace(/[''`´]/g, "'");
}

/**
 * Count numeric tokens in text
 */
function countNumericTokens(text) {
  const numericPatterns = [
    /\d+%/,           // percentages
    /\$\d+/,          // dollar amounts
    /\d+\s*(ms|secs?|minutes?|hours?|days?|weeks?|months?|years?)/i, // time units
    /\d+x/,           // multipliers
    /\d+[kKmMbB]/,    // thousands/millions/billions
    /v?\d+\.\d+\.\d+/, // version numbers
    /\d+\/\d+/,       // ratios
  ];
  
  let count = 0;
  numericPatterns.forEach(pattern => {
    const matches = text.match(new RegExp(pattern.source, pattern.flags));
    if (matches) count += matches.length;
  });
  
  return count;
}

/**
 * Count causal connectors
 */
function countCausalConnectors(text) {
  const connectors = [
    /\bbecause\b/gi,
    /\btherefore\b/gi,
    /\bleads to\b/gi,
    /\bresults in\b/gi,
    /\bso that\b/gi,
    /\bas a result\b/gi,
    /\bdue to\b/gi,
    /\bsince\b/gi,
    /\bwhen\b/gi
  ];
  
  let count = 0;
  connectors.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  });
  
  return count;
}

/**
 * Count mechanism tokens
 */
function countMechanismTokens(text) {
  const mechanisms = [
    /\bincentives\b/gi,
    /\bswitching costs\b/gi,
    /\bworkflow\b/gi,
    /\bdistribution\b/gi,
    /\bchurn\b/gi,
    /\bprocess\b/gi,
    /\balgorithm\b/gi,
    /\barchitecture\b/gi
  ];
  
  let count = 0;
  mechanisms.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  });
  
  return count;
}

/**
 * Check for engineering/ops keywords (Tier 2 triggers)
 */
function hasEngineeringKeywords(text) {
  const normalized = normalizeApostrophes(text.toLowerCase());
  const engineeringKeywords = [
    'postmortem', 'incident', 'outage', 'root cause', 'rca', 'rollback',
    'deployed', 'migration', 'latency', 'throughput', 'benchmark',
    'architecture', 'release notes', 'changelog', 'cve', 'vulnerability',
    'patch', 'slo', 'sla', 'reliability', 'scaling', 'performance',
    'monitoring', 'logging', 'infrastructure', 'devops', 'ci/cd'
  ];
  
  return engineeringKeywords.some(keyword => normalized.includes(keyword));
}

/**
 * Check for reality contact signals
 */
function hasRealityContact(text) {
  // ≥2 numeric tokens OR dates + metrics OR shipping verbs
  const numericCount = countNumericTokens(text);
  
  const shippingVerbs = /\b(we shipped|we reduced|we fixed|we measured|we tested|ab test|ab testing|a b test)\b/gi;
  const hasShipping = shippingVerbs.test(text);
  
  // Dates + metrics (simple pattern)
  const hasDatesAndMetrics = /\d{4}|\d{1,2}\/\d{1,2}/.test(text) && numericCount >= 1;
  
  return numericCount >= 2 || hasShipping || hasDatesAndMetrics;
}

/**
 * Check for mechanism density
 */
function hasMechanismDensity(text) {
  const connectorCount = countCausalConnectors(text);
  const mechanismCount = countMechanismTokens(text);
  
  // ≥2 causal connectors OR (1 connector + 1 mechanism token)
  return connectorCount >= 2 || (connectorCount >= 1 && mechanismCount >= 1);
}

/**
 * Check for Tier 2 triggers (any one is enough)
 */
function hasTier2Triggers(text) {
  return hasEngineeringKeywords(text) || 
         hasRealityContact(text) || 
         hasMechanismDensity(text);
}

/**
 * Count PR markers (weighted scoring: heavy PR phrases vs soft branding words)
 */
function countPRMarkers(text) {
  const normalized = normalizeApostrophes(text.toLowerCase());
  
  // High-signal PR phrases (announce/thrilled/proud/press release boilerplate)
  const heavy = [
    'excited to announce',
    'thrilled to',
    'proud to share',
    'delighted to',
    'press release',
    'for immediate release',
    'contact:',
    'award-winning',
    'industry-leading',
    'world-class',
    'best-in-class',
    'next-generation',
    'redefining'
  ];
  
  // Soft branding words (mission/vision/journey)
  const light = ['mission', 'vision', 'journey'];
  
  let score = 0;
  heavy.forEach(m => { if (normalized.includes(m)) score += 2; });
  light.forEach(m => { if (normalized.includes(m)) score += 0.25; });
  
  // Funding announcements without metrics/implementation detail
  const fundingOnly = /\b(raised|series [a-z]|seed round|funding)\b/i.test(text) &&
                      !hasRealityContact(text) &&
                      !hasEngineeringKeywords(text);
  
  if (fundingOnly) score += 1.5;
  
  return score;
}

/**
 * Calculate PR density (PR markers per 1000 words)
 */
function prDensity(text) {
  const words = (text || '').split(/\s+/).length || 1;
  return (countPRMarkers(text) / words) * 1000;
}

/**
 * Classify tier based on source type, context, and content signals
 * 
 * @param {string} sourceType - Source type (e.g., 'company_blog', 'forum_post', 'press_quote')
 * @param {string} contextLabel - Context label (e.g., 'technical', 'founder_blog', 'press')
 * @param {string} text - Snippet text content
 * @param {object} metadata - Additional metadata (e.g., { isFounderAuthored, isTeamMember })
 * @returns {number} Tier (1, 2, or 3)
 */
function classifyTier(sourceType, contextLabel, text, metadata = {}) {
  const normalizedText = normalizeApostrophes(text || '');
  
  // Tier 1: Only for genuinely earned sources
  // - GitHub issues/discussions by org members (handled in collect-from-github.js)
  // - Postmortems/incident reports
  // - Support threads
  // Note: HN forum posts are handled in collect-from-forums.js (they assign tier directly)
  if (sourceType === 'postmortem' || sourceType === 'support_thread') {
    return 1;
  }
  
  // For company_blog and RSS sources, use content-based classification
  if (sourceType === 'company_blog' || sourceType === 'press_quote') {
    // Check for PR dominance (weighted scoring system)
    const prMarkerCount = countPRMarkers(normalizedText);
    const hasHardness = hasTier2Triggers(normalizedText);
    
    // Tier 3 only when PR score is high (>= 4) AND hardness is absent
    if (prMarkerCount >= 4 && !hasHardness) {
      return 3;
    }
    
    // Default to Tier 2 (most blog posts should be Tier 2 unless clearly PR-dominant)
    return 2;
  }
  
  // Default fallback: Tier 2 for unknown sources
  return 2;
}

module.exports = {
  classifyTier,
  hasTier2Triggers,
  hasPRMarkers: countPRMarkers,
  prDensity,
  normalizeApostrophes
};
