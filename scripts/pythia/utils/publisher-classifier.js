/**
 * Publisher Domain Classifier
 * 
 * Determines if a domain is a publisher/news site (not a company domain)
 * Uses hybrid approach: hard blacklist + pattern heuristics
 */

/**
 * Hard blacklist of known publishers
 */
const PUBLISHER_BLACKLIST = new Set([
  // From existing NEWS_HOSTS
  'pulse2.com', 'www.pulse2.com',
  'tech.eu', 'www.tech.eu',
  'rockhealth.com', 'www.rockhealth.com',
  'techcrunch.com', 'www.techcrunch.com',
  'venturebeat.com', 'www.venturebeat.com',
  'theinformation.com', 'www.theinformation.com',
  'crunchbase.com', 'www.crunchbase.com',
  'pitchbook.com', 'www.pitchbook.com',
  'cbinsights.com', 'www.cbinsights.com',
  // Additional publishers from logs
  'cointelegraph.com', 'www.cointelegraph.com',
  'fintechnews.org', 'www.fintechnews.org',
  'arcticstartup.com', 'www.arcticstartup.com',
  'mattermark.com', 'www.mattermark.com',
  'axios.com', 'www.axios.com',
  'finsmes.com', 'www.finsmes.com',
  // Additional publishers from recent run analysis
  'eu-startups.com', 'www.eu-startups.com',
  'newcomer.co', 'www.newcomer.co',
  'wired.com', 'www.wired.com',
  'fastcompany.com', 'www.fastcompany.com',
  'saastr.com', 'www.saastr.com',
  'techmeme.com', 'www.techmeme.com',
  'fortune.com', 'www.fortune.com',
  'medcitynews.com', 'www.medcitynews.com',
  '404media.co', 'www.404media.co',
  'sfstandard.com', 'www.sfstandard.com',
  'inc42.com', 'www.inc42.com',
  'forbes.com', 'www.forbes.com'
]);

/**
 * Publisher tokens in domain names
 */
const PUBLISHER_TOKENS = [
  'news', 'insights', 'telegraph', 'times', 'daily', 'post', 
  'journal', 'brief', 'magazine', 'media', 'press', 'blog'
];

/**
 * Publisher URL path patterns
 */
const PUBLISHER_PATH_PATTERNS = [
  /\/news\//,
  /\/research\//,
  /\/\d{4}\/\d{2}\//,  // /2026/01/, /2025/12/, etc.
  /\/press\//,
  /\/article\//,
  /\/posts\//,
  /\/blog\//
];

/**
 * Check if domain name contains publisher tokens
 */
function hasPublisherTokens(hostname) {
  const hostLower = hostname.toLowerCase();
  return PUBLISHER_TOKENS.some(token => hostLower.includes(token));
}

/**
 * Check if URL path matches publisher patterns
 */
function hasPublisherPath(rawUrl) {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    return PUBLISHER_PATH_PATTERNS.some(pattern => pattern.test(url.pathname));
  } catch {
    return false;
  }
}

/**
 * Classify if a domain is a publisher
 * 
 * @param {string} rawInput - Raw input (URL or hostname)
 * @param {string} normalizedHost - Normalized hostname (from normalizeCompanyDomain)
 * @returns {object} { isPublisher: boolean, reason: string }
 */
function isPublisherDomain(rawInput, normalizedHost) {
  if (!normalizedHost) {
    return { isPublisher: false, reason: 'no_host' };
  }

  // Step 1: Hard blacklist (fast)
  if (PUBLISHER_BLACKLIST.has(normalizedHost)) {
    return { isPublisher: true, reason: 'blacklist' };
  }

  // Step 2: Pattern heuristic - publisher tokens in hostname
  if (hasPublisherTokens(normalizedHost)) {
    return { isPublisher: true, reason: 'publisher_tokens' };
  }

  // Step 3: Pattern heuristic - deep paths in raw URL (if provided)
  // Only applies if we have a raw URL with a path AND hostname has publisher tokens
  // (More conservative: don't reject just because of path, unless hostname also looks like publisher)
  if (rawInput && (rawInput.includes('/') || rawInput.startsWith('http'))) {
    if (hasPublisherPath(rawInput) && hasPublisherTokens(normalizedHost)) {
      return { isPublisher: true, reason: 'publisher_path_and_tokens' };
    }
  }

  return { isPublisher: false, reason: 'company_domain' };
}

module.exports = {
  isPublisherDomain,
  PUBLISHER_BLACKLIST,
  PUBLISHER_TOKENS
};
