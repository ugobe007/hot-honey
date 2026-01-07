import 'dotenv/config';
import { z } from 'zod';

async function test() {
  console.log('🎭 Testing Stagehand...');

  const { Stagehand } = await import('@browserbasehq/stagehand');

  const stagehand = new Stagehand({
    env: 'LOCAL',
    headless: true,  // No browser window popup
    verbose: 1,
    model: {
      modelName: 'anthropic/claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  });

  await stagehand.init();
  console.log('✅ Stagehand initialized');

  // Official API: get page from stagehand.context
  const page = stagehand.context.pages()[0];
  await page.goto('https://a16z.com/portfolio');
  console.log('✅ Page loaded');

  // Use stagehand.extract with Zod schema
  const result = await stagehand.extract(
    'Extract the names of 5 portfolio companies from this page',
    z.object({
      companies: z.array(z.string()).describe('Names of portfolio companies')
    })
  );

  console.log('📊 Extracted:', JSON.stringify(result, null, 2));

  await stagehand.close();
  console.log('✅ Test complete!');
}

test().catch(e => console.error('❌ Error:', e.message));
