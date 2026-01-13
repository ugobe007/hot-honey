/**
 * Domain Classifier
 * 
 * Classifies domains as publishers, investors, platforms, or company domains
 * Used to determine which domains should NOT be treated as company domains for search/discovery
 */

// Import publisher domains from publisher-classifier (or define here if you want separation)
const { PUBLISHER_BLACKLIST } = require('./publisher-classifier');

/**
 * Investor/VC/PE/accelerator domains (not company domains)
 */
const INVESTOR_DOMAINS = new Set([
  'tpg.com', 'www.tpg.com',
  'generalatlantic.com', 'www.generalatlantic.com',
  'rtp.vc', 'www.rtp.vc',
  'sequoiacap.com', 'www.sequoiacap.com',
  'a16z.com', 'www.a16z.com',
  'accel.com', 'www.accel.com',
  'kleinerperkins.com', 'www.kleinerperkins.com',
  'greylock.com', 'www.greylock.com',
  'techstars.com', 'www.techstars.com',
  // Additional investors from logs
  'summitpartners.com', 'www.summitpartners.com',
  'khoslaventures.com', 'www.khoslaventures.com',
  'initialized.com', 'www.initialized.com',
  'forerunnerventures.com', 'www.forerunnerventures.com',
  'sosv.com', 'www.sosv.com',
  'everywhere.vc', 'www.everywhere.vc',
  'rre.com', 'www.rre.com',
  'shastaventures.com', 'www.shastaventures.com',
  'tcv.com', 'www.tcv.com'
]);

/**
 * Social platforms, marketplaces, directories, communities
 */
const PLATFORM_DOMAINS = new Set([
  'replicate.com', 'www.replicate.com',
  'producthunt.com', 'www.producthunt.com',
  'github.com', 'www.github.com',
  'linkedin.com', 'www.linkedin.com',
  'twitter.com', 'www.twitter.com',
  'x.com', 'www.x.com',
  'ycombinator.com', 'www.ycombinator.com', // Accelerator/platform, not investor domain
  'news.ycombinator.com', // HN itself
  // Community/platform sites
  'indiehackers.com', 'www.indiehackers.com'
]);

/**
 * Normalize domain (remove protocol, www, path)
 */
function normalizeDomain(d) {
  return (d || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

/**
 * Check if domain is a publisher
 */
function isPublisherDomain(domain) {
  const d = normalizeDomain(domain);
  return PUBLISHER_BLACKLIST.has(d);
}

/**
 * Check if domain is a non-company domain (publisher, investor, or platform)
 */
function isNonCompanyDomain(rawInput, normalizedHost) {
  if (!normalizedHost) {
    return { isNonCompany: false, reason: 'no_host' };
  }
  
  const d = normalizeDomain(normalizedHost);
  
  // Check publisher domains
  if (PUBLISHER_BLACKLIST.has(d)) {
    return { isNonCompany: true, reason: 'publisher_blacklist' };
  }
  
  // Check investor domains
  if (INVESTOR_DOMAINS.has(d)) {
    return { isNonCompany: true, reason: 'investor_domain' };
  }
  
  // Check platform domains
  if (PLATFORM_DOMAINS.has(d)) {
    return { isNonCompany: true, reason: 'platform_domain' };
  }
  
  return { isNonCompany: false, reason: 'company_domain' };
}

module.exports = {
  normalizeDomain,
  isPublisherDomain,
  isNonCompanyDomain,
  PUBLISHER_DOMAINS: PUBLISHER_BLACKLIST, // Alias for compatibility
  INVESTOR_DOMAINS,
  PLATFORM_DOMAINS,
};
