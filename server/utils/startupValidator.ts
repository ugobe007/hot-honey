/**
 * Startup Candidate Validator
 * 
 * Filters out headline-like "startups" and invalid company candidates
 * before they enter the startup_uploads table
 */

import { isNonCompanyDomain, normalizeDomain, PUBLISHER_BLACKLIST, PLATFORM_DOMAINS } from './domainClassifier';

interface StartupCandidate {
  name: string;
  website?: string | null;
  sourceUrl?: string;
}

/**
 * Common stopwords for headline detection
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'on', 'at', 'to', 'of', 'as', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might'
]);

/**
 * Check if startup name looks like a headline (should be rejected)
 */
export function shouldRejectStartupCandidate(candidate: StartupCandidate): { reject: boolean; reason?: string } {
  const { name, website, sourceUrl } = candidate;
  
  if (!name || name.trim().length < 3) {
    return { reject: true, reason: 'name_too_short' };
  }

  const nameLower = name.toLowerCase().trim();
  const nameWords = nameLower.split(/\s+/);

  // A) Headline patterns
  
  // Contains "vs." or "vs"
  if (/\b(vs\.|vs)\b/i.test(name)) {
    return { reject: true, reason: 'headline_vs_pattern' };
  }

  // Contains colon and is long
  if (name.includes(':') && name.length > 35) {
    return { reject: true, reason: 'headline_colon_pattern' };
  }

  // Ends with headline-y words
  const headlineEndings = /\b(to|vs|dozens|alerts|report|exclusive|breaking|watch)\b$/i;
  if (headlineEndings.test(name)) {
    return { reject: true, reason: 'headline_ending' };
  }

  // Starts with headline prefixes
  const headlinePrefixes = /^(EXCLUSIVE|BREAKING|REPORT|WATCH|UPDATE|NEWS|ANALYSIS)\b/i;
  if (headlinePrefixes.test(name)) {
    return { reject: true, reason: 'headline_prefix' };
  }

  // Too many stopwords (headline-like)
  const stopwordCount = nameWords.filter(w => STOPWORDS.has(w)).length;
  const stopwordRatio = nameWords.length > 0 ? stopwordCount / nameWords.length : 0;
  if (stopwordRatio > 0.35) {
    return { reject: true, reason: 'headline_stopword_ratio' };
  }

  // B) Website domain checks
  
  if (website) {
    const domainCheck = isNonCompanyDomain(website);
    if (domainCheck.isNonCompany) {
      // If domain is publisher/platform AND name also looks headline-like, reject
      // (Allow company websites that happen to be on platforms)
      const nameLooksHeadline = nameLower.length > 30 || stopwordRatio > 0.25;
      if (nameLooksHeadline && (domainCheck.reason === 'publisher_blacklist' || domainCheck.reason === 'platform_domain')) {
        return { reject: true, reason: `website_${domainCheck.reason}_with_headline_name` };
      }
    }
  }

  return { reject: false };
}

/**
 * Generate canonical key for entity deduplication
 * Format: domain:<normalized_domain> or name:<normalized_name>
 */
export function generateCanonicalKey(name: string, website?: string | null): string {
  // Prefer domain-based canonical key if available
  if (website) {
    const normalized = normalizeDomain(website);
    if (normalized && !isNonCompanyDomain(website).isNonCompany) {
      return `domain:${normalized}`;
    }
  }

  // Fallback to name-based canonical key
  const normalizedName = name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s+(inc|llc|ltd|limited|corp|corporation|gmbh|s\.a\.|sa|plc|ag|bv|kg|oy|pte|srl|spa|co\.|company)\s*$/i, '')
    // Remove punctuation and quotes
    .replace(/[^\w\s]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return `name:${normalizedName}`;
}
