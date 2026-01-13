/**
 * Startup Name Sanitizer
 * 
 * Cleans and validates startup names before searching HN
 * Removes article titles, headline fragments, and other junk
 */

/**
 * Common words that are almost never company names when used alone
 */
const GENERIC_WORDS = new Set([
  'people', 'american', 'denmark', 'battlefield', 'even', 'average', 'much',
  'stem', 'cohere', 'venmo', 'good', 'york', 'porting', 'gloo', 'equity'
]);

/**
 * Leading descriptors to strip from startup names
 */
const LEADING_DESCRIPTORS = [
  /^(coding\s+startup\s+)/i,
  /^(startup\s+)/i,
  /^(yc\s+)/i,
  /^(stealth\s+)/i,
  /^(seed\s+)/i,
  /^(series\s+[a-z]\s+)/i,
];

/**
 * Trailing phrases to strip from startup names
 */
const TRAILING_PHRASES = [
  /\s+has\s+raised$/i,
  /\s+today$/i,
  /\s+report$/i,
  /\s+article\s+url$/i,
  /\s+dozens$/i,
  /\s+alerts$/i,
  /\s+2026$/i,
  /\s+of\s+future$/i,
  /\s+is\s+fixing$/i,
];

/**
 * Patterns that indicate non-startup names (article titles, headlines)
 * These are checked anywhere in the name, not just at the end
 */
const HEADLINE_PATTERNS = [
  /article\s+url/i,
  /tool\s+to\s+/i,
  /which\s+uses\s+/i,
  /,\s+which\s+/i,
  /–\s+open\s+/i,
  /report$/i,
  /alerts?\s+dozens/i,
  /'s\s+tool\s+/i,
  /today$/i,
  // Headline verb patterns (anywhere in name)
  /\b(has|have)\s+(raised|secured|closed|announced)\b/i,
  /\bis\s+(fixing|launching|building|raising|raising|releasing)\b/i,
  // Coupon/discount SEO patterns
  /\b(coupon|coupons|promo|promos|codes?)\b/i,
  // Country adjective + generic noun patterns (e.g., "Finnish Rundit", "Lithuanian Repsense", "Swedish startup", "Swiss BioTech")
  /^(finnish|lithuanian|swedish|german|french|british|american|indian|chinese|japanese|korean|swiss|israeli|canadian|australian|singaporean|dutch|spanish|italian|polish|ukrainian|russian|brazilian|mexican|nigerian)\s+/i,
  // "Visa-linked", "YC-backed", etc. (article descriptors)
  /(linked|backed|powered|funded)\s+/i,
];

/**
 * Sanitize and validate startup name
 * @param {string} rawName - Raw startup name from database
 * @returns {{ cleanName: string, rejectReason?: string }}
 */
function sanitizeStartupName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { cleanName: '', rejectReason: 'empty-or-invalid' };
  }

  let clean = rawName.trim();

  // Reject if too short
  if (clean.length < 3) {
    return { cleanName: '', rejectReason: 'too-short' };
  }

  // Stage A: REJECT gate - check headline patterns on RAW name BEFORE any stripping
  // This catches patterns like "Fundvis has raised", "TrialMe is fixing", etc.
  for (const pattern of HEADLINE_PATTERNS) {
    if (pattern.test(clean)) {
      return { cleanName: '', rejectReason: 'headline-pattern' };
    }
  }

  // Reject lowercase phrases (headline fragments like "helps enterprising")
  // Rule: if it has 2-6 words AND starts with lowercase letter → reject
  // Exception: allow hyphenated single tokens or domain-like tokens
  const rawWords = clean.split(/\s+/).filter(w => w.length > 0);
  if (rawWords.length >= 2 && rawWords.length <= 6) {
    const startsLowercase = /^[a-z]/.test(clean);
    const hasDomainLikeToken = rawWords.some(w => /[.\/]/.test(w)); // Contains . or /
    const isHyphenatedSingle = rawWords.length === 1 && /-/.test(rawWords[0]); // Single hyphenated word like "i-doit"
    if (startsLowercase && !hasDomainLikeToken && !isHyphenatedSingle) {
      return { cleanName: '', rejectReason: 'lowercase-phrase' };
    }
  }

  // Strip leading descriptors
  for (const pattern of LEADING_DESCRIPTORS) {
    clean = clean.replace(pattern, '');
  }

  // Strip trailing phrases
  for (const pattern of TRAILING_PHRASES) {
    clean = clean.replace(pattern, '');
  }

  clean = clean.trim();

  // Reject if stripped to nothing
  if (clean.length < 3) {
    return { cleanName: '', rejectReason: 'stripped-to-empty' };
  }

  // Check if single generic word (unless it's multi-word)
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    const wordLower = words[0].toLowerCase();
    if (GENERIC_WORDS.has(wordLower)) {
      return { cleanName: '', rejectReason: 'generic-word' };
    }
  }

  // Final validation: multi-word names with headline verbs (strong guardrail)
  // Reject names with headline verbs in the middle/anywhere
  if (words.length >= 2 && words.length <= 4) {
    const HEADLINE_VERBS = new Set(['has', 'have', 'is', 'are', 'was', 'were', 'raises', 'raises', 'launches', 'launching', 'raising', 'raised', 'secured', 'closed', 'announced']);
    const hasHeadlineVerb = words.some(w => HEADLINE_VERBS.has(w.toLowerCase()));
    if (hasHeadlineVerb) {
      return { cleanName: '', rejectReason: 'headline-verb-in-name' };
    }
  }

  return { cleanName: clean };
}

/**
 * Check if name looks like a headline/article title
 */
function looksLikeHeadline(name) {
  if (!name) return false;
  
  // Contains colons (often headlines)
  if (name.includes(':') && name.length > 35) return true;
  
  // Contains "vs" (comparison articles)
  if (/\b(vs\.|vs)\b/i.test(name)) return true;
  
  // Starts with headline prefixes
  if (/^(EXCLUSIVE|BREAKING|REPORT|WATCH|UPDATE|NEWS)/i.test(name)) return true;
  
  return false;
}

module.exports = {
  sanitizeStartupName,
  looksLikeHeadline,
  GENERIC_WORDS,
};
