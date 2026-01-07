#!/usr/bin/env node
/**
 * Y Combinator Company Directory Scraper
 * 
 * Scrapes YC company directory pages:
 * - All companies: https://www.ycombinator.com/companies
 * - By batch: https://www.ycombinator.com/companies?batch=Summer%202025
 * - By industry: https://www.ycombinator.com/companies/industry/collaboration
 * 
 * Usage:
 *   node yc-companies-scraper.js                    # Scrape all companies
 *   node yc-companies-scraper.js --batch=Summer2025 # Scrape specific batch
 *   node yc-companies-scraper.js --industry=collaboration # Scrape by industry
 */

require('dotenv').config();
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk').default;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// URLs to scrape
const YC_URLS = [
  'https://www.ycombinator.com/companies',
  'https://www.ycombinator.com/companies?batch=Summer%202025',
  'https://www.ycombinator.com/companies/industry/collaboration'
];

async function scrapeYCDirectory(url) {
  console.log(`\n🔍 Scraping: ${url}`);
  console.log('─'.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000); // Wait for dynamic content
    
    // Scroll to load more companies
    console.log('   📜 Scrolling to load all companies...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
    
    // Extract page text
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log(`   📄 Page text: ${textContent.length} chars`);
    
    // First, try to extract company links from DOM
    const companyLinks = await page.evaluate(() => {
      const links = [];
      // Look for links that might be company websites
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        const text = a.textContent?.trim() || '';
        // Company website patterns
        if (href && (
          href.startsWith('http') && 
          !href.includes('ycombinator.com') &&
          !href.includes('linkedin.com') &&
          !href.includes('twitter.com') &&
          !href.includes('github.com') &&
          (text.length > 2 || href.match(/\.(com|io|co|ai|app|dev|tech)$/i))
        )) {
          links.push({ text, href });
        }
      });
      return links.slice(0, 100); // Limit to first 100
    });
    
    console.log(`   🔗 Found ${companyLinks.length} potential company links in DOM`);
    
    // Extract with Claude (with timeout)
    console.log('   🧠 Calling Anthropic API...');
    let response;
    try {
      const apiPromise = anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `Extract ALL startup companies from this Y Combinator directory page.

PAGE TEXT (first 30000 chars - optimized for speed):
${textContent.slice(0, 30000)}

${companyLinks.length > 0 ? `POTENTIAL COMPANY LINKS FOUND:
${companyLinks.slice(0, 50).map(l => `- "${l.text}" -> ${l.href}`).join('\n')}
` : ''}

CRITICAL: For each company, you MUST extract the website URL if it's visible on the page or in the links above.
Look for:
- Direct website links (http:// or https://)
- Company names that match link text
- Links near company descriptions

Return ONLY valid JSON (no markdown, no code blocks):
{"companies": [{"name": "Company Name", "description": "One-line description", "sector": "AI/Fintech/etc", "website": "FULL URL including https:// if found, otherwise null", "location": "city if visible", "batch": "W2024/S2024/etc if visible"}]}

If you find NO companies, return: {"companies": []}`
      }]
      });
      
      // Add timeout wrapper (60 seconds max)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Anthropic API timeout after 60s')), 60000);
      });
      
      response = await Promise.race([apiPromise, timeoutPromise]);
    } catch (apiError) {
      console.error(`   ❌ Anthropic API error: ${apiError.message}`);
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
      return [];
    }
    
    let data;
    try {
      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        data = { companies: [] };
      }
    } catch (parseError) {
      console.log(`   ⚠️  JSON parse error: ${parseError.message}`);
      data = { companies: [] };
    }
    
    const companies = (data.companies || []).map(c => ({
      ...c,
      source: 'yc_directory',
      source_url: url,
      scraped_at: new Date().toISOString()
    }));
    
    console.log(`   ✅ Found ${companies.length} companies`);
    
    if (browser) {
      await browser.close();
    }
    return companies;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    return [];
  }
}

async function saveCompanies(companies) {
  console.log('\n💾 SAVING TO DATABASE');
  console.log('═'.repeat(60));
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const company of companies) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('discovered_startups')
        .select('id')
        .ilike('name', company.name)
        .limit(1);
      
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert into discovered_startups
      const record = {
        name: company.name,
        description: company.description || '',
        website: company.website || null,
        sectors: company.sector ? [company.sector] : ['Technology'],
        rss_source: 'Y Combinator Directory',
        article_url: company.source_url,
        article_title: `YC Company: ${company.name}`,
        discovered_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('discovered_startups')
        .insert(record);
      
      if (error) {
        console.error(`   ❌ ${company.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`   ✅ ${company.name}`);
        saved++;
      }
      
    } catch (err) {
      console.error(`   ❌ ${company.name}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Results: ${saved} saved, ${skipped} skipped, ${errors} errors`);
  return { saved, skipped, errors };
}

async function main() {
  console.log('🚀 Y Combinator Company Directory Scraper');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const allCompanies = [];
  
  for (const url of YC_URLS) {
    try {
      const companies = await scrapeYCDirectory(url);
      if (companies && companies.length > 0) {
        allCompanies.push(...companies);
      }
      // Rate limiting between URLs
      await new Promise(r => setTimeout(r, 3000));
    } catch (error) {
      console.error(`❌ Failed to scrape ${url}: ${error.message}`);
      // Continue to next URL even if one fails
      continue;
    }
  }
  
  // Deduplicate
  const uniqueCompanies = [];
  const seen = new Set();
  for (const company of allCompanies) {
    const key = company.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCompanies.push(company);
    }
  }
  
  console.log(`\n📊 Total unique companies: ${uniqueCompanies.length}`);
  
  if (uniqueCompanies.length > 0) {
    await saveCompanies(uniqueCompanies);
  }
}

main().catch(console.error);

