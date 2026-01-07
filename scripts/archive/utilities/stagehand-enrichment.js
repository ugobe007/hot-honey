#!/usr/bin/env node
/**
 * STAGEHAND ENRICHMENT SCRIPT
 * ===========================
 * 
 * Uses Stagehand (https://stagehand.dev) to scrape and enrich data:
 * - Investor portfolio pages
 * - Startup Crunchbase/LinkedIn profiles
 * - Founder backgrounds
 * - Recent funding news
 * 
 * Prerequisites:
 *   npm install @anthropic-ai/stagehand playwright
 *   npx playwright install
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Stagehand configuration
const STAGEHAND_CONFIG = {
  env: 'LOCAL',  // or 'BROWSERBASE' for cloud
  verbose: 1,
  debugDom: false,
  headless: true,
  modelName: 'claude-sonnet-4-20250514',
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY
  }
};

/**
 * Scrape investor portfolio from their website
 */
async function scrapeInvestorPortfolio(Stagehand, investor) {
  if (!investor.website) return null;
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  await stagehand.init();
  
  try {
    await stagehand.page.goto(investor.website, { waitUntil: 'networkidle' });
    
    // Use AI to find and extract portfolio companies
    const portfolioData = await stagehand.extract({
      instruction: `Extract all portfolio company names from this VC/investor website. 
                    Look for sections like "Portfolio", "Companies", "Investments", etc.
                    Return as a JSON array of company names.`,
      schema: {
        type: 'object',
        properties: {
          companies: { type: 'array', items: { type: 'string' } },
          investmentThesis: { type: 'string' },
          teamMembers: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    
    await stagehand.close();
    return portfolioData;
    
  } catch (err) {
    console.error('Error scraping', investor.website, err.message);
    await stagehand.close();
    return null;
  }
}

/**
 * Scrape startup info from Crunchbase
 */
async function scrapeStartupCrunchbase(Stagehand, startup) {
  const searchUrl = `https://www.crunchbase.com/textsearch?q=${encodeURIComponent(startup.name)}`;
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  await stagehand.init();
  
  try {
    await stagehand.page.goto(searchUrl, { waitUntil: 'networkidle' });
    
    // Click first result
    await stagehand.act({ action: 'click the first search result' });
    await stagehand.page.waitForTimeout(2000);
    
    // Extract company data
    const data = await stagehand.extract({
      instruction: `Extract startup information from this Crunchbase page:
                    - Founded date
                    - Total funding raised
                    - Latest funding round and amount
                    - Number of employees
                    - Headquarters location
                    - Industries/categories
                    - Key investors`,
      schema: {
        type: 'object',
        properties: {
          founded: { type: 'string' },
          totalFunding: { type: 'number' },
          latestRound: { type: 'string' },
          latestAmount: { type: 'number' },
          employees: { type: 'string' },
          location: { type: 'string' },
          industries: { type: 'array', items: { type: 'string' } },
          investors: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    
    await stagehand.close();
    return data;
    
  } catch (err) {
    console.error('Error scraping Crunchbase for', startup.name, err.message);
    await stagehand.close();
    return null;
  }
}

/**
 * Scrape LinkedIn profile for founder info
 */
async function scrapeFounderLinkedIn(Stagehand, linkedinUrl) {
  if (!linkedinUrl) return null;
  
  const stagehand = new Stagehand(STAGEHAND_CONFIG);
  await stagehand.init();
  
  try {
    await stagehand.page.goto(linkedinUrl, { waitUntil: 'networkidle' });
    
    const data = await stagehand.extract({
      instruction: `Extract founder profile information:
                    - Name
                    - Current title
                    - Previous companies (last 3)
                    - Education (university names)
                    - Years of experience
                    - Notable achievements`,
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          previousCompanies: { type: 'array', items: { type: 'string' } },
          education: { type: 'array', items: { type: 'string' } },
          yearsExperience: { type: 'number' }
        }
      }
    });
    
    await stagehand.close();
    return data;
    
  } catch (err) {
    console.error('Error scraping LinkedIn', err.message);
    await stagehand.close();
    return null;
  }
}

/**
 * Enrich investors with portfolio data
 */
async function enrichInvestors(limit = 10) {
  // Dynamic import for ES module
  const { Stagehand } = await import('@anthropic-ai/stagehand');
  
  console.log('🔍 Enriching investors with Stagehand...\n');
  
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, website, portfolio_companies')
    .eq('status', 'active')
    .is('portfolio_companies', null)
    .not('website', 'is', null)
    .limit(limit);
  
  console.log(`Found ${investors?.length || 0} investors to enrich\n`);
  
  for (const investor of investors || []) {
    console.log(`Processing: ${investor.name}`);
    
    const data = await scrapeInvestorPortfolio(Stagehand, investor);
    
    if (data && data.companies && data.companies.length > 0) {
      await supabase
        .from('investors')
        .update({
          portfolio_companies: data.companies,
          thesis: data.investmentThesis || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', investor.id);
      
      console.log(`  ✅ Found ${data.companies.length} portfolio companies`);
    } else {
      console.log(`  ⚠️ No portfolio data found`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n✅ Investor enrichment complete');
}

/**
 * Enrich startups with Crunchbase data
 */
async function enrichStartups(limit = 10) {
  const { Stagehand } = await import('@anthropic-ai/stagehand');
  
  console.log('🔍 Enriching startups with Crunchbase data...\n');
  
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, raise_amount, latest_funding_round')
    .eq('status', 'approved')
    .is('latest_funding_round', null)
    .limit(limit);
  
  console.log(`Found ${startups?.length || 0} startups to enrich\n`);
  
  for (const startup of startups || []) {
    console.log(`Processing: ${startup.name}`);
    
    const data = await scrapeStartupCrunchbase(Stagehand, startup);
    
    if (data) {
      const updates = {};
      if (data.totalFunding) updates.raise_amount = data.totalFunding;
      if (data.latestRound) updates.latest_funding_round = data.latestRound;
      if (data.latestAmount) updates.latest_funding_amount = data.latestAmount;
      if (data.location) updates.location = data.location;
      if (data.industries?.length) updates.sectors = data.industries;
      if (data.employees) {
        const match = data.employees.match(/(\d+)/);
        if (match) updates.team_size = parseInt(match[1]);
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('startup_uploads')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', startup.id);
        
        console.log(`  ✅ Updated: ${Object.keys(updates).join(', ')}`);
      }
    } else {
      console.log(`  ⚠️ No Crunchbase data found`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log('\n✅ Startup enrichment complete');
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const limit = parseInt(args[1]) || 10;
  
  switch (cmd) {
    case 'investors':
      await enrichInvestors(limit);
      break;
    case 'startups':
      await enrichStartups(limit);
      break;
    case 'test':
      console.log('Testing Stagehand installation...');
      try {
        const { Stagehand } = await import('@anthropic-ai/stagehand');
        const stagehand = new Stagehand({ ...STAGEHAND_CONFIG, headless: false });
        await stagehand.init();
        await stagehand.page.goto('https://example.com');
        console.log('✅ Stagehand is working!');
        await stagehand.close();
      } catch (err) {
        console.error('❌ Stagehand error:', err.message);
        console.log('\nInstall with:');
        console.log('  npm install @anthropic-ai/stagehand playwright');
        console.log('  npx playwright install');
      }
      break;
    default:
      console.log('Stagehand Enrichment Script');
      console.log('===========================\n');
      console.log('Usage:');
      console.log('  node stagehand-enrichment.js test              Test Stagehand setup');
      console.log('  node stagehand-enrichment.js investors [n]     Enrich n investors');
      console.log('  node stagehand-enrichment.js startups [n]      Enrich n startups');
      console.log('\nPrerequisites:');
      console.log('  npm install @anthropic-ai/stagehand playwright');
      console.log('  npx playwright install');
      console.log('  Set ANTHROPIC_API_KEY in .env');
  }
}

main().catch(console.error);
