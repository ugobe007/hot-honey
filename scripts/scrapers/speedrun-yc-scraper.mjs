#!/usr/bin/env node
/**
 * SPEEDRUN + YC STARTUP SCRAPER
 * ==============================
 * Scrapes early-stage startups from:
 * 1. a16z Speedrun (accelerator)
 * 2. Y Combinator (latest batches)
 * 
 * Prerequisites:
 *   cd ~/Desktop/hot-honey
 *   npm install @browserbasehq/stagehand zod --legacy-peer-deps
 *   npx playwright install chromium
 *   rm -rf node_modules/@browserbasehq/stagehand/node_modules/zod
 * 
 * Usage:
 *   node speedrun-yc-scraper.mjs speedrun       # Scrape Speedrun
 *   node speedrun-yc-scraper.mjs yc             # Scrape YC
 *   node speedrun-yc-scraper.mjs all            # Scrape both
 *   node speedrun-yc-scraper.mjs test           # Test Stagehand
 */

import 'dotenv/config';
import { z } from 'zod';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const STAGEHAND_CONFIG = {
  env: 'LOCAL',
  headless: true,
  verbose: 1,
  model: {
    modelName: 'anthropic/claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
};

// Supabase setup
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Anthropic client for direct Claude API calls
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const StartupSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  sector: z.string().optional(),
  website: z.string().optional(),
  founders: z.array(z.string()).optional(),
  location: z.string().optional(),
  stage: z.string().optional(),
  batch: z.string().optional()
});

const StartupListSchema = z.object({
  startups: z.array(StartupSchema)
});

// ═══════════════════════════════════════════════════════════════════════════
// SPEEDRUN SCRAPER
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeSpeedrun() {
  console.log('\n🚀 SCRAPING A16Z SPEEDRUN');
  console.log('═'.repeat(50));
  
  // Use Playwright + Claude (more reliable than Stagehand for this)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://speedrun.a16z.com/companies/', { waitUntil: 'networkidle' });
    console.log('✅ Loaded Speedrun companies page');
    
    // Scroll to load all content (lazy loading)
    console.log('📜 Scrolling to load all startups...');
    let previousHeight = 0;
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(r => setTimeout(r, 1000));
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break;
      previousHeight = currentHeight;
    }
    
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log('📝 Extracting with Claude...\n');
    
    // Use Claude to extract all startups
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: `Extract ALL startup companies from this a16z Speedrun accelerator page.

PAGE TEXT:
${textContent.slice(0, 60000)}

Return ONLY valid JSON (no markdown, no explanation):
{"startups": [{"name": "Company Name", "description": "One-line description", "sector": "AI/Fintech/Healthcare/Consumer/Enterprise/Crypto/Other"}]}`
      }]
    });
    
    const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch[0]);
    const startups = (data.startups || []).map(s => ({
      ...s,
      source: 'speedrun',
      scraped_at: new Date().toISOString()
    }));
    
    await browser.close();
    
    console.log(`✅ Total Speedrun startups: ${startups.length}`);
    return startups;
    
  } catch (error) {
    console.error('❌ Speedrun scraping error:', error.message);
    try { await browser.close(); } catch {}
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Y COMBINATOR SCRAPER
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeYC() {
  console.log('\n🟠 SCRAPING Y COMBINATOR');
  console.log('═'.repeat(50));
  
  // Use Playwright + Claude (more reliable)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // YC Companies directory - filter by recent batches
    const batches = ['W24', 'S24', 'W23', 'S23']; // Recent batches
    const allStartups = [];
    
    for (const batch of batches) {
      console.log(`\n📦 Scraping YC ${batch} batch...`);
      
      await page.goto(`https://www.ycombinator.com/companies?batch=${batch}`, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      // Wait for dynamic content to load
      console.log(`   ⏳ Waiting for dynamic content...`);
      await new Promise(r => setTimeout(r, 5000));
      
      // Try clicking "Load More" or similar buttons if they exist
      try {
        const loadMoreButton = await page.$('button:has-text("Load More"), button:has-text("Show More"), [data-testid*="load"], [aria-label*="more"]');
        if (loadMoreButton) {
          console.log(`   🔄 Clicking load more button...`);
          await loadMoreButton.click();
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (e) {
        // No load more button, continue
      }
      
      // Scroll to load more content (multiple times)
      let previousHeight = 0;
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 2000));
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
          console.log(`   ✅ Finished scrolling (iteration ${i + 1})`);
          break;
        }
        previousHeight = currentHeight;
      }
      
      // Wait a bit more for any lazy-loaded content
      await new Promise(r => setTimeout(r, 3000));
      
      // Wait a bit more for dynamic content
      await new Promise(r => setTimeout(r, 2000));
      
      // Try to get company cards directly from DOM first
      const companyCards = await page.evaluate(() => {
        const cards = [];
        // Look for common YC company card selectors
        const selectors = [
          'a[href*="/companies/"]',
          '.company-card',
          '[class*="Company"]',
          '[data-testid*="company"]'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(el => {
              const name = el.textContent?.trim() || el.getAttribute('aria-label') || '';
              const href = el.getAttribute('href') || '';
              if (name && name.length > 2 && name.length < 100) {
                cards.push({ name: name.split('\n')[0].trim(), url: href });
              }
            });
            if (cards.length > 0) break;
          }
        }
        return cards;
      });
      
      console.log(`   Found ${companyCards.length} company links in DOM`);
      
      const textContent = await page.evaluate(() => document.body.innerText);
      const textLength = textContent.length;
      console.log(`   Page text length: ${textLength} chars`);
      
      // Extract with Claude
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: `Extract ALL startup companies from this Y Combinator ${batch} batch page.

PAGE TEXT (first 60000 chars):
${textContent.slice(0, 60000)}

IMPORTANT: Look for company names in the text. They are usually listed with descriptions.
Return ONLY valid JSON (no markdown, no code blocks):
{"startups": [{"name": "Company Name", "description": "One-line description", "sector": "AI/Fintech/etc", "website": "url if visible", "location": "city if visible"}]}

If you find NO companies, return: {"startups": []}`
        }]
      });
      
      let data;
      try {
        const responseText = response.content[0].text;
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          console.log(`   ⚠️  No JSON found in response, trying to parse directly...`);
          data = { startups: [] };
        }
      } catch (parseError) {
        console.log(`   ⚠️  JSON parse error: ${parseError.message}`);
        console.log(`   Response preview: ${response.content[0].text.slice(0, 200)}`);
        data = { startups: [] };
      }
      
      // Merge DOM-extracted companies with AI-extracted
      let batchStartups = (data.startups || []).map(s => ({
        ...s,
        batch: batch,
        source: 'yc',
        scraped_at: new Date().toISOString()
      }));
      
      // Add DOM-extracted companies if AI found nothing
      if (batchStartups.length === 0 && companyCards.length > 0) {
        console.log(`   ⚠️  AI found 0, but DOM found ${companyCards.length} - using DOM data`);
        companyCards.forEach(card => {
          batchStartups.push({
            name: card.name,
            description: '',
            sector: 'Technology',
            website: card.url.startsWith('http') ? card.url : `https://www.ycombinator.com${card.url}`,
            batch: batch,
            source: 'yc',
            scraped_at: new Date().toISOString()
          });
        });
      }
      
      // Deduplicate
      batchStartups.forEach(s => {
        if (!allStartups.find(existing => existing.name === s.name)) {
          allStartups.push(s);
        }
      });
      
      console.log(`   ✅ Found ${batchStartups.length} startups in ${batch}`);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }
    
    await browser.close();
    
    console.log(`\n✅ Total YC startups: ${allStartups.length}`);
    return allStartups;
    
  } catch (error) {
    console.error('❌ YC scraping error:', error.message);
    try { await browser.close(); } catch {}
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function saveToDatabase(startups) {
  console.log('\n💾 SAVING TO DATABASE');
  console.log('═'.repeat(50));
  
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const startup of startups) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('startup_uploads')
        .select('id')
        .ilike('name', startup.name)
        .limit(1);
      
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Map to your schema (using correct column names from schema audit)
      const record = {
        name: startup.name,
        tagline: startup.tagline || startup.description?.slice(0, 200) || '',
        description: startup.description || startup.tagline || '',
        sectors: startup.sector ? [startup.sector] : ['Technology'],
        website: startup.website || null,
        location: startup.location || null,
        stage: mapStage(startup.stage || startup.batch),
        status: 'approved', // Auto-approve scraped startups
        source_type: startup.source || 'scraped', // Use source_type (required field)
        source_url: startup.website || null,
        // GOD score inference fields
        is_launched: true,
        has_customers: true, // Accelerator startups usually have some traction
        deployment_frequency: 'weekly',
        growth_rate_monthly: 15, // Conservative default
        days_from_idea_to_mvp: 60,
        total_god_score: 48, // Base score for accelerator startups (slightly higher)
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('startup_uploads')
        .insert(record);
      
      if (error) {
        console.error(`   ❌ ${startup.name}: ${error.message}`);
        errors++;
      } else {
        console.log(`   ✅ ${startup.name}`);
        saved++;
      }
      
    } catch (err) {
      console.error(`   ❌ ${startup.name}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n📊 Results: ${saved} saved, ${skipped} skipped (duplicates), ${errors} errors`);
  return { saved, skipped, errors };
}

function mapStage(stageOrBatch) {
  if (!stageOrBatch) return 1; // Pre-seed
  const s = stageOrBatch.toLowerCase();
  
  // YC batches are typically Seed stage
  if (s.includes('w24') || s.includes('s24') || s.includes('w23') || s.includes('s23')) return 2;
  
  // Stage mapping
  if (s.includes('pre-seed') || s.includes('idea')) return 0;
  if (s.includes('seed')) return 2;
  if (s.includes('series a') || s.includes('a')) return 3;
  if (s.includes('series b') || s.includes('b')) return 4;
  
  return 1; // Default to pre-seed for accelerator companies
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function testStagehand() {
  console.log('\n🧪 TESTING STAGEHAND');
  console.log('═'.repeat(50));
  
  console.log('Environment:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
  console.log(`  SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅' : '❌'}`);
  
  const { Stagehand } = await import('@browserbasehq/stagehand');
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    console.log('✅ Stagehand initialized');
    
    const page = stagehand.context.pages()[0];
    await page.goto('https://speedrun.a16z.com/companies/');
    console.log('✅ Page loaded');
    
    const result = await stagehand.extract(
      'Extract 3 startup company names from this page',
      z.object({ companies: z.array(z.string()) })
    );
    
    console.log('✅ Extracted:', result.companies?.join(', '));
    await stagehand.close();
    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    try { await stagehand.close(); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLI
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const cmd = process.argv[2];
  
  console.log('\n' + '═'.repeat(60));
  console.log('  🚀 SPEEDRUN + YC STARTUP SCRAPER');
  console.log('  Scrapes real early-stage startups for Hot Match');
  console.log('═'.repeat(60));
  
  switch (cmd) {
    case 'test':
      await testStagehand();
      break;
      
    case 'speedrun':
      const speedrunStartups = await scrapeSpeedrun();
      if (speedrunStartups.length > 0) {
        console.log('\n📋 Sample startups:');
        speedrunStartups.slice(0, 5).forEach(s => 
          console.log(`  • ${s.name} - ${s.sector || 'Tech'}: ${s.description?.slice(0, 50) || ''}...`)
        );
        
        const save = process.argv[3] === '--save';
        if (save) {
          await saveToDatabase(speedrunStartups);
        } else {
          console.log('\n💡 Add --save to insert into database');
        }
      }
      break;
      
    case 'yc':
      const ycStartups = await scrapeYC();
      if (ycStartups.length > 0) {
        console.log('\n📋 Sample startups:');
        ycStartups.slice(0, 5).forEach(s => 
          console.log(`  • ${s.name} (${s.batch}) - ${s.sector || 'Tech'}`)
        );
        
        const save = process.argv[3] === '--save';
        if (save) {
          await saveToDatabase(ycStartups);
        } else {
          console.log('\n💡 Add --save to insert into database');
        }
      }
      break;
      
    case 'all':
      console.log('\n🔄 Scraping all sources...\n');
      
      const speedrun = await scrapeSpeedrun();
      const yc = await scrapeYC();
      
      const allStartups = [...speedrun, ...yc];
      console.log(`\n📊 TOTAL: ${allStartups.length} startups`);
      console.log(`   Speedrun: ${speedrun.length}`);
      console.log(`   YC: ${yc.length}`);
      
      const save = process.argv[3] === '--save';
      if (save) {
        await saveToDatabase(allStartups);
      } else {
        console.log('\n💡 Add --save to insert into database');
      }
      break;
      
    default:
      console.log(`
Usage:
  node speedrun-yc-scraper.mjs test              Test Stagehand setup
  node speedrun-yc-scraper.mjs speedrun          Scrape a16z Speedrun
  node speedrun-yc-scraper.mjs speedrun --save   Scrape and save to DB
  node speedrun-yc-scraper.mjs yc                Scrape Y Combinator
  node speedrun-yc-scraper.mjs yc --save         Scrape and save to DB
  node speedrun-yc-scraper.mjs all               Scrape all sources
  node speedrun-yc-scraper.mjs all --save        Scrape all and save

Prerequisites:
  npm install @browserbasehq/stagehand zod --legacy-peer-deps
  npx playwright install chromium
  rm -rf node_modules/@browserbasehq/stagehand/node_modules/zod

Environment:
  ANTHROPIC_API_KEY     - Required for Stagehand
  VITE_SUPABASE_URL     - Required for database
  SUPABASE_SERVICE_KEY  - Required for database
`);
  }
}

main().catch(console.error);
