#!/usr/bin/env node
/**
 * INTELLIGENT SCRAPER
 * Automatically scrapes and categorizes VCs, Angel Groups, Startups, and News
 * Uses OpenAI to intelligently extract structured data from any webpage
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

/**
 * Fetch with proper headers
 */
async function fetchPage(url) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.text();
}

/**
 * Extract clean text from HTML
 */
function extractText(html) {
  const $ = cheerio.load(html);
  
  // Remove scripts, styles, and other noise
  $('script, style, nav, footer, header, aside, iframe, noscript').remove();
  
  // Get main content
  const mainContent = $('main, article, .content, #content, .main, #main').text() || $('body').text();
  
  // Clean up whitespace
  return mainContent
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
    .substring(0, 15000); // Limit to 15k chars for OpenAI
}

/**
 * Use OpenAI to intelligently extract structured data
 */
async function extractDataWithAI(text, url, targetType = 'auto') {
  console.log('🧠 Analyzing content with OpenAI...\n');
  
  const fetch = (await import('node-fetch')).default;
  
  const systemPrompt = `You are a data extraction expert specializing in venture capital, startups, and technology news.
Extract structured information from web content and return it in JSON format.

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or explanations.`;

  const userPrompt = `Analyze this webpage and extract relevant entities.

URL: ${url}
Target Type: ${targetType === 'auto' ? 'Detect automatically' : targetType}

Extract:
1. INVESTORS (VCs, Angel Groups, Accelerators)
   - Name (official firm name)
   - Type (VC Firm, Angel Network, Accelerator, Corporate VC)
   - Description (brief, under 200 chars)
   - Focus (sectors/stages if mentioned)

2. STARTUPS (Companies, Products)
   - Name
   - Description (brief, under 200 chars)
   - Industry/Category
   - URL if available

3. NEWS/INSIGHTS
   - Key themes or topics
   - Notable mentions
   - Investment news

Return JSON in this exact format:
{
  "investors": [
    {"name": "string", "type": "string", "description": "string", "focus": "string"}
  ],
  "startups": [
    {"name": "string", "description": "string", "category": "string", "url": "string"}
  ],
  "news": {
    "themes": ["string"],
    "notable_mentions": ["string"]
  }
}

Rules:
- Include ONLY entities clearly identified in the content
- Skip generic text, navigation, or advertisements
- Use official names (e.g., "Andreessen Horowitz" not "a16z")
- Return empty arrays if nothing found
- NO markdown formatting, NO code blocks, ONLY JSON

Content:
${text}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${error}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse OpenAI response as JSON');
        }
      }
    }
    
    return {
      investors: parsed.investors || [],
      startups: parsed.startups || [],
      news: parsed.news || { themes: [], notable_mentions: [] }
    };
    
  } catch (error) {
    console.error('❌ OpenAI extraction failed:', error.message);
    return { investors: [], startups: [], news: { themes: [], notable_mentions: [] } };
  }
}

/**
 * Save investors to database
 */
async function saveInvestors(investors, sourceUrl) {
  if (!investors || investors.length === 0) return { added: 0, skipped: 0 };
  
  console.log(`\n💼 Saving ${investors.length} investors...\n`);
  
  let added = 0;
  let skipped = 0;
  
  for (const inv of investors) {
    // Check if exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id')
      .ilike('name', inv.name)
      .maybeSingle();
    
    if (existing) {
      console.log(`  ⏭️  ${inv.name} - Already exists`);
      skipped++;
      continue;
    }
    
    // Direct insert to database
    const { error } = await supabase
      .from('investors')
      .insert({
        name: inv.name,
        type: inv.type || 'VC Firm',
        firm: inv.name,
        bio: inv.description || '',
        status: 'active'
      });
    
    if (error) {
      console.log(`  ❌ ${inv.name} - ${error.message}`);
    } else {
      console.log(`  ✅ ${inv.name}`);
      added++;
    }
  }
  
  return { added, skipped };
}

/**
 * Save startups to discovered_startups
 */
async function saveStartups(startups, sourceUrl) {
  if (!startups || startups.length === 0) return { added: 0, skipped: 0 };
  
  console.log(`\n🚀 Saving ${startups.length} startups...\n`);
  
  let added = 0;
  let skipped = 0;
  
  for (const startup of startups) {
    // Check if exists
    const { data: existing } = await supabase
      .from('discovered_startups')
      .select('id')
      .ilike('name', startup.name)
      .maybeSingle();
    
    if (existing) {
      console.log(`  ⏭️  ${startup.name} - Already exists`);
      skipped++;
      continue;
    }
    
    // Direct insert to database
    const { error } = await supabase
      .from('discovered_startups')
      .insert({
        name: startup.name,
        website: startup.url || '',
        description: startup.description || '',
        article_url: sourceUrl,
        discovered_at: new Date().toISOString(),
        imported_to_startups: false
      });
    
    if (error) {
      console.log(`  ❌ ${startup.name} - ${error.message}`);
    } else {
      console.log(`  ✅ ${startup.name}`);
      added++;
    }
  }
  
  return { added, skipped };
}

/**
 * Main scraping function
 */
async function scrape(url, targetType = 'auto') {
  console.log('═'.repeat(70));
  console.log('🔥 INTELLIGENT SCRAPER - Hot Match');
  console.log('═'.repeat(70));
  console.log(`\n🌐 Scraping: ${url}`);
  console.log(`🎯 Target: ${targetType}\n`);
  
  try {
    // Fetch page
    console.log('📄 Fetching page...');
    const html = await fetchPage(url);
    console.log('✅ Page loaded\n');
    
    // Extract text
    console.log('📝 Extracting content...');
    const text = extractText(html);
    console.log(`✅ Extracted ${text.length} characters\n`);
    
    // Extract data with AI
    const data = await extractDataWithAI(text, url, targetType);
    
    // Display results
    console.log('═'.repeat(70));
    console.log('📊 EXTRACTION RESULTS');
    console.log('═'.repeat(70));
    console.log(`\n💼 Investors found: ${data.investors.length}`);
    console.log(`🚀 Startups found: ${data.startups.length}`);
    console.log(`📰 News themes: ${data.news.themes.length}`);
    
    if (data.news.themes.length > 0) {
      console.log(`\n📌 Key Themes:`);
      data.news.themes.forEach(theme => console.log(`   • ${theme}`));
    }
    
    // Save to database
    const investorResults = await saveInvestors(data.investors, url);
    const startupResults = await saveStartups(data.startups, url);
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('✨ SCRAPING COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\n💼 Investors: ${investorResults.added} added, ${investorResults.skipped} skipped`);
    console.log(`🚀 Startups: ${startupResults.added} added, ${startupResults.skipped} skipped\n`);
    
    return {
      success: true,
      investors: investorResults,
      startups: startupResults,
      news: data.news
    };
    
  } catch (error) {
    console.error('\n❌ Scraping failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Batch scrape multiple URLs
 */
async function batchScrape(urls) {
  console.log(`\n🎯 Batch scraping ${urls.length} URLs...\n`);
  
  const results = [];
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\n[${ i + 1}/${urls.length}] Processing: ${urls[i]}`);
    const result = await scrape(urls[i]);
    results.push(result);
    
    // Wait between requests to avoid rate limiting
    if (i < urls.length - 1) {
      console.log('\n⏳ Waiting 3 seconds before next request...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Overall summary
  const totalInvestorsAdded = results.reduce((sum, r) => sum + (r.investors?.added || 0), 0);
  const totalStartupsAdded = results.reduce((sum, r) => sum + (r.startups?.added || 0), 0);
  
  console.log('\n' + '═'.repeat(70));
  console.log('🎉 BATCH SCRAPING COMPLETE');
  console.log('═'.repeat(70));
  console.log(`\n✅ Processed: ${urls.length} URLs`);
  console.log(`💼 Total investors added: ${totalInvestorsAdded}`);
  console.log(`🚀 Total startups added: ${totalStartupsAdded}\n`);
}

/**
 * CLI
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔥 INTELLIGENT SCRAPER - Hot Match

Usage:
  node intelligent-scraper.js <url> [type]
  node intelligent-scraper.js --batch <url1> <url2> <url3>...

Arguments:
  url    - URL to scrape
  type   - Target type: auto|investors|startups|news (default: auto)
  --batch - Scrape multiple URLs

Examples:

  # Auto-detect content type
  node intelligent-scraper.js https://dealroom.net/blog/top-venture-capital-firms

  # Target specific content
  node intelligent-scraper.js https://techcrunch.com/startups startups

  # Batch scrape multiple sources
  node intelligent-scraper.js --batch \\
    https://www.cbinsights.com/research/best-venture-capital-firms/ \\
    https://www.forbes.com/midas-list/ \\
    https://techcrunch.com/lists/top-vcs-2024/

Great Sources:

  VCs & Angel Groups:
  • https://dealroom.net/blog/top-venture-capital-firms
  • https://www.cbinsights.com/research/best-venture-capital-firms/
  • https://www.forbes.com/midas-list/
  • https://techcrunch.com/lists/top-vcs-2024/
  • https://www.bandofangels.com/members

  Startups:
  • https://techcrunch.com/startups/
  • https://www.producthunt.com/
  • https://www.ycombinator.com/companies
  • https://www.crunchbase.com/

  News:
  • https://techcrunch.com/
  • https://venturebeat.com/
  • https://news.crunchbase.com/
`);
    process.exit(0);
  }
  
  if (args[0] === '--batch') {
    await batchScrape(args.slice(1));
  } else {
    const url = args[0];
    const type = args[1] || 'auto';
    await scrape(url, type);
  }
}

main().catch(console.error);
