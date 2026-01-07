import 'dotenv/config';
import { z } from 'zod';

const STAGEHAND_CONFIG = {
  env: 'LOCAL',
  headless: true,
  verbose: 1,
  model: {
    modelName: 'anthropic/claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY
  }
};

// EXPANDED filter for mature companies - include recent IPOs
// Key insight: a16z's portfolio page shows mostly exits because that's what VCs are proud of.
// To find actual startups for Hot Match, you'd want to:
// - Scrape Speedrun portfolio (https://speedrun.a16z.com/companies/) - their accelerator with actual early-stage startups
// - Use AngelList/Crunchbase - filter by "Seed" or "Series A" stage
// - Focus on smaller VCs - they often have more active, earlier-stage portfolios
const MATURE_COMPANIES = [
  // Big tech / original exits
  'airbnb', 'coinbase', 'facebook', 'meta', 'figma', 'github', 'instagram',
  'lyft', 'pinterest', 'roblox', 'slack', 'twitter', 'uber', 'dropbox',
  'stripe', 'spotify', 'snap', 'doordash', 'palantir', 'snowflake',
  'databricks', 'discord', 'notion', 'canva', 'instacart', 'reddit',
  // Recent IPOs (2020-2024)
  'pagerduty', 'samsara', 'wise', 'affirm', 'asana', 'unity', 'robinhood',
  'toast', 'gitlab', 'confluent', 'monday', 'hashicorp', 'datadog',
  'cloudflare', 'crowdstrike', 'zscaler', 'okta', 'twilio', 'mongodb',
  'digitalocean', 'docusign', 'zoom', 'peloton', 'doximity', 'duolingo',
  'coupang', 'bumble', 'compass', 'squarespace', 'marqeta', 'amplitude',
  'thoughtspot', 'freshworks', 'braze'
];

const EXIT_INDICATORS = ['ipo', 'acquired', 'public', 'spac', 'dpo', 'exit', 'm&a'];

function isStartup(company) {
  const name = (company.name || '').toLowerCase();
  const status = (company.status || '').toLowerCase();
  
  if (MATURE_COMPANIES.some(c => name.includes(c))) return false;
  if (EXIT_INDICATORS.some(ind => status.includes(ind))) return false;
  return true;
}

async function testStagehand() {
  console.log('🎭 Testing Stagehand with filtering...\n');
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅' : '❌'}`);
  
  const { Stagehand } = await import('@browserbasehq/stagehand');
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    console.log('✅ Stagehand initialized');
    
    const page = stagehand.context.pages()[0];
    // Use the filtered URL to show only active investments
    await page.goto('https://a16z.com/portfolio/?status=active');
    console.log('✅ Page loaded (Active filter)');
    
    const result = await stagehand.extract(
      'Extract 10 ACTIVE portfolio companies (not IPO, not Acquired). Include name and status.',
      z.object({ 
        companies: z.array(z.object({
          name: z.string(),
          status: z.string().optional()
        }))
      })
    );
    
    console.log('\n📊 Extraction results:');
    result.companies?.forEach(c => {
      const keep = isStartup(c);
      console.log(`   ${keep ? '✅ KEEP' : '❌ FILTER'} ${c.name} - ${c.status || 'Active'}`);
    });
    
    const startups = result.companies?.filter(isStartup) || [];
    const filtered = (result.companies?.length || 0) - startups.length;
    console.log(`\n📈 Summary: Kept ${startups.length}, filtered ${filtered} mature companies`);
    
    await stagehand.close();
    console.log('✅ Done!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    try { await stagehand.close(); } catch {}
  }
}

async function scrapeInvestor(url) {
  console.log(`\n🔍 Scraping: ${url}`);
  
  const { Stagehand } = await import('@browserbasehq/stagehand');
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  
  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];
    await page.goto(url);
    
    const result = await stagehand.extract(
      'Extract: firm name, investment thesis, sectors they invest in, stages (Seed/A/B), check size, location, partner names',
      z.object({
        name: z.string(),
        thesis: z.string().optional(),
        sectors: z.array(z.string()).optional(),
        stages: z.array(z.string()).optional(),
        checkSize: z.string().optional(),
        location: z.string().optional(),
        partners: z.array(z.string()).optional()
      })
    );
    
    console.log('✅ Extracted:', result.name);
    await stagehand.close();
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    try { await stagehand.close(); } catch {}
    return null;
  }
}

const [cmd, arg] = process.argv.slice(2);

console.log('═══════════════════════════════════════');
console.log('  🎭 STAGEHAND ENRICHMENT v2.0');
console.log('═══════════════════════════════════════');

if (cmd === 'test') {
  testStagehand();
} else if (cmd === 'investor-url' && arg) {
  scrapeInvestor(arg).then(r => console.log('\n📊 Result:', JSON.stringify(r, null, 2)));
} else {
  console.log(`
Usage:
  node stagehand-enrichment.mjs test
  node stagehand-enrichment.mjs investor-url https://a16z.com
`);
}
