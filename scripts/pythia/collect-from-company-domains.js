#!/usr/bin/env node
/**
 * E1 Enhancement: RSS/Blog Feeds from Company Domains
 * 
 * Multi-source speech ingestion - discover and collect from company blog feeds
 * 
 * Discover via:
 * - /feed, /rss.xml, /blog/rss, sitemap.xml
 * 
 * Store posts as:
 * - Tier 2 (semi-earned) - default for blog posts
 * - Tier 1.5 (or Tier 2 with high confidence) - founder-authored posts
 * 
 * Implementing EXACTLY as specified in architecture document.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Parser = require('rss-parser');
const crypto = require('crypto');
const { classifyTier } = require('./utils/tier-classifier');
const { isPublisherDomain } = require('./utils/publisher-classifier');
const { inferCompanyDomainFromPageUrl } = require('./utils/company-domain-infer');
const cheerio = require('cheerio');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rssParser = new Parser({
  timeout: 10000,
  customFields: {
    item: ['content:encoded', 'description']
  }
});

/**
 * Generate hash for deduplication
 */
function hashText(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Normalize absolute URL (ensure it has http/https scheme)
 * Returns null for invalid/empty URLs (strict)
 */
function normalizeAbsoluteUrl(url) {
  if (url == null) return null;
  const s = String(url).trim();
  if (!s) return null; // Reject empty strings
  
  // Already absolute URL
  if (/^https?:\/\//i.test(s)) return s;
  
  // Looks like a bare domain (optionally with a path)
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) {
    return `https://${s}`;
  }
  
  // Reject invalid URLs (strict)
  return null;
}

/**
 * Known news/publisher hosts (reject these)
 * Note: Publisher blocking is now primarily handled by publisher-classifier.js,
 * but this list is kept for backward compatibility in normalizeCompanyDomain()
 */
const NEWS_HOSTS = new Set([
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
  'finsmes.com', 'www.finsmes.com'
]);

/**
 * Non-company hosts (aggregators, job boards, etc.)
 */
const NON_COMPANY_HOSTS = new Set([
  'wellfound.com', 'www.wellfound.com', 'angel.co',
  'linkedin.com', 'www.linkedin.com',
  'crunchbase.com', 'www.crunchbase.com',
  'pitchbook.com', 'www.pitchbook.com',
  'producthunt.com', 'www.producthunt.com',
  'indiehackers.com', 'www.indiehackers.com'
]);

/**
 * Check if domain looks like a non-company host (publisher/aggregator)
 */
function looksLikeNonCompanyHost(domain) {
  const d = (domain || '').toLowerCase();
  return NEWS_HOSTS.has(d) || NON_COMPANY_HOSTS.has(d);
}

/**
 * Normalize company domain (enforce hostname-only, reject news hosts and aggregators)
 */
function normalizeCompanyDomain(input) {
  if (!input) return null;

  // If it's not a URL, treat as hostname-ish
  const isUrl = /^https?:\/\//i.test(input);

  let host = null;
  let pathname = '';
  try {
    const url = isUrl ? new URL(input) : new URL(`https://${input}`);
    host = url.hostname;
    pathname = url.pathname;
  } catch {
    return null;
  }

  host = host.replace(/^www\./, '').toLowerCase();

  // Reject publisher/news hosts
  if (NEWS_HOSTS.has(host)) return null;
  
  // Reject non-company aggregators
  if (NON_COMPANY_HOSTS.has(host)) return null;

  // Reject if pathname contains non-company patterns (and host is an aggregator)
  if (pathname && (pathname.includes('/discover/') || pathname.includes('/team') || pathname.includes('/research/') || pathname.includes('/news/'))) {
    // If it's a known aggregator, reject; otherwise allow (could be company's /team page)
    if (NON_COMPANY_HOSTS.has(host)) return null;
  }

  return host;
}

/**
 * Resolve relative URL against a base URL
 * Returns null for invalid/empty URLs (strict)
 */
function resolveRelativeUrl(url, baseUrl) {
  if (url == null) return null;
  const s = String(url).trim();
  if (!s) return null; // Reject empty strings
  
  // Already absolute URL
  if (/^https?:\/\//i.test(s)) return s;
  
  // Need baseUrl to resolve relative URLs
  if (!baseUrl) return null;
  const base = String(baseUrl).trim();
  if (!base) return null;
  
  const baseNormalized = base.endsWith('/') ? base.slice(0, -1) : base;
  return s.startsWith('/') ? `${baseNormalized}${s}` : `${baseNormalized}/${s}`;
}

/**
 * Sniff feed URL to validate it's actually a feed (RSS/Atom/JSON Feed)
 */
async function sniffFeedUrl(url) {
  // small range sniff + content-type gating
  const resp = await axios.get(url, {
    timeout: 8000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': 'PythiaBot/0.1 (+https://pyth.ai)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/plain;q=0.8, */*;q=0.5',
      'Range': 'bytes=0-65535'
    },
    validateStatus: s => s < 400
  });

  const ctype = (resp.headers['content-type'] || '').toLowerCase();
  const body = (typeof resp.data === 'string' ? resp.data : '') || '';
  const head = body.slice(0, 65535).trimStart();

  // Fast allowlist: explicit feed content-types
  const feedCtype =
    ctype.includes('application/rss+xml') ||
    ctype.includes('application/atom+xml') ||
    ctype.includes('application/xml') ||
    ctype.includes('text/xml') ||
    ctype.includes('application/feed+json') ||
    ctype.includes('application/json');

  // Strong sniff for RSS/Atom/JSON Feed
  const looksRss = /<rss[\s>]/i.test(head) || /<channel[\s>]/i.test(head);
  const looksAtom = /<feed[\s>][\s\S]{0,200}xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom["']/i.test(head) || /<feed[\s>]/i.test(head);
  const looksJsonFeed = /"version"\s*:\s*"https?:\/\/jsonfeed\.org\/version\//i.test(head) || /"items"\s*:\s*\[/i.test(head);

  const ok = (feedCtype && (looksRss || looksAtom || looksJsonFeed)) || (looksRss || looksAtom || looksJsonFeed);

  return { ok, kind: looksJsonFeed ? 'jsonfeed' : looksAtom ? 'atom' : looksRss ? 'rss' : 'unknown', ctype };
}

/**
 * Fetch text from URL, handling gzip compression
 */
async function fetchTextMaybeGzip(url, timeoutMs = 8000) {
  const resp = await axios.get(url, {
    timeout: timeoutMs,
    maxRedirects: 5,
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'PythiaBot/0.1 (+https://pyth.ai)',
      'Accept': 'application/xml,text/xml,text/plain,*/*',
      'Range': 'bytes=0-1048576'
    },
    validateStatus: s => s < 400
  });

  const buf = Buffer.from(resp.data);
  const ctype = (resp.headers['content-type'] || '').toLowerCase();
  const enc = (resp.headers['content-encoding'] || '').toLowerCase();

  // gzip by header OR by extension OR by magic bytes
  const isGzip = enc.includes('gzip') || url.endsWith('.gz') || (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b);
  if (isGzip) {
    const zlib = require('zlib');
    return zlib.gunzipSync(buf).toString('utf8');
  }
  return buf.toString('utf8');
}

/**
 * Parse sitemap XML (handles both urlset and sitemapindex)
 */
function parseSitemap(xmlText) {
  const xml = (xmlText || '').toString();
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const isUrlset = /<urlset[\s>]/i.test(xml);

  // Pull <loc> and optionally <lastmod>
  // For urlset, lastmod is inside same <url> block
  if (isUrlset) {
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || [];
    const entries = [];
    for (const block of urlBlocks) {
      const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/i) || [])[1]?.trim();
      if (!loc) continue;
      const lastmod = (block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i) || [])[1]?.trim();
      entries.push({ loc, lastmod: lastmod || null });
    }
    return { isIndex: false, entries };
  }

  // sitemapindex: <sitemap><loc>child</loc></sitemap>
  if (isIndex) {
    const sitemapBlocks = xml.match(/<sitemap>[\s\S]*?<\/sitemap>/gi) || [];
    const entries = [];
    for (const block of sitemapBlocks) {
      const loc = (block.match(/<loc>([\s\S]*?)<\/loc>/i) || [])[1]?.trim();
      if (loc) entries.push(loc);
    }
    return { isIndex: true, entries };
  }

  // fallback: just grab locs
  const locs = (xml.match(/<loc>([\s\S]*?)<\/loc>/gi) || [])
    .map(m => m.replace(/<\/?loc>/gi, '').trim())
    .filter(Boolean);

  // If it looks like it's mostly sitemaps, treat as index
  const sitemapy = locs.filter(u => /sitemap/i.test(u)).length;
  const isIndexHeuristic = sitemapy >= Math.max(1, Math.floor(locs.length * 0.6));
  return { isIndex: isIndexHeuristic, entries: locs };
}

/**
 * Score sitemap URL to prioritize blog/post sitemaps
 */
function scoreSitemapUrl(url) {
  const u = (url || '').toLowerCase();
  let s = 0;
  if (u.includes('post')) s += 5;
  if (u.includes('blog')) s += 4;
  if (u.includes('news')) s += 2;
  if (u.includes('page')) s -= 1;
  if (u.endsWith('.gz')) s += 1;
  return s;
}

/**
 * Discover RSS/Atom feeds from HTML <link rel="alternate"> tags
 */
async function discoverFromHtml(base) {
  try {
    const resp = await axios.get(base, { 
      timeout: 8000, 
      maxRedirects: 5,
      headers: { 'User-Agent': 'PythiaBot/0.1' }
    });
    const html = resp.data || '';

    // RSS/Atom autodiscovery tags
    const linkRe = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
    const hrefRe = /href=["']([^"']+)["']/i;
    const typeRe = /type=["'](application\/(rss\+xml|atom\+xml|feed\+json)|text\/xml)["']/i;

    const found = [];
    const links = html.match(linkRe) || [];
    for (const tag of links) {
      if (!typeRe.test(tag)) continue;
      const m = tag.match(hrefRe);
      if (!m) continue;
      const resolvedUrl = resolveRelativeUrl(m[1], base);
      const url = resolvedUrl ? normalizeAbsoluteUrl(resolvedUrl) : null;
      if (url) found.push(url);
    }
    return found;
  } catch {
    return [];
  }
}

/**
 * Discover sitemap URLs from robots.txt
 */
async function discoverSitemaps(base) {
  const sitemaps = [];
  try {
    const robotsUrl = `${base}/robots.txt`;
    const resp = await axios.get(robotsUrl, { timeout: 5000 });
    const lines = String(resp.data).split('\n');
    for (const line of lines) {
      const m = line.match(/^sitemap:\s*(\S+)/i);
      if (m) sitemaps.push(m[1].trim());
    }
  } catch {}
  // Default fallback
  sitemaps.push(`${base}/sitemap.xml`);
  return Array.from(new Set(sitemaps));
}

/**
 * Check if URL looks like a blog post
 */
function looksLikeBlogUrl(url) {
  return /(\/blog\/|\/posts\/|\/news\/|\/updates\/|\/insights\/|\/article\/)/i.test(url)
    && !/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip|tar|gz)(\?|$)/i.test(url);
}

/**
 * Extract main text from HTML page (simple heuristic extraction)
 */
function extractMainText(html) {
  try {
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, aside').remove();
    
    // Try to find main content areas
    const selectors = ['article', 'main', '[role="main"]', '.post-content', '.entry-content', '.content'];
    let text = '';
    
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        text = element.text();
        if (text.trim().length > 400) break;
      }
    }
    
    // Fallback: use body text
    if (text.trim().length < 400) {
      text = $('body').text();
    }
    
    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  } catch (e) {
    // Fallback: simple regex extraction
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * Discover RSS feed URLs from domain (Rung 1: RSS/Atom/JSON Feed)
 */
async function discoverRSSFeeds(domain) {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const feedPaths = [
    '/feed',
    '/rss',
    '/rss.xml',
    '/feed.xml',
    '/blog/feed',
    '/blog/rss',
    '/blog/rss.xml',
    '/blog/feed.xml',
    '/news/feed',
    '/updates/feed'
  ];
  
  const discoveredFeeds = [];
  
  // Rung 1A: Try common feed paths (validate via content-type + sniff)
  for (const path of feedPaths) {
    try {
      const feedUrl = `${base}${path}`;
      const { ok } = await sniffFeedUrl(feedUrl);
      if (ok) discoveredFeeds.push(feedUrl);
    } catch (e) {
      // Feed doesn't exist at this path, continue
    }
  }
  
  // Rung 1B: HTML autodiscovery (<link rel="alternate">)
  try {
    const htmlFeeds = await discoverFromHtml(base);
    htmlFeeds.forEach(u => {
      if (u && !discoveredFeeds.includes(u)) discoveredFeeds.push(u);
    });
  } catch (e) {
    // ignore
  }
  
  // Rung 1C: Try sitemap.xml to discover feed URLs
  try {
    const sitemapUrl = `${base}/sitemap.xml`;
    const sitemapText = await fetchTextMaybeGzip(sitemapUrl, 8000);
    
    // Look for feed URLs in sitemap
    const feedMatches = sitemapText.match(/https?:\/\/[^\s<>"]+\/(?:feed|rss)[^\s<>"]*\.xml/gi);
    if (feedMatches) {
      feedMatches.forEach(url => {
        if (!discoveredFeeds.includes(url)) {
          discoveredFeeds.push(url);
        }
      });
    }
  } catch (e) {
    // No sitemap or error, continue
  }
  
  // Final validation pass (dedupe + confirm parseable feed)
  const unique = Array.from(new Set(discoveredFeeds));
  const validated = [];
  for (const u of unique.slice(0, 12)) { // cap validation work
    try {
      const { ok } = await sniffFeedUrl(u);
      if (ok) validated.push(u);
    } catch {}
  }
  return validated;
}

/**
 * Check if post is founder-authored (Tier 1.5 vs Tier 2)
 */
function isFounderAuthored(post, author) {
  const text = `${post.title || ''} ${post.contentSnippet || ''} ${author || ''}`.toLowerCase();
  
  // Founder indicators
  const founderKeywords = [
    'founder', 'co-founder', 'ceo', 'cto', 'cofounder',
    'i built', 'we built', 'we started', 'i started',
    'my company', 'our journey', 'why we built'
  ];
  
  return founderKeywords.some(keyword => text.includes(keyword));
}

/**
 * Extract blog pages from sitemap (Rung 2: Sitemap content extraction)
 */
async function extractPagesFromSitemap(base) {
  const pages = [];
  const seenSitemaps = new Set();
  const candidates = [];

  try {
    const sitemaps = await discoverSitemaps(base);
    // Seed up to 6 sitemap URLs (many sites have multiple)
    candidates.push(...(sitemaps || []).slice(0, 6));

    // BFS sitemap expansion: handle sitemapindex -> child sitemaps
    while (candidates.length && seenSitemaps.size < 10 && pages.length < 20) {
      const sitemapUrl = candidates.shift();
      if (!sitemapUrl || seenSitemaps.has(sitemapUrl)) continue;
      seenSitemaps.add(sitemapUrl);

      let xml = '';
      try {
        xml = await fetchTextMaybeGzip(sitemapUrl, 10000);
      } catch (e) {
        continue;
      }

      const { isIndex, entries } = parseSitemap(xml);
      if (!entries.length) continue;

      if (isIndex) {
        // entries are sitemap URLs; enqueue them (prefer post/blog sitemaps)
        const sorted = entries.sort((a, b) => scoreSitemapUrl(b) - scoreSitemapUrl(a));
        for (const u of sorted.slice(0, 8)) {
          if (!seenSitemaps.has(u)) candidates.push(u);
        }
        continue;
      }

      // urlset: entries are page URLs with optional lastmod
      const bloggy = entries
        .filter(e => looksLikeBlogUrl(e.loc))
        .map(e => ({ url: e.loc, t: e.lastmod ? Date.parse(e.lastmod) : 0 }));

      bloggy.sort((a, b) => (b.t || 0) - (a.t || 0));
      pages.push(...bloggy.slice(0, 12).map(x => x.url));
    }
  } catch (e) {
    // ignore
  }

  // Dedupe + cap
  return Array.from(new Set(pages)).slice(0, 10);
}

/**
 * Extract snippets from blog pages (HTML pages, not RSS)
 */
async function extractSnippetsFromPages(pageUrls, base) {
  const snippets = [];
  
  for (const pageUrl of pageUrls.slice(0, 10)) {
    try {
      const response = await axios.get(pageUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'PythiaBot/0.1' }
      });
      
      const html = response.data || '';
      const text = extractMainText(html);
      
      if (text.length < 400) continue; // Too short
      
      // Extract title from HTML
      const $ = cheerio.load(html);
      const title = $('title').first().text() || $('h1').first().text() || '';
      const fullText = `${title}\n\n${text}`.trim();
      
      // Determine tier (blog pages default to Tier 2)
      const tier = classifyTier('company_blog', 'company_blog', fullText, {});
      
      const normalizedUrl = normalizeAbsoluteUrl(pageUrl);
      
      // Hard skip: never insert a row without a stable URL
      // Also reject https:// as garbage (can happen if normalization fails)
      if (!normalizedUrl || normalizedUrl === 'https://' || normalizedUrl.trim() === '') {
        continue;
      }
      
      snippets.push({
        text: fullText.substring(0, 2000),
        source_url: normalizedUrl, // Normalize URL (ensure http/https scheme)
        date_published: null, // Can't reliably extract from page
        source_type: 'company_blog',
        tier: tier,
        context_label: 'company_blog',
        is_founder_authored: false,
        title: title.substring(0, 200)
      });
    } catch (e) {
      // Skip this page
    }
  }
  
  return snippets;
}

/**
 * Extract snippets from RSS feed items
 */
function extractSnippetsFromFeed(feedItems, feedUrl, domain) {
  const snippets = [];
  
  for (const item of feedItems) {
    const content = item.content || item.contentSnippet || item.description || '';
    const title = item.title || '';
    
    // Combine title + content for analysis
    const fullText = `${title}\n\n${content}`.trim();
    
    if (fullText.length < 200) continue; // Too short
    
    // Determine tier using shared classifier (Tier 2 default, Tier 3 if PR-dominant)
    const isFounder = isFounderAuthored(item, item.creator || item.author);
    const tier = classifyTier('company_blog', isFounder ? 'founder_blog' : 'company_blog', fullText, {
      isFounderAuthored: isFounder
    });
    const context = isFounder ? 'founder_blog' : 'company_blog';
    
    // Normalize URL with fallback chain: link -> guid -> feedUrl
    // guid is sometimes the permalink when link is missing
    const urlCandidate = item.link || item.guid || feedUrl;
    const normalizedUrl = normalizeAbsoluteUrl(urlCandidate);
    
    // Hard skip: never insert a row without a stable URL
    // Also reject https:// as garbage (can happen if normalization fails)
    if (!normalizedUrl || normalizedUrl === 'https://' || normalizedUrl.trim() === '') {
      continue;
    }
    
    // Determine source_type: company_blog vs publisher_discovery
    // Only use company_blog if the URL domain matches the company's domain
    // If it's a publisher/investor/platform domain, skip (should be handled by publisher classifier earlier)
    // Note: This function is called from collectFromCompanyDomain which already filters publishers,
    // but we check here as a defensive measure
    const urlDomain = normalizeCompanyDomain(normalizedUrl);
    // If we're in this function, domain should already be validated, so use company_blog
    // But if URL domain doesn't match expected company domain pattern, it might be misclassified
    
    snippets.push({
      text: fullText.substring(0, 2000), // Limit length
      source_url: normalizedUrl, // Normalize URL (ensure http/https scheme)
      date_published: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      source_type: 'company_blog',
      tier: tier,
      context_label: context,
      is_founder_authored: isFounder,
      title: title
    });
  }
  
  return snippets;
}

/**
 * Collect snippets from company domain RSS feeds
 */
async function collectFromCompanyDomain(startup) {
  const raw = startup.website || startup.source_url || null;
  if (!raw) {
    return { saved: 0, skipped: 0, extracted: 0, duplicates: 0, insertErrors: 0, error: 'No domain' };
  }
  
  let domain = normalizeCompanyDomain(raw);
  if (!domain) {
    return { saved: 0, skipped: 0, extracted: 0, duplicates: 0, insertErrors: 0, error: 'No valid company domain' };
  }
  
  // If it's a NON_COMPANY_HOSTS / NEWS_HOSTS URL, attempt inference once
  if (looksLikeNonCompanyHost(domain)) {
    const inferred = await inferCompanyDomainFromPageUrl(raw);
    if (inferred && !looksLikeNonCompanyHost(inferred)) {
      console.log(`   🧭 inferred company domain from page: ${domain} -> ${inferred}`);
      domain = inferred;
    } else {
      return { saved: 0, skipped: 0, extracted: 0, duplicates: 0, insertErrors: 0, error: 'Non-company host (no inferred domain)' };
    }
  }
  
  // Check if domain is a publisher (fail fast - don't scrape publisher RSS)
  const publisherCheck = isPublisherDomain(raw, domain);
  if (publisherCheck.isPublisher) {
    return { saved: 0, skipped: 0, extracted: 0, duplicates: 0, insertErrors: 0, error: `No valid company domain (publisher: ${publisherCheck.reason})` };
  }
  
  console.log(`   🌐 domain raw="${raw}" -> normalized="${domain}"`);
  
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const t0 = Date.now();
  let feeds = [];
  let pages = [];
  
  try {
    // Rung 1: Discover RSS feeds
    feeds = await discoverRSSFeeds(domain);
    console.log(`   🧭 RSS rung: feedsFound=${feeds.length}`);
    
    let allSnippets = [];
    let rssItems = 0;
    let rssSnips = 0;
    
    if (feeds.length > 0) {
      // Parse each feed
      for (const feedUrl of feeds.slice(0, 3)) { // Limit to 3 feeds per domain
        try {
          const feed = await rssParser.parseURL(feedUrl);
          const items = (feed.items || []);
          rssItems += items.length;
          const snippets = extractSnippetsFromFeed(items.slice(0, 10), feedUrl, domain);
          rssSnips += snippets.length;
          allSnippets.push(...snippets);
        } catch (e) {
          console.log(`   ⚠️  feed parse failed: ${feedUrl} :: ${e.message}`);
        }
      }
    }
    
    console.log(`   🧾 RSS rung: items=${rssItems} extractedSnippets=${rssSnips}`);
    
    // Rung 2: If no RSS, try sitemap page extraction
    if (rssSnips === 0) {
      pages = await extractPagesFromSitemap(base);
      console.log(`   🧭 SITEMAP rung: pagesFound=${pages.length}`);
      
      if (pages.length > 0) {
        const pageSnippets = await extractSnippetsFromPages(pages, base);
        allSnippets.push(...pageSnippets);
      }
    }
    
    console.log(`   ⏱️  domain done in ${Date.now() - t0}ms`);
    
    const extractedSnippets = allSnippets.length;
    
    if (extractedSnippets === 0) {
      return { saved: 0, skipped: 0, extracted: 0, duplicates: 0, insertErrors: 0, error: feeds.length > 0 ? 'No snippets extracted from feeds' : 'No RSS feeds or sitemap pages found' };
    }
    
    // Save snippets
    let saved = 0;
    let duplicatesSkipped = 0;
    let insertErrors = 0;
    
    for (const snippet of allSnippets) {
      const textHash = hashText(snippet.text);
      
      // Check for duplicates
      const { data: existing } = await supabase
        .from('pythia_speech_snippets')
        .select('id')
        .eq('text_hash', textHash)
        .eq('entity_id', startup.id)
        .maybeSingle();
      
      if (existing) {
        duplicatesSkipped++;
        continue;
      }
      
      // Debug: Check for missing tier
      if (!snippet.tier) {
        console.log(`   ⚠️ tier missing for ${startup.name}, ${snippet.source_url}`);
      }
      
      // Hard skip: never insert a row without a stable URL
      // Also reject https:// as garbage (can happen if normalization fails)
      if (!snippet.source_url || snippet.source_url === 'https://' || snippet.source_url.trim() === '') {
        insertErrors++;
        continue;
      }
      
      // Save snippet
      const { error } = await supabase
        .from('pythia_speech_snippets')
        .insert({
          entity_id: startup.id,
          entity_type: 'startup',
          text: snippet.text,
          source_url: snippet.source_url,
          date_published: snippet.date_published,
          source_type: snippet.source_type,
          tier: snippet.tier,
          context_label: snippet.context_label,
          text_hash: textHash
        });
      
      if (error) {
        console.error(`   ❌ Error saving snippet: ${error.message}`);
        insertErrors++;
      } else {
        saved++;
      }
    }
    
    return { 
      saved, 
      skipped: duplicatesSkipped, 
      extracted: extractedSnippets,
      duplicates: duplicatesSkipped,
      insertErrors,
      error: null 
    };
  } catch (error) {
    return { saved: 0, skipped: 0, extracted: 0, duplicates: 0, insertErrors: 0, error: error.message };
  }
}

/**
 * Main collection function
 */
async function collectFromCompanyDomains(limit = 50) {
  console.log('\n📝 E1 ENHANCEMENT: COMPANY DOMAIN RSS/BLOG COLLECTION');
  console.log('='.repeat(60));
  
  // Fetch startups with websites (get more candidates to filter)
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, source_url')
    .eq('status', 'approved')
    .not('website', 'is', null)
    .limit(limit * 5); // Get 5x candidates to filter
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups with websites found.');
    return;
  }
  
  // Filter out startups that already have company_blog snippets
  const ids = startups.map(s => s.id);
  const { data: existing } = await supabase
    .from('pythia_speech_snippets')
    .select('entity_id')
    .in('entity_id', ids)
    .eq('source_type', 'company_blog');
  
  const hasBlog = new Set((existing || []).map(e => e.entity_id));
  const filtered = startups.filter(s => !hasBlog.has(s.id)).slice(0, limit);
  
  console.log(`📊 Found ${filtered.length} startups to process (filtered from ${startups.length} candidates, ${hasBlog.size} already have blog snippets)\n`);
  
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalExtracted = 0;
  let totalDuplicates = 0;
  let totalInsertErrors = 0;
  let processed = 0;
  let withFeeds = 0;
  let withNewSnippets = 0;
  
  for (const startup of filtered) {
    processed++;
    
    const result = await collectFromCompanyDomain(startup);
    
    if (result.error && result.error !== 'No RSS feeds found' && !result.error.startsWith('No valid company domain')) {
      console.error(`   ⚠️  ${startup.name}: ${result.error}`);
    } else if (result.error === 'No RSS feeds found') {
      // Silent skip for no feeds
    } else if (result.error && result.error.startsWith('No valid company domain')) {
      // Silent skip for invalid domains (including publishers)
    } else {
      // Feeds were discovered (even if no snippets saved)
      withFeeds++;
      if (result.saved > 0) {
        withNewSnippets++;
        console.log(`   ✅ ${startup.name}: ${result.saved} saved, ${result.extracted} extracted, ${result.duplicates} duplicates, ${result.insertErrors} errors`);
      } else {
        console.log(`   📡 ${startup.name}: ${result.extracted} extracted, ${result.duplicates} duplicates, ${result.insertErrors} errors`);
      }
    }
    
    totalSaved += result.saved || 0;
    totalSkipped += result.skipped || 0;
    totalExtracted += result.extracted || 0;
    totalDuplicates += result.duplicates || 0;
    totalInsertErrors += result.insertErrors || 0;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (processed % 10 === 0) {
      console.log(`\n   📊 Progress: ${processed}/${filtered.length} processed (${withFeeds} with feeds, ${withNewSnippets} with new snippets, ${totalSaved} total saved)\n`);
    }
  }
  
  console.log(`\n✅ Done: ${totalSaved} snippets saved, ${totalSkipped} skipped`);
  console.log(`   📊 ${withFeeds} startups had RSS feeds`);
  console.log(`   📊 ${withNewSnippets} startups had new snippets saved`);
  console.log(`   📊 ${totalExtracted} total extracted, ${totalDuplicates} duplicates, ${totalInsertErrors} insert errors\n`);
}

// Run if called directly
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
  collectFromCompanyDomains(limit).catch(console.error);
}

module.exports = { collectFromCompanyDomain, discoverRSSFeeds };
