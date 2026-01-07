#!/usr/bin/env node
/**
 * VC LIST SCRAPER
 * Scrapes VC firms from list pages like Dealroom, TechCrunch top VC lists, etc.
 * Usage: node scrape-vc-list.js <url>
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require('cheerio');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Scrape VC list from a webpage
 */
async function scrapeVCList(url) {
  console.log(`\n🔍 Scraping VC list from: ${url}\n`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('📄 Page loaded, analyzing content...\n');
    
    // Use OpenAI to extract VC firm names from the page
    const extractedText = $('body').text().substring(0, 10000); // First 10k chars
    
    const firms = await extractVCsWithAI(extractedText, url);
    
    console.log(`\n✅ Found ${firms.length} VC firms\n`);
    
    return firms;
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  }
}

/**
 * Use OpenAI to extract VC firm names from text
 */
async function extractVCsWithAI(text, sourceUrl) {
  console.log('🧠 Using OpenAI to extract VC firm names...\n');
  
  const prompt = `Extract venture capital firm names from this text. Return ONLY a JSON array of objects with this structure:
[
  {
    "name": "Sequoia Capital",
    "type": "VC Firm",
    "description": "Brief description if available"
  }
]

Rules:
- Include only actual VC/investment firms
- Exclude: individual investors, founders, companies that aren't VCs
- Name should be the official firm name (e.g., "Andreessen Horowitz" not "a16z")
- Keep descriptions under 200 characters
- Return empty array if no VCs found

Text to analyze:
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
          {
            role: 'system',
            content: 'You are a financial data extraction expert. Extract only venture capital firm names from text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        parsed = JSON.parse(content);
      }
    }
    
    // Handle various response formats
    const firms = parsed.firms || parsed.vcs || parsed.data || parsed;
    
    if (!Array.isArray(firms)) {
      console.log('⚠️  Unexpected response format:', parsed);
      return [];
    }
    
    return firms.map(firm => ({
      name: firm.name,
      type: firm.type || 'VC Firm',
      description: firm.description || '',
      source: sourceUrl
    }));
    
  } catch (error) {
    console.error('❌ OpenAI extraction failed:', error.message);
    return [];
  }
}

/**
 * Save VCs to database
 */
async function saveVCsToDatabase(firms) {
  console.log(`\n💾 Saving ${firms.length} VCs to database...\n`);
  
  let added = 0;
  let skipped = 0;
  
  for (const firm of firms) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id')
      .ilike('name', firm.name)
      .single();
    
    if (existing) {
      console.log(`⏭️  ${firm.name} - Already exists`);
      skipped++;
      continue;
    }
    
    // Insert new VC
    const { error } = await supabase
      .from('investors')
      .insert({
        name: firm.name,
        type: firm.type,
        bio: firm.description,
        source_url: firm.source,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.log(`❌ ${firm.name} - Error: ${error.message}`);
    } else {
      console.log(`✅ ${firm.name} - Added`);
      added++;
    }
  }
  
  console.log(`\n═══════════════════════════════════════`);
  console.log(`📊 RESULTS:`);
  console.log(`   ✅ Added: ${added}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📈 Total: ${firms.length}`);
  console.log(`═══════════════════════════════════════\n`);
}

/**
 * Main
 */
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.log(`
🚀 VC LIST SCRAPER

Usage:
  node scrape-vc-list.js <url>

Examples:
  node scrape-vc-list.js https://dealroom.net/blog/top-venture-capital-firms
  node scrape-vc-list.js https://techcrunch.com/lists/top-vcs-2024/
  node scrape-vc-list.js https://www.forbes.com/midas-list/

This tool:
1. Scrapes the webpage
2. Uses OpenAI to extract VC firm names
3. Saves new VCs to your database
4. Skips duplicates automatically
`);
    process.exit(0);
  }
  
  console.log('═'.repeat(60));
  console.log('🔥 VC LIST SCRAPER - Hot Match');
  console.log('═'.repeat(60));
  
  try {
    const firms = await scrapeVCList(url);
    
    if (firms.length === 0) {
      console.log('\n⚠️  No VC firms found on this page');
      process.exit(0);
    }
    
    await saveVCsToDatabase(firms);
    
    console.log('✅ Done!\n');
    
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    process.exit(1);
  }
}

main();
