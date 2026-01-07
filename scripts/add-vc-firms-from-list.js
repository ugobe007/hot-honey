#!/usr/bin/env node
/**
 * ADD VC FIRMS FROM LIST
 * ======================
 * Adds VC firms from a provided list and scrapes their websites for data.
 * 
 * Usage:
 *   node scripts/add-vc-firms-from-list.js --file vc-firms-list.json
 *   node scripts/add-vc-firms-from-list.js --csv vc-firms-list.csv
 *   node scripts/add-vc-firms-from-list.js --interactive
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// WEBSITE SCRAPING
// ============================================================================

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * Find blog URL from website HTML
 */
function findBlogUrl(html, baseUrl) {
  if (!html) return null;
  
  const $ = cheerio.load(html);
  
  // Look for blog links in navigation
  const blogSelectors = [
    'a[href*="blog"]',
    'a[href*="articles"]',
    'a[href*="news"]',
    'a[href*="insights"]',
    'a[href*="posts"]',
    'a[href*="thoughts"]',
    'a[href*="perspectives"]',
    'a[href*="medium"]',
    'a[href*="substack"]',
  ];
  
  for (const selector of blogSelectors) {
    const link = $(selector).first();
    if (link.length) {
      let href = link.attr('href');
      if (href) {
        if (href.startsWith('http')) return href;
        if (href.startsWith('/')) return `${baseUrl}${href}`;
        return `${baseUrl}/${href}`;
      }
    }
  }
  
  // Try common paths
  const commonPaths = ['/blog', '/articles', '/news', '/insights', '/posts'];
  for (const path of commonPaths) {
    if (html.includes(path)) {
      return `${baseUrl}${path}`;
    }
  }
  
  return null;
}

/**
 * Scrape website for firm description and other data
 * Aligned with enrich-investor-websites.js approach
 */
async function scrapeFirmWebsite(url) {
  if (!url) return null;
  
  try {
    // Clean URL
    let cleanUrl = url;
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const text = $.text();
    
    // Extract description - try multiple methods (aligned with enrich-investor-websites.js)
    let description = null;
    
    // 1. Try meta description
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (metaMatch && metaMatch[1] && metaMatch[1].length > 30) {
      description = decodeHtmlEntities(metaMatch[1].trim());
    }
    
    // 2. Try og:description
    if (!description || description.length < 30) {
      const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
      if (ogMatch && ogMatch[1] && ogMatch[1].length > 30) {
        description = decodeHtmlEntities(ogMatch[1].trim());
      }
    }
    
    // 3. Try first meaningful paragraph
    if (!description || description.length < 30) {
      const firstP = $('p').first().text().trim();
      if (firstP && firstP.length > 30 && firstP.length < 500) {
        description = decodeHtmlEntities(firstP);
      }
    }
    
    // 4. Try hero section or main content
    if (!description || description.length < 30) {
      const hero = $('h1, .hero, .intro, .about').first().text().trim();
      if (hero && hero.length > 30 && hero.length < 500) {
        description = decodeHtmlEntities(hero);
      }
    }
    
    // Find blog URL
    const blogUrl = findBlogUrl(html, cleanUrl);
    
    // Extract sectors from text (common VC sectors)
    const sectorKeywords = {
      'AI/ML': /artificial intelligence|machine learning|ai|ml|deep learning/gi,
      'SaaS': /saas|software as a service|cloud software/gi,
      'Fintech': /fintech|financial technology|payments|banking/gi,
      'Healthcare': /healthcare|health tech|medical|biotech/gi,
      'Enterprise': /enterprise|b2b|business software/gi,
      'Consumer': /consumer|b2c|consumer tech/gi,
      'E-commerce': /e-commerce|ecommerce|retail tech/gi,
      'Gaming': /gaming|games|gaming tech/gi,
      'EdTech': /edtech|education|learning/gi,
      'Climate': /climate|clean energy|sustainability/gi,
    };
    
    const sectors = [];
    for (const [sector, pattern] of Object.entries(sectorKeywords)) {
      if (pattern.test(text)) {
        sectors.push(sector);
      }
    }
    
    // Extract stage info
    const stageKeywords = {
      'Pre-Seed': /pre-seed|pre seed|idea stage/gi,
      'Seed': /seed|seed stage/gi,
      'Series A': /series a|series-a/gi,
      'Series B': /series b|series-b/gi,
      'Series C': /series c|series-c/gi,
      'Growth': /growth|late stage/gi,
    };
    
    const stages = [];
    for (const [stage, pattern] of Object.entries(stageKeywords)) {
      if (pattern.test(text)) {
        stages.push(stage);
      }
    }
    
    return {
      description: description || null,
      blog_url: blogUrl,
      sectors: sectors.length > 0 ? sectors : null,
      stage: stages.length > 0 ? stages : null,
      url: cleanUrl,
    };
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error(`   ⚠️  Error scraping ${url}: ${error.message}`);
    }
    return null;
  }
}

// ============================================================================
// FIRM PROCESSING
// ============================================================================

/**
 * Process a single VC firm
 */
async function processFirm(firmName, websiteUrl) {
  console.log(`\n📋 Processing: ${firmName}`);
  console.log(`   URL: ${websiteUrl}`);
  
  // Check if firm already exists
  const { data: existing } = await supabase
    .from('investors')
    .select('id, name, firm, url, blog_url, firm_description_normalized')
    .or(`name.ilike.${firmName},firm.ilike.${firmName}`)
    .limit(1)
    .maybeSingle();
  
  if (existing) {
    console.log(`   ⏭️  Already exists (ID: ${existing.id})`);
    
    // Update URL if missing
    const updates = {};
    if (!existing.url && websiteUrl) {
      updates.url = websiteUrl;
    }
    
    // Scrape if missing description
    if (!existing.firm_description_normalized || existing.firm_description_normalized.length < 50) {
      const scraped = await scrapeFirmWebsite(websiteUrl);
      if (scraped) {
        if (scraped.description && (!existing.firm_description_normalized || existing.firm_description_normalized.length < 50)) {
          updates.firm_description_normalized = scraped.description;
          updates.investment_firm_description = scraped.description; // Also update raw
        }
        if (scraped.blog_url && !existing.blog_url) {
          updates.blog_url = scraped.blog_url;
        }
        if (scraped.sectors && (!existing.sectors || (Array.isArray(existing.sectors) && existing.sectors.length === 0))) {
          updates.sectors = scraped.sectors;
        }
        if (scraped.stage && (!existing.stage || (Array.isArray(existing.stage) && existing.stage.length === 0))) {
          updates.stage = scraped.stage;
        }
      }
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', existing.id);
      
      if (error) {
        console.log(`   ❌ Update error: ${error.message}`);
      } else {
        console.log(`   ✅ Updated: ${Object.keys(updates).join(', ')}`);
      }
    }
    
    return { action: 'updated', id: existing.id };
  }
  
  // Scrape website
  console.log(`   🔍 Scraping website...`);
  const scraped = await scrapeFirmWebsite(websiteUrl);
  
  // Create new investor record (aligned with database schema)
  const newInvestor = {
    name: firmName,
    firm: firmName,
    type: 'vc_firm',
    url: websiteUrl,
    blog_url: scraped?.blog_url || null,
    firm_description_normalized: scraped?.description || null,
    investment_firm_description: scraped?.description || null, // Also set raw description
    sectors: scraped?.sectors || null,
    stage: scraped?.stage || null, // Fixed typo: was stages
    status: 'approved',
  };
  
  const { data: created, error } = await supabase
    .from('investors')
    .insert(newInvestor)
    .select()
    .single();
  
  if (error) {
    console.log(`   ❌ Error creating: ${error.message}`);
    return { action: 'error', error: error.message };
  }
  
  console.log(`   ✅ Created (ID: ${created.id})`);
  if (scraped?.description) {
    console.log(`   📝 Description: ${scraped.description.substring(0, 80)}...`);
  }
  if (scraped?.blog_url) {
    console.log(`   📰 Blog: ${scraped.blog_url}`);
  }
  
  return { action: 'created', id: created.id };
}

// ============================================================================
// FILE PARSING
// ============================================================================

/**
 * Parse JSON file
 */
function parseJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Handle different formats
  if (Array.isArray(data)) {
    return data.map(item => ({
      name: item.name || item.firm || item['VC Firm Name'],
      url: item.url || item.website || item['Website URL'] || item.websiteUrl,
    }));
  } else if (data.firms || data.investors) {
    const firms = data.firms || data.investors;
    return firms.map(f => ({
      name: f.name || f.firm,
      url: f.url || f.website,
    }));
  }
  
  throw new Error('Unknown JSON format');
}

/**
 * Parse CSV file
 */
function parseCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const nameIdx = header.findIndex(h => 
    h.toLowerCase().includes('name') || h.toLowerCase().includes('firm')
  );
  const urlIdx = header.findIndex(h => 
    h.toLowerCase().includes('url') || h.toLowerCase().includes('website')
  );
  
  if (nameIdx === -1 || urlIdx === -1) {
    throw new Error('CSV must have "Name" and "URL" columns');
  }
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    return {
      name: values[nameIdx],
      url: values[urlIdx],
    };
  }).filter(f => f.name && f.url);
}

// ============================================================================
// MAIN
// ============================================================================

async function processFirmList(firms) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 ADDING VC FIRMS FROM LIST');
  console.log('='.repeat(80));
  console.log(`\n📊 Found ${firms.length} firms to process\n`);
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  
  for (let i = 0; i < firms.length; i++) {
    const firm = firms[i];
    
    if (!firm.name || !firm.url) {
      console.log(`\n[${i + 1}/${firms.length}] ⚠️  Skipping: Missing name or URL`);
      skipped++;
      continue;
    }
    
    const result = await processFirm(firm.name, firm.url);
    
    if (result.action === 'created') created++;
    else if (result.action === 'updated') updated++;
    else if (result.action === 'error') errors++;
    else skipped++;
    
    // Rate limiting - be nice to servers
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${firms.length}`);
  console.log('');
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--file') || args.includes('-f')) {
  const idx = args.indexOf('--file') !== -1 ? args.indexOf('--file') : args.indexOf('-f');
  const filePath = args[idx + 1];
  
  if (!filePath) {
    console.error('❌ Please provide a file path');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  let firms;
  if (filePath.endsWith('.json')) {
    firms = parseJsonFile(filePath);
  } else if (filePath.endsWith('.csv')) {
    firms = parseCsvFile(filePath);
  } else {
    console.error('❌ File must be .json or .csv');
    process.exit(1);
  }
  
  processFirmList(firms).catch(console.error);
  
} else if (args.includes('--csv')) {
  const idx = args.indexOf('--csv');
  const filePath = args[idx + 1];
  
  if (!filePath || !fs.existsSync(filePath)) {
    console.error('❌ Please provide a valid CSV file path');
    process.exit(1);
  }
  
  const firms = parseCsvFile(filePath);
  processFirmList(firms).catch(console.error);
  
} else {
  console.log(`
Add VC Firms from List

Usage:
  node scripts/add-vc-firms-from-list.js --file <path-to-json-or-csv>
  node scripts/add-vc-firms-from-list.js --csv <path-to-csv>

File formats:
  JSON: [{"name": "Firm Name", "url": "https://..."}]
  CSV: Name,URL (or "VC Firm Name","Website URL")

The script will:
  1. Check if firm exists (by name or firm field)
  2. Scrape website for description, blog URL, sectors, stage
  3. Create new investor or update existing
  4. Align all data with database schema
  `);
}

