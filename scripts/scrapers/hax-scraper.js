#!/usr/bin/env node
/**
 * HAX Accelerator Scraper
 * 
 * Scrapes HAX accelerator startups page:
 * - https://hax.co/startups/
 * 
 * Usage:
 *   node hax-scraper.js
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

async function scrapeHAXPage() {
  const url = 'https://hax.co/startups/';
  console.log(`\n🔍 Scraping: ${url}`);
  console.log('─'.repeat(60));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Scroll to load more startups
    console.log('   📜 Scrolling to load all startups...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
    }
    
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log(`   📄 Page text: ${textContent.length} chars`);
    
    // First, try to extract company links from DOM
    const companyLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        const text = a.textContent?.trim() || '';
        // Company website patterns
        if (href && (
          href.startsWith('http') && 
          !href.includes('hax.co') &&
          !href.includes('linkedin.com') &&
          !href.includes('twitter.com') &&
          !href.includes('github.com') &&
          (text.length > 2 || href.match(/\.(com|io|co|ai|app|dev|tech)$/i))
        )) {
          links.push({ text, href });
        }
      });
      return links.slice(0, 100);
    });
    
    console.log(`   🔗 Found ${companyLinks.length} potential company links in DOM`);
    
    // Extract with Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Extract ALL startup companies from this HAX accelerator portfolio page.

PAGE TEXT (first 60000 chars):
${textContent.slice(0, 60000)}

${companyLinks.length > 0 ? `POTENTIAL COMPANY LINKS FOUND:
${companyLinks.slice(0, 50).map(l => `- "${l.text}" -> ${l.href}`).join('\n')}
` : ''}

CRITICAL: For each company, you MUST extract the website URL if it's visible on the page or in the links above.
HAX is a hardware accelerator. Extract all portfolio companies with their websites.

Return ONLY valid JSON (no markdown, no code blocks):
{"companies": [{"name": "Company Name", "description": "What they do", "sector": "Hardware/AI/etc", "website": "FULL URL including https:// if found, otherwise null"}]}

If you find NO companies, return: {"companies": []}`
      }]
    });
    
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
      source: 'hax',
      source_url: url,
      scraped_at: new Date().toISOString()
    }));
    
    console.log(`   ✅ Found ${companies.length} companies`);
    
    await browser.close();
    return companies;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    await browser.close();
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
      
      const record = {
        name: company.name,
        description: company.description || '',
        website: company.website || null,
        sectors: company.sector ? [company.sector] : ['Hardware', 'Technology'],
        rss_source: 'HAX Accelerator',
        article_url: company.source_url,
        article_title: `HAX Portfolio: ${company.name}`,
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
  console.log('🚀 HAX Accelerator Scraper');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const companies = await scrapeHAXPage();
  
  if (companies.length > 0) {
    await saveCompanies(companies);
  } else {
    console.log('\n⚠️  No companies found');
  }
}

main().catch(console.error);

