#!/usr/bin/env node
/**
 * Collect Pythia Snippets from Company Blogs
 * Scrapes company blog RSS feeds and extracts snippets (Tier 3 source)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
const axios = require('axios');
const crypto = require('crypto');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
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
 * Normalize URL (ensure it has http/https scheme)
 * Returns null for invalid/empty URLs (strict)
 */
function normalizeUrl(url) {
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
 * Extract domain from URL
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Try to find RSS feed URL from company website
 * Common patterns: /feed, /rss, /blog/feed, /blog/rss, /feed.xml, /rss.xml
 */
async function findRSSFeed(website) {
  if (!website) return null;
  
  try {
    const domain = getDomain(website);
    if (!domain) return null;
    
    // Ensure website has protocol
    const baseUrl = website.startsWith('http') ? website : `https://${website}`;
    const urlObj = new URL(baseUrl);
    const base = `${urlObj.protocol}//${urlObj.host}`;
    
    // Common RSS feed paths
    const rssPaths = [
      '/feed',
      '/rss',
      '/feed.xml',
      '/rss.xml',
      '/blog/feed',
      '/blog/rss',
      '/blog/feed.xml',
      '/blog/rss.xml',
      '/news/feed',
      '/updates/feed',
      '/blog/index.xml',
      '/index.xml'
    ];
    
    // Try each path
    for (const path of rssPaths) {
      try {
        const feedUrl = `${base}${path}`;
        const response = await axios.head(feedUrl, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept 404, but not 500+
        });
        
        if (response.status === 200) {
          // Check if it's actually an RSS feed (content-type or try parsing)
          const contentType = response.headers['content-type'] || '';
          if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
            return feedUrl;
          }
        }
      } catch (err) {
        // Continue to next path
        continue;
      }
    }
    
    // Also try to find RSS link in HTML (common pattern: <link rel="alternate" type="application/rss+xml" href="...">)
    try {
      const htmlResponse = await axios.get(baseUrl, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = htmlResponse.data;
      const rssLinkMatch = html.match(/<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i);
      if (rssLinkMatch && rssLinkMatch[1]) {
        let rssUrl = rssLinkMatch[1];
        if (rssUrl.startsWith('/')) {
          rssUrl = `${base}${rssUrl}`;
        }
        return rssUrl;
      }
    } catch (err) {
      // Ignore HTML parsing errors
    }
    
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Extract snippets from blog post content
 * Looks for substantial paragraphs (60+ chars) that contain founder/company language
 */
function extractSnippetsFromPost(post) {
  const snippets = [];
  
  // Combine title, description, and content
  const content = `${post.title || ''} ${post.contentSnippet || post.content || post.description || ''}`;
  
  if (!content || content.length < 60) return snippets;
  
  // Extract substantial paragraphs (split by newlines or HTML tags)
  const paragraphs = content
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .split(/\n\n+|\r\n\r\n+/)
    .map(p => p.trim())
    .filter(p => p.length >= 60 && p.length <= 1000);
  
  // Filter for paragraphs that seem like founder/company statements
  // Look for first-person language, company references, or substantial narrative
  const relevantParagraphs = paragraphs.filter(p => {
    const lower = p.toLowerCase();
    return (
      /(?:we|i|our|the company|our team|we're|we've|we'll|founder|ceo|startup|building|launched|created)/i.test(lower) &&
      !/^(Copyright|All rights reserved|Subscribe|Follow us|Share this)/i.test(p.trim())
    );
  });
  
  // Take up to 3 most relevant paragraphs
  relevantParagraphs.slice(0, 3).forEach(para => {
    snippets.push({
      text: para.trim(),
      context: 'product', // Blog posts are usually product/company focused
      confidence: 'medium'
    });
  });
  
  return snippets;
}

/**
 * Collect snippets from a single startup's blog
 */
async function collectFromBlog(startup) {
  const link = startup.website || startup.source_url || null;
  if (!link) {
    return { saved: 0, skipped: 0, error: 'No website' };
  }
  
  try {
    // Find RSS feed
    const feedUrl = await findRSSFeed(link);
    if (!feedUrl) {
      return { saved: 0, skipped: 0, error: 'No RSS feed found' };
    }
    
    // Parse RSS feed
    const feed = await rssParser.parseURL(feedUrl);
    if (!feed || !feed.items || feed.items.length === 0) {
      return { saved: 0, skipped: 0, error: 'Empty feed' };
    }
    
    // Extract snippets from recent posts (limit to last 10 posts to avoid too much data)
    const posts = feed.items.slice(0, 10);
    let saved = 0;
    let skipped = 0;
    
    for (const post of posts) {
      const snippets = extractSnippetsFromPost(post);
      
      for (const snippet of snippets) {
        // Check for duplicates
        const textHash = hashText(snippet.text);
        const { data: existing } = await supabase
          .from('pythia_speech_snippets')
          .select('id')
          .eq('text_hash', textHash)
          .eq('entity_id', startup.id)
          .limit(1)
          .single();
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Normalize URL with fallback chain: link -> guid -> feedUrl
        // guid is sometimes the permalink when link is missing
        const urlCandidate = post.link || post.guid || feedUrl;
        const normalizedUrl = normalizeUrl(urlCandidate);
        
        // Hard skip: never insert a row without a stable URL
        // Also reject https:// as garbage (can happen if normalization fails)
        if (!normalizedUrl || normalizedUrl === 'https://' || normalizedUrl.trim() === '') {
          skipped++;
          continue;
        }
        
        // Determine source_type: company_blog vs publisher_discovery
        // Only use company_blog if the URL domain matches the company's domain
        // If it's a publisher/investor/platform domain, use publisher_discovery
        const urlDomain = normalizeDomain(normalizedUrl);
        const companyDomain = startup.website ? normalizeDomain(startup.website) : null;
        const nonCompanyCheck = isNonCompanyDomain(normalizedUrl, urlDomain);
        
        let sourceType = 'company_blog';
        let contextLabel = snippet.context;
        let tier = 3; // Default Tier 3 for blog content
        
        // If domain is publisher/investor/platform, or doesn't match company domain, it's publisher_discovery
        if (nonCompanyCheck.isNonCompany || (companyDomain && urlDomain !== companyDomain)) {
          sourceType = 'publisher_discovery';
          contextLabel = 'publisher_mention';
          tier = 3; // Publisher discovery is also Tier 3 (low signal)
        }
        
        // Save snippet
        const { error } = await supabase
          .from('pythia_speech_snippets')
          .insert({
            entity_id: startup.id,
            entity_type: 'startup',
            text: snippet.text,
            source_url: normalizedUrl, // Normalize URL (ensure http/https scheme)
            date_published: post.pubDate ? new Date(post.pubDate).toISOString() : null,
            source_type: sourceType,
            tier: tier,
            context_label: contextLabel,
            text_hash: textHash
          });
        
        if (error) {
          console.error(`   ❌ Error saving snippet: ${error.message}`);
          skipped++;
        } else {
          saved++;
        }
      }
    }
    
    return { saved, skipped, error: null };
  } catch (err) {
    return { saved: 0, skipped: 0, error: err.message };
  }
}

/**
 * Main collection function
 */
async function collectFromBlogs(limit = 100) {
  console.log('\n📝 Collecting snippets from company blogs...\n');
  
  // Fetch startups with websites
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, source_url')
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
  
  console.log(`📊 Found ${startups.length} startups with websites to check\n`);
  
  let totalSaved = 0;
  let totalSkipped = 0;
  let processed = 0;
  let withFeeds = 0;
  let noFeeds = 0;
  let errors = 0;
  
  for (const startup of startups) {
    processed++;
    const result = await collectFromBlog(startup);
    
    if (result.error) {
      if (result.error === 'No RSS feed found') {
        noFeeds++;
      } else {
        errors++;
        if (processed % 10 === 0 || result.error !== 'Empty feed') {
          console.log(`   ⚠️  ${startup.name}: ${result.error}`);
        }
      }
    } else if (result.saved > 0) {
      withFeeds++;
      console.log(`   ✅ ${startup.name}: ${result.saved} snippets saved, ${result.skipped} skipped`);
    }
    
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    
    // Small delay to avoid overwhelming servers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Progress update every 10 startups
    if (processed % 10 === 0) {
      console.log(`\n   📊 Progress: ${processed}/${startups.length} processed (${withFeeds} with feeds, ${totalSaved} total snippets saved)\n`);
    }
  }
  
  console.log(`\n✅ Done: ${totalSaved} snippets saved, ${totalSkipped} skipped`);
  console.log(`   📊 ${withFeeds} startups had RSS feeds, ${noFeeds} had no feeds, ${errors} errors\n`);
}

// CLI
const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;

collectFromBlogs(limit).catch(console.error);
