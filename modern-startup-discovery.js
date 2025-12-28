#!/usr/bin/env node
/**
 * MODERN STARTUP DISCOVERY
 * Replaces broken RSS feeds with direct scraping of startup databases
 */

const { execSync } = require('child_process');

const STARTUP_DATABASES = [
  'https://www.ycombinator.com/companies',           // Y Combinator portfolio
  // 'https://www.producthunt.com/topics/developer-tools', // Product Hunt - DISABLED: returns 403
  'https://wellfound.com/discover/startups',         // Wellfound (AngelList)
  'https://techcrunch.com/startups/',                // TechCrunch Startups
  'https://www.crunchbase.com/discover/organization.companies/trending', // Crunchbase trending
];

async function main() {
  console.log('🚀 MODERN STARTUP DISCOVERY\n');
  console.log('═'.repeat(70));
  console.log('\n📊 Scraping startup databases instead of broken RSS feeds\n');
  
  let totalDiscovered = 0;
  
  for (let i = 0; i < STARTUP_DATABASES.length; i++) {
    const url = STARTUP_DATABASES[i];
    console.log(`\n[${i + 1}/${STARTUP_DATABASES.length}] ${url}`);
    
    try {
      const output = execSync(`node intelligent-scraper.js "${url}" startups`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 3 * 60 * 1000 // 3 min per database
      });
      
      const addedMatch = output.match(/🚀 Startups: (\d+) added/);
      if (addedMatch) {
        const count = parseInt(addedMatch[1]);
        totalDiscovered += count;
        console.log(`✅ Found ${count} new startups`);
      } else {
        console.log(`✅ Completed (check for duplicates)`);
      }
      
    } catch (error) {
      console.log(`⚠️  Error - continuing`);
    }
    
    // Wait between databases
    if (i < STARTUP_DATABASES.length - 1) {
      console.log('⏳ Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log(`✨ Total new startups discovered: ${totalDiscovered}`);
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
