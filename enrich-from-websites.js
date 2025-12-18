#!/usr/bin/env node
/**
 * Website Scraper Enrichment
 * Scrapes startup websites to extract real data:
 * - Description from meta tags or homepage
 * - Location from contact/about pages
 * - Social links
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Simple fetch with timeout
async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Extract data from HTML
function extractFromHTML(html, url) {
  const result = {
    description: null,
    location: null,
    linkedin: null,
    twitter: null
  };

  // Meta description
  const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                   html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i) ||
                   html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  
  if (metaDesc && metaDesc[1] && metaDesc[1].length > 30) {
    result.description = metaDesc[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
  }

  // LinkedIn
  const linkedinMatch = html.match(/href=["'](https?:\/\/(www\.)?linkedin\.com\/company\/[^"']+)["']/i);
  if (linkedinMatch) {
    result.linkedin = linkedinMatch[1];
  }

  // Twitter/X
  const twitterMatch = html.match(/href=["'](https?:\/\/(www\.)?(twitter|x)\.com\/[^"']+)["']/i);
  if (twitterMatch) {
    result.twitter = twitterMatch[1];
  }

  // Location patterns
  const locationPatterns = [
    /(?:headquartered|based|located)\s+(?:in|at)\s+([A-Z][a-zA-Z\s,]+(?:CA|NY|TX|WA|MA|IL|FL|CO|GA|NC|PA|OH|AZ|MI|NJ|VA|OR|USA|UK|Germany|France|Israel|Singapore|India|China))/i,
    /([A-Z][a-z]+(?:,\s*[A-Z]{2})?)\s*(?:headquarters|office|HQ)/i,
    /<address[^>]*>([^<]+)<\/address>/i,
    /San Francisco|New York|Los Angeles|Boston|Seattle|Austin|Chicago|London|Berlin|Tel Aviv|Singapore|Bangalore/gi
  ];

  for (const pattern of locationPatterns) {
    const match = html.match(pattern);
    if (match) {
      result.location = match[1] || match[0];
      break;
    }
  }

  return result;
}

async function scrapeWebsite(url) {
  try {
    // Normalize URL
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return extractFromHTML(html, url);
  } catch (err) {
    return { error: err.message };
  }
}

async function enrichFromWebsites(options = {}) {
  const { limit = 30, dryRun = false, delay = 2000 } = options;

  console.log('🌐 Starting Website Scraper Enrichment');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE UPDATE'}`);
  console.log(`   Limit: ${limit} startups`);
  console.log(`   Delay: ${delay}ms between requests\n`);

  // Get startups with websites but missing description
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, website, description, location, linkedin')
    .not('website', 'is', null)
    .neq('website', '')
    .or('description.is.null,description.eq.,location.is.null,location.eq.')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }

  console.log(`📊 Found ${startups.length} startups with websites to scrape\n`);

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < startups.length; i++) {
    const startup = startups[i];
    console.log(`[${i + 1}/${startups.length}] ${startup.name} - ${startup.website}`);

    const scraped = await scrapeWebsite(startup.website);

    if (scraped.error) {
      console.log(`   ❌ Failed: ${scraped.error}`);
      failed++;
      continue;
    }

    const update = {};
    let hasUpdate = false;

    if (scraped.description && (!startup.description || startup.description === '')) {
      update.description = scraped.description;
      hasUpdate = true;
      console.log(`   📝 Description: ${scraped.description.slice(0, 60)}...`);
    }

    if (scraped.location && (!startup.location || startup.location === '')) {
      update.location = scraped.location;
      hasUpdate = true;
      console.log(`   📍 Location: ${scraped.location}`);
    }

    if (scraped.linkedin && !startup.linkedin) {
      update.linkedin = scraped.linkedin;
      hasUpdate = true;
      console.log(`   🔗 LinkedIn: ${scraped.linkedin}`);
    }

    if (hasUpdate) {
      enriched++;

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('startup_uploads')
          .update(update)
          .eq('id', startup.id);

        if (updateError) {
          console.log(`   ⚠️  Save failed: ${updateError.message}`);
        } else {
          console.log(`   ✅ Saved!`);
        }
      }
    } else {
      console.log(`   ⏭️  No new data found`);
    }

    // Rate limiting
    if (i < startups.length - 1) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${startups.length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes saved. Run without --dry-run to apply.');
  }

  return { enriched, failed, total: startups.length };
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 30;

enrichFromWebsites({ limit, dryRun })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
