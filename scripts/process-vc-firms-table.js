#!/usr/bin/env node
/**
 * PROCESS VC FIRMS TABLE
 * ======================
 * Extracts and processes VC firms from various table formats
 * Then automatically adds them to the database
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

// Import scraping functions from add-vc-firms-from-list.js
async function scrapeFirmWebsite(url) {
  if (!url) return null;
  
  try {
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
    
    // Extract description
    let description = null;
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (metaMatch && metaMatch[1] && metaMatch[1].length > 30) {
      description = metaMatch[1].trim().replace(/&[a-z]+;/gi, ' ');
    }
    
    if (!description || description.length < 30) {
      const firstP = $('p').first().text().trim();
      if (firstP && firstP.length > 30 && firstP.length < 500) {
        description = firstP;
      }
    }
    
    // Find blog URL
    let blogUrl = null;
    const blogLink = $('a[href*="blog"], a[href*="articles"], a[href*="news"]').first();
    if (blogLink.length) {
      let href = blogLink.attr('href');
      if (href) {
        if (href.startsWith('http')) blogUrl = href;
        else if (href.startsWith('/')) blogUrl = `${cleanUrl}${href}`;
      }
    }
    
    // Extract sectors
    const sectors = [];
    const sectorKeywords = {
      'AI/ML': /artificial intelligence|machine learning|ai|ml/gi,
      'SaaS': /saas|software as a service/gi,
      'Fintech': /fintech|financial technology/gi,
      'Healthcare': /healthcare|health tech|medical/gi,
      'Enterprise': /enterprise|b2b/gi,
      'Consumer': /consumer|b2c/gi,
    };
    
    for (const [sector, pattern] of Object.entries(sectorKeywords)) {
      if (pattern.test(text)) sectors.push(sector);
    }
    
    return {
      description: description || null,
      blog_url: blogUrl,
      sectors: sectors.length > 0 ? sectors : null,
    };
    
  } catch (error) {
    return null;
  }
}

async function processFirm(firmName, websiteUrl) {
  // Check if exists
  const { data: existing } = await supabase
    .from('investors')
    .select('id, name, firm, url, blog_url, firm_description_normalized')
    .or(`name.ilike.${firmName},firm.ilike.${firmName}`)
    .limit(1)
    .maybeSingle();
  
  if (existing) {
    const updates = {};
    if (!existing.url && websiteUrl) updates.url = websiteUrl;
    if (!existing.firm_description_normalized || existing.firm_description_normalized.length < 50) {
      const scraped = await scrapeFirmWebsite(websiteUrl);
      if (scraped) {
        if (scraped.description) updates.firm_description_normalized = scraped.description;
        if (scraped.blog_url && !existing.blog_url) updates.blog_url = scraped.blog_url;
        if (scraped.sectors) updates.sectors = scraped.sectors;
      }
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('investors').update(updates).eq('id', existing.id);
      return { action: 'updated', id: existing.id };
    }
    return { action: 'skipped', id: existing.id };
  }
  
  // Scrape and create
  const scraped = await scrapeFirmWebsite(websiteUrl);
  const newInvestor = {
    name: firmName,
    firm: firmName,
    type: 'vc_firm',
    url: websiteUrl,
    blog_url: scraped?.blog_url || null,
    firm_description_normalized: scraped?.description || null,
    investment_firm_description: scraped?.description || null,
    sectors: scraped?.sectors || null,
    status: 'approved',
  };
  
  const { data: created, error } = await supabase
    .from('investors')
    .insert(newInvestor)
    .select()
    .single();
  
  if (error) {
    return { action: 'error', error: error.message };
  }
  
  return { action: 'created', id: created.id };
}

// Main function
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 PROCESSING VC FIRMS TABLE');
  console.log('='.repeat(80));
  
  // Check for input file
  const inputFile = process.argv[2] || 'data/vc-firms-list.csv';
  
  if (!fs.existsSync(inputFile)) {
    console.log(`\n❌ File not found: ${inputFile}`);
    console.log('\nPlease provide the file with VC firms:');
    console.log('  node scripts/process-vc-firms-table.js <path-to-csv-or-json>');
    console.log('\nOr create data/vc-firms-list.csv with format:');
    console.log('  VC Firm Name,Website URL');
    console.log('  Andreessen Horowitz,https://www.a16z.com');
    process.exit(1);
  }
  
  console.log(`\n📁 Reading: ${inputFile}`);
  
  // Parse file
  let firms = [];
  const content = fs.readFileSync(inputFile, 'utf-8');
  
  if (inputFile.endsWith('.csv')) {
    const lines = content.split('\n').filter(l => l.trim());
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const nameIdx = header.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('firm'));
    const urlIdx = header.findIndex(h => h.toLowerCase().includes('url') || h.toLowerCase().includes('website'));
    
    if (nameIdx === -1 || urlIdx === -1) {
      console.error('❌ CSV must have Name/Firm and URL/Website columns');
      process.exit(1);
    }
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values[nameIdx] && values[urlIdx]) {
        firms.push({ name: values[nameIdx], url: values[urlIdx] });
      }
    }
  } else if (inputFile.endsWith('.json')) {
    const data = JSON.parse(content);
    firms = Array.isArray(data) ? data : [];
  }
  
  console.log(`✅ Found ${firms.length} firms to process\n`);
  
  if (firms.length === 0) {
    console.log('❌ No firms found in file');
    process.exit(1);
  }
  
  // Process firms
  let created = 0, updated = 0, skipped = 0, errors = 0;
  
  for (let i = 0; i < firms.length; i++) {
    const firm = firms[i];
    process.stdout.write(`\r[${i + 1}/${firms.length}] Processing: ${firm.name.substring(0, 40).padEnd(40)}`);
    
    const result = await processFirm(firm.name, firm.url);
    
    if (result.action === 'created') created++;
    else if (result.action === 'updated') updated++;
    else if (result.action === 'skipped') skipped++;
    else errors++;
    
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${firms.length}`);
  console.log('');
}

main().catch(console.error);


