/**
 * Domain Classifier (TypeScript)
 * 
 * Classifies domains as publishers, investors, platforms, or company domains
 * Used to determine which domains should NOT be treated as company domains for search/discovery
 */

/**
 * Publisher domains (hard blacklist) - news/publisher sites
 */
const PUBLISHER_BLACKLIST = new Set([
  'pulse2.com', 'www.pulse2.com',
  'tech.eu', 'www.tech.eu',
  'rockhealth.com', 'www.rockhealth.com',
  'techcrunch.com', 'www.techcrunch.com',
  'venturebeat.com', 'www.venturebeat.com',
  'theinformation.com', 'www.theinformation.com',
  'crunchbase.com', 'www.crunchbase.com',
  'pitchbook.com', 'www.pitchbook.com',
  'cbinsights.com', 'www.cbinsights.com',
  'cointelegraph.com', 'www.cointelegraph.com',
  'fintechnews.org', 'www.fintechnews.org',
  'arcticstartup.com', 'www.arcticstartup.com',
  'mattermark.com', 'www.mattermark.com',
  'axios.com', 'www.axios.com',
  'finsmes.com', 'www.finsmes.com',
  'fastcompany.com', 'www.fastcompany.com',
  'techmeme.com', 'www.techmeme.com',
  'sfstandard.com', 'www.sfstandard.com',
  'forbes.com', 'www.forbes.com',
  'cnbc.com', 'www.cnbc.com',
  'bloomberg.com', 'www.bloomberg.com',
  'inc42.com', 'www.inc42.com',
  'newcomer.co', 'www.newcomer.co',
  'avc.com', 'www.avc.com',
  'everywhere.vc', 'www.everywhere.vc'
]);

/**
 * Investor/VC/PE domains (not company domains)
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
  'techstars.com', 'www.techstars.com'
]);

/**
 * Social platforms, marketplaces, directories, accelerators
 */
const PLATFORM_DOMAINS = new Set([
  'replicate.com', 'www.replicate.com',
  'producthunt.com', 'www.producthunt.com',
  'github.com', 'www.github.com',
  'linkedin.com', 'www.linkedin.com',
  'twitter.com', 'www.twitter.com',
  'x.com', 'www.x.com',
  'ycombinator.com', 'www.ycombinator.com', // Accelerator/platform, not investor domain
  'news.ycombinator.com' // HN itself
]);

/**
 * Normalize domain (remove protocol, www, path)
 */
export function normalizeDomain(d: string | null | undefined): string {
  if (!d) return '';
  return d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

/**
 * Check if domain is a publisher
 */
export function isPublisherDomain(domain: string | null | undefined): boolean {
  const d = normalizeDomain(domain);
  return PUBLISHER_BLACKLIST.has(d);
}

/**
 * Check if domain is a non-company domain (publisher, investor, or platform)
 */
export function isNonCompanyDomain(domain: string | null | undefined): { isNonCompany: boolean; reason: string } {
  if (!domain) {
    return { isNonCompany: false, reason: 'no_domain' };
  }
  
  const d = normalizeDomain(domain);
  
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

export { PUBLISHER_BLACKLIST, INVESTOR_DOMAINS, PLATFORM_DOMAINS };
