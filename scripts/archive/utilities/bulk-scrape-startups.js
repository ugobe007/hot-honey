#!/usr/bin/env node
/**
 * BULK STARTUP SCRAPER
 * Scrapes a list of startup URLs and adds them to the database
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const urlFile = process.argv[2] || 'sample-startups.txt';
  
  if (!fs.existsSync(urlFile)) {
    console.error(`❌ File not found: ${urlFile}`);
    process.exit(1);
  }
  
  const urls = fs.readFileSync(urlFile, 'utf-8')
    .split('\n')
    .map(url => url.trim())
    .filter(url => url && url.startsWith('http'));
  
  console.log(`\n🚀 BULK STARTUP SCRAPER - ${urls.length} URLs\n`);
  console.log('═'.repeat(70));
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\n[${i + 1}/${urls.length}] ${urls[i]}`);
    
    try {
      const output = execSync(`node intelligent-scraper.js "${urls[i]}" startups`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 2 * 60 * 1000
      });
      
      const addedMatch = output.match(/🚀 Startups: (\d+) added/);
      const skippedMatch = output.match(/(\d+) skipped/);
      
      if (addedMatch) totalAdded += parseInt(addedMatch[1]);
      if (skippedMatch) totalSkipped += parseInt(skippedMatch[1]);
      
      console.log(`✅ Done`);
      
    } catch (error) {
      console.log(`⚠️  Error - continuing`);
      totalErrors++;
    }
    
    if (i < urls.length - 1) {
      console.log('⏳ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('🎉 BULK STARTUP SCRAPING COMPLETE');
  console.log('═'.repeat(70));
  console.log(`\n✅ URLs processed: ${urls.length}`);
  console.log(`🚀 Total startups added: ${totalAdded}`);
  console.log(`⏭️  Total skipped: ${totalSkipped}`);
  console.log(`❌ Total errors: ${totalErrors}\n`);
}

main().catch(console.error);
