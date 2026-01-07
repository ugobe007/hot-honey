import 'dotenv/config';
import { z } from 'zod';

async function scrapeSpeedrun() {
  console.log('🚀 Scraping Speedrun...\n');

  const { Stagehand } = await import('@browserbasehq/stagehand');
  const stagehand = new Stagehand({
    env: 'LOCAL',
    headless: true,
    verbose: 1,
    model: {
      modelName: 'anthropic/claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  });

  await stagehand.init();
  
  // Get page and navigate
  const page = stagehand.context.pages()[0];
  await page.goto('https://speedrun.a16z.com/companies/');
  
  // Simple delay instead of waitForSelector
  await new Promise(r => setTimeout(r, 3000));
  console.log('✅ Page loaded\n');

  // Extract startups
  const result = await stagehand.extract(
    'Extract ALL startup companies from this accelerator page. For each include: name, one-line description, and sector (AI, Fintech, Healthcare, etc). Get as many as visible.',
    z.object({
      startups: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        sector: z.string().optional()
      }))
    })
  );

  const startups = result.startups || [];
  console.log(`\n📊 Found ${startups.length} startups:\n`);
  
  startups.forEach((s, i) => {
    console.log(`${i+1}. ${s.name} (${s.sector || 'Tech'})`);
    if (s.description) console.log(`   "${s.description.slice(0, 70)}..."`);
  });

  await stagehand.close();
  return startups;
}

scrapeSpeedrun().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
