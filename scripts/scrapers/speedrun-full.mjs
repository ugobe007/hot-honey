import 'dotenv/config';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { insertStartup, startupExists } = require('./lib/validated-inserts.js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function scrapeSpeedrun() {
  console.log('Scraping ALL Speedrun startups...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://speedrun.a16z.com/companies/', { waitUntil: 'networkidle' });
  console.log('Page loaded');

  // Scroll to load all content
  console.log('Scrolling to load all startups...');
  let previousHeight = 0;
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 1000));
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) break;
    previousHeight = currentHeight;
  }

  const textContent = await page.evaluate(() => document.body.innerText);
  
  console.log('Extracting with Claude...\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: 'Extract ALL startup companies from this a16z Speedrun accelerator page. PAGE TEXT:\n' + textContent.slice(0, 60000) + '\n\nReturn ONLY valid JSON: {"startups": [{"name": "Name", "description": "One-liner", "sector": "AI/Fintech/Healthcare/Consumer/Enterprise/Crypto/Other"}]}'
    }]
  });

  const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
  const data = JSON.parse(jsonMatch[0]);
  const startups = data.startups || [];
  
  console.log('Found ' + startups.length + ' startups\n');

  await browser.close();
  return startups;
}

async function saveToDatabase(startups) {
  console.log('\n💾 Saving to database (using validated inserts)...\n');
  
  let saved = 0, skipped = 0, errors = 0;
  
  for (const s of startups) {
    // Use validated insert function (it handles duplicates internally)
    const result = await insertStartup({
      name: s.name,
      description: s.description,
      tagline: s.description?.slice(0, 200),
      sectors: [s.sector || 'Technology'],
      stage: 1,
      status: 'approved',
      source_type: 'url', // Validated: must be 'manual' or 'url'
      source_url: 'https://speedrun.a16z.com/companies/',
      is_launched: true,
      has_customers: true,
      deployment_frequency: 'weekly',
      growth_rate_monthly: 15,
      days_from_idea_to_mvp: 45,
      total_god_score: 48
    });
    
    if (result.success) {
      saved++;
      console.log('  ✅ ' + s.name);
    } else if (result.skipped) {
      skipped++;
      console.log('  ⏭️  ' + s.name + ' - Already exists');
    } else {
      errors++;
      console.log('  ❌ ' + s.name + ': ' + result.error);
    }
  }
  
  console.log('\n📊 Results: ' + saved + ' saved, ' + skipped + ' skipped, ' + errors + ' errors');
}

const shouldSave = process.argv.includes('--save');

scrapeSpeedrun().then(async (startups) => {
  console.log('\nSample:');
  startups.slice(0, 10).forEach((s, i) => console.log('  ' + (i+1) + '. ' + s.name));
  
  if (shouldSave) {
    await saveToDatabase(startups);
  } else {
    console.log('\nRun with --save to add ' + startups.length + ' startups to database');
  }
}).catch(e => console.error('Error:', e.message));
