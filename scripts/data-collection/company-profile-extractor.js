#!/usr/bin/env node
/**
 * Module B: Website "Company Profile" Extractor
 * 
 * Given startup domain:
 * - fetch homepage HTML
 * - parse: JSON-LD (schema.org), OG meta tags, footer links
 * - discover endpoints: sitemap.xml, rss.xml, /feed, robots.txt
 * - infer: category tags from nav and page titles
 * 
 * Implementing EXACTLY as specified in architecture document.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    if (!url) return null;
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Normalize URL
 */
function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Extract JSON-LD (schema.org) data
 */
function extractJSONLD(html) {
  const jsonldData = [];
  const $ = cheerio.load(html);
  
  $('script[type="application/ld+json"]').each((i, elem) => {
    try {
      const json = JSON.parse($(elem).html());
      jsonldData.push(json);
    } catch (e) {
      // Invalid JSON, skip
    }
  });
  
  return jsonldData;
}

/**
 * Extract OpenGraph meta tags
 */
function extractOpenGraph(html) {
  const $ = cheerio.load(html);
  const og = {};
  
  $('meta[property^="og:"]').each((i, elem) => {
    const property = $(elem).attr('property').replace('og:', '');
    const content = $(elem).attr('content');
    if (content) og[property] = content;
  });
  
  return og;
}

/**
 * Extract footer links (about, careers, blog, press)
 */
function extractFooterLinks(html) {
  const $ = cheerio.load(html);
  const links = {
    about: null,
    careers: null,
    blog: null,
    press: null
  };
  
  $('footer a, [class*="footer"] a').each((i, elem) => {
    const text = $(elem).text().toLowerCase().trim();
    const href = $(elem).attr('href');
    
    if (text.includes('about') && !links.about) links.about = href;
    if (text.includes('career') && !links.careers) links.careers = href;
    if (text.includes('blog') && !links.blog) links.blog = href;
    if ((text.includes('press') || text.includes('media')) && !links.press) links.press = href;
  });
  
  return links;
}

/**
 * Discover endpoints (sitemap.xml, rss.xml, /feed, robots.txt)
 */
async function discoverEndpoints(baseUrl) {
  const endpoints = {
    sitemap: null,
    rss: null,
    feed: null,
    robots: null
  };
  
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const commonPaths = [
    '/sitemap.xml',
    '/rss.xml',
    '/feed',
    '/feed.xml',
    '/blog/feed',
    '/blog/rss',
    '/robots.txt'
  ];
  
  for (const path of commonPaths) {
    try {
      const url = `${base}${path}`;
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status < 400
      });
      
      if (response.status === 200) {
        if (path.includes('sitemap')) endpoints.sitemap = url;
        if (path.includes('rss') || path.includes('feed')) endpoints.rss = url;
        if (path.includes('robots')) endpoints.robots = url;
      }
    } catch (e) {
      // Endpoint doesn't exist, continue
    }
  }
  
  return endpoints;
}

/**
 * Parse robots.txt to reveal paths
 */
async function parseRobotsTxt(robotsUrl) {
  if (!robotsUrl) return null;
  
  try {
    const response = await axios.get(robotsUrl, { timeout: 5000 });
    return response.data;
  } catch (e) {
    return null;
  }
}

/**
 * Infer category tags from nav and page titles
 */
function inferCategoryTags(html, url) {
  const $ = cheerio.load(html);
  const categories = new Set();
  
  // Keyword taxonomy (rules-based)
  const keywordMap = {
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'ai', 'neural'],
    'saas': ['software as a service', 'saas', 'cloud software'],
    'fintech': ['fintech', 'financial technology', 'payment', 'banking'],
    'healthtech': ['healthtech', 'health tech', 'medical', 'healthcare'],
    'edtech': ['edtech', 'education tech', 'learning platform'],
    'ecommerce': ['ecommerce', 'e-commerce', 'online store', 'marketplace']
  };
  
  const pageText = $('body').text().toLowerCase();
  const title = $('title').text().toLowerCase();
  const navLinks = $('nav a, [class*="nav"] a').map((i, el) => $(el).text().toLowerCase()).get();
  
  const allText = `${title} ${navLinks.join(' ')} ${pageText}`;
  
  for (const [category, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(kw => allText.includes(kw))) {
      categories.add(category);
    }
  }
  
  return Array.from(categories);
}

/**
 * Extract company profile from website
 */
async function extractCompanyProfile(domain) {
  const url = normalizeUrl(domain);
  if (!url) return null;
  
  try {
    console.log(`   🔍 Extracting profile from: ${url}`);
    
    // Fetch homepage HTML
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract structured data
    const jsonld = extractJSONLD(html);
    const og = extractOpenGraph(html);
    const footerLinks = extractFooterLinks(html);
    const categories = inferCategoryTags(html, url);
    const endpoints = await discoverEndpoints(url);
    
    // Extract basic info from JSON-LD or OG tags
    let name = og.title || $('title').text() || null;
    let description = og.description || $('meta[name="description"]').attr('content') || null;
    
    // Try to extract from JSON-LD Organization schema
    for (const item of jsonld) {
      if (item['@type'] === 'Organization' || item['@type'] === 'Corporation') {
        name = name || item.name;
        description = description || item.description;
        break;
      }
    }
    
    return {
      domain: extractDomain(url),
      name: name?.trim() || null,
      description: description?.trim() || null,
      jsonld,
      openGraph: og,
      footerLinks,
      endpoints,
      categories,
      extraction_method: 'html',
      extracted_at: new Date().toISOString(),
      source_url: url
    };
  } catch (error) {
    console.error(`   ❌ Error extracting from ${url}:`, error.message);
    return null;
  }
}

/**
 * Save company profile to startup_uploads
 */
async function saveCompanyProfile(profile, startupId) {
  if (!profile || !startupId) return false;
  
  const updates = {
    updated_at: new Date().toISOString()
  };
  
  // Update name/description if missing
  if (profile.name) updates.name = profile.name;
  if (profile.description) updates.description = profile.description;
  
  // Store extraction metadata
  updates.extraction_metadata = {
    jsonld: profile.jsonld,
    openGraph: profile.openGraph,
    footerLinks: profile.footerLinks,
    endpoints: profile.endpoints,
    extraction_method: profile.extraction_method,
    extracted_at: profile.extracted_at,
    source_url: profile.source_url
  };
  
  // Update categories if available
  if (profile.categories && profile.categories.length > 0) {
    updates.sectors = profile.categories;
  }
  
  const { error } = await supabase
    .from('startup_uploads')
    .update(updates)
    .eq('id', startupId);
  
  if (error) {
    console.error(`   ❌ Error saving profile:`, error.message);
    return false;
  }
  
  return true;
}

/**
 * Process startup website
 */
async function processStartupWebsite(startupId, website) {
  const profile = await extractCompanyProfile(website);
  if (!profile) return false;
  
  return await saveCompanyProfile(profile, startupId);
}

/**
 * Main function
 */
async function runCompanyProfileExtraction(limit = 50) {
  console.log('\n🏢 MODULE B: COMPANY PROFILE EXTRACTOR');
  console.log('='.repeat(60));
  
  // Fetch startups with websites that need extraction
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website')
    .eq('status', 'approved')
    .not('website', 'is', null)
    .limit(limit);
  
  if (error) {
    console.error('❌ Error fetching startups:', error.message);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No startups with websites found.');
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups to process\n`);
  
  let processed = 0;
  let succeeded = 0;
  
  for (const startup of startups) {
    processed++;
    const success = await processStartupWebsite(startup.id, startup.website);
    if (success) succeeded++;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (processed % 10 === 0) {
      console.log(`   📊 Progress: ${processed}/${startups.length} processed (${succeeded} succeeded)\n`);
    }
  }
  
  console.log(`\n✅ Done: ${succeeded}/${processed} profiles extracted\n`);
}

// Run if called directly
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 50;
  runCompanyProfileExtraction(limit).catch(console.error);
}

module.exports = { extractCompanyProfile, processStartupWebsite };
