import 'dotenv/config';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function scrapeSpeedrun() {
  console.log('🚀 Scraping Speedrun with Playwright + Claude...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://speedrun.a16z.com/companies/', { waitUntil: 'networkidle' });
  console.log('✅ Page loaded');

  // Get visible text content (cleaner than full HTML)
  const textContent = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log('📝 Extracting with Claude...\n');

  // Use Claude to extract startups
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `Extract ALL startup companies from this accelerator page text. Return a JSON object.

PAGE TEXT:
${textContent.slice(0, 30000)}

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"startups": [{"name": "Company Name", "description": "One line description", "sector": "AI or Fintech or Healthcare etc"}]}`
    }]
  });

  const text = response.content[0].text;
  
  // Parse JSON from response
  let data;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log('Raw response:', text.slice(0, 500));
    throw new Error('Failed to parse JSON');
  }
  
  const startups = data.startups || [];
  console.log(`📊 Found ${startups.length} startups:\n`);
  
  startups.forEach((s, i) => {
    console.log(`${i+1}. ${s.name} (${s.sector || 'Tech'})`);
    if (s.description) console.log(`   "${s.description.slice(0, 70)}"`);
  });

  await browser.close();
  
  console.log(`\n✅ Done! Found ${startups.length} startups`);
  return startups;
}

scrapeSpeedrun().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
