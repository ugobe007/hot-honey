#!/usr/bin/env node
/**
 * PUPPETEER SCRAPER
 * Scrapes JavaScript-rendered pages for startups and investors
 * 
 * Install: npm install puppeteer
 * Usage: node puppeteer-scraper.js <url> <type>
 * 
 * Examples:
 *   node puppeteer-scraper.js "https://www.ycombinator.com/companies" startups
 *   node puppeteer-scraper.js "https://www.techstars.com/portfolio" startups
 *   node puppeteer-scraper.js "https://a16z.com/portfolio" startups
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

/**
 * Scrape page with Puppeteer (handles JavaScript)
 */
async function scrapePage(url) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('❌ Puppeteer not installed. Run: npm install puppeteer');
    process.exit(1);
  }
  
  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  
  console.log('📄 Loading page:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
  // Wait for content to render
  await page.waitForTimeout(3000);
  
  // Scroll to load lazy content
  console.log('📜 Scrolling to load content...');
  await autoScroll(page);
  
  // Get page content
  const content = await page.evaluate(() => {
    // Remove scripts and styles
    document.querySelectorAll('script, style, nav, footer, header').forEach(el => el.remove());
    return document.body.innerText;
  });
  
  // Get all links for potential follow-up
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(l => l.text && l.href.startsWith('http'));
  });
  
  await browser.close();
  
  return { content: content.substring(0, 20000), links };
}

/**
 * Auto-scroll to load lazy content
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight || totalHeight > 10000) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

/**
 * Extract entities with OpenAI
 */
async function extractWithAI(content, url, type) {
  console.log('🧠 Analyzing with OpenAI...');
  
  const fetch = (await import('node-fetch')).default;
  
  const prompt = type === 'startups' ? `
Extract ALL startup companies from this webpage content.
For each startup, provide:
- name: Company name
- description: Brief description (max 200 chars)
- industry: Main industry/category
- website: URL if visible

Return as JSON array: [{"name": "...", "description": "...", "industry": "...", "website": "..."}]
Only return the JSON, no explanation.
` : `
Extract ALL investors/VCs from this webpage content.
For each investor, provide:
- name: Person or firm name
- firm: VC firm name
- title: Role/title
- sectors: Focus areas
- stage: Investment stages (Pre-Seed, Seed, Series A, etc.)

Return as JSON array: [{"name": "...", "firm": "...", "title": "...", "sectors": [...], "stage": [...]}]
Only return the JSON, no explanation.
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a data extraction expert. Return only valid JSON.' },
        { role: 'user', content: `URL: ${url}\n\nContent:\n${content}\n\n${prompt}` }
      ],
      temperature: 0.1,
      max_tokens: 4000
    })
  });
  
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '[]';
  
  try {
    // Clean up response
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse AI response');
    return [];
  }
}

/**
 * Save startups to database
 */
async function saveStartups(startups, sourceUrl) {
  let added = 0, skipped = 0;
  
  for (const startup of startups) {
    if (!startup.name) continue;
    
    // Check exists
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .ilike('name', startup.name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase
      .from('startup_uploads')
      .insert({
        name: startup.name,
        description: startup.description || null,
        pitch: startup.description || null,
        sectors: startup.industry ? [startup.industry] : null,
        website: startup.website || null,
        source_type: 'url',
        source_url: sourceUrl,
        status: 'pending'
      });
    
    if (!error) added++;
  }
  
  return { added, skipped };
}

/**
 * Save investors to database
 */
async function saveInvestors(investors, sourceUrl) {
  let added = 0, skipped = 0;
  
  for (const inv of investors) {
    if (!inv.name && !inv.firm) continue;
    
    const name = inv.name || inv.firm;
    
    // Check exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id')
      .ilike('name', name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase
      .from('investors')
      .insert({
        name: name,
        firm: inv.firm || name,
        title: inv.title || 'Investment Team',
        sectors: inv.sectors || null,
        stage: Array.isArray(inv.stage) ? inv.stage.join(', ') : inv.stage,
        status: 'active',
        is_verified: false
      });
    
    if (!error) added++;
  }
  
  return { added, skipped };
}

async function main() {
  const url = process.argv[2];
  const type = process.argv[3] || 'startups';
  
  if (!url) {
    console.log(`
Usage: node puppeteer-scraper.js <url> <type>

Types: startups, investors

Examples:
  node puppeteer-scraper.js "https://www.ycombinator.com/companies" startups
  node puppeteer-scraper.js "https://www.techstars.com/portfolio" startups
  node puppeteer-scraper.js "https://a16z.com/team" investors
`);
    return;
  }
  
  console.log('\n🚀 PUPPETEER SCRAPER\n');
  console.log('═'.repeat(60));
  console.log('URL:', url);
  console.log('Type:', type);
  console.log('═'.repeat(60) + '\n');
  
  try {
    // Scrape page
    const { content, links } = await scrapePage(url);
    console.log(`📝 Extracted ${content.length} chars, ${links.length} links\n`);
    
    // Extract with AI
    const entities = await extractWithAI(content, url, type);
    console.log(`🎯 Found ${entities.length} ${type}\n`);
    
    // Save to database
    let result;
    if (type === 'startups') {
      result = await saveStartups(entities, url);
    } else {
      result = await saveInvestors(entities, url);
    }
    
    // Summary
    console.log('═'.repeat(60));
    console.log(`✅ Added: ${result.added}`);
    console.log(`⏭️  Skipped: ${result.skipped}`);
    console.log('═'.repeat(60));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
