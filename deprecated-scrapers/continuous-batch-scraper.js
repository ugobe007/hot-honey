#!/usr/bin/env node
/**
 * CONTINUOUS BATCH SCRAPER
 * Processes all VC URLs, then waits and checks for new ones
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function scrapeAllUrls(urlFiles) {
  const allUrls = new Set();
  
  // Read all URL files
  for (const file of urlFiles) {
    if (fs.existsSync(file)) {
      const urls = fs.readFileSync(file, 'utf-8')
        .split('\n')
        .map(url => url.trim())
        .filter(url => url && url.startsWith('http'));
      urls.forEach(url => allUrls.add(url));
    }
  }
  
  const urls = Array.from(allUrls);
  console.log(`\n🚀 CONTINUOUS BATCH SCRAPER - ${urls.length} URLs\n`);
  console.log('═'.repeat(70));
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < urls.length; i++) {
    console.log(`\n[${i + 1}/${urls.length}] ${urls[i]}`);
    
    try {
      const output = execSync(`node intelligent-scraper.js "${urls[i]}" investors`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 2 * 60 * 1000
      });
      
      const addedMatch = output.match(/💼 Investors: (\d+) added/);
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
  console.log('🎉 BATCH COMPLETE');
  console.log(`✅ URLs processed: ${urls.length}`);
  console.log(`💼 Total investors added: ${totalAdded}`);
  console.log(`⏭️  Total skipped: ${totalSkipped}`);
  console.log(`❌ Total errors: ${totalErrors}\n`);
  
  return { totalAdded, totalSkipped, totalErrors };
}

async function main() {
  const urlFiles = ['vc-urls.txt', 'vc-urls-batch2.txt', 'vc-urls-batch3-seed.txt', 'vc-urls-batch4-specialized.txt'];
  
  console.log('🔄 Starting continuous batch scraper...');
  console.log('🛑 Press Ctrl+C to stop\n');
  
  while (true) {
    const stats = await scrapeAllUrls(urlFiles);
    
    if (stats.totalAdded === 0 && stats.totalErrors === 0) {
      console.log('✨ All URLs processed, all investors already exist');
      console.log('⏸️  Waiting 1 hour before checking again...\n');
      await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
    } else {
      console.log('⏸️  Waiting 10 minutes before next run...\n');
      await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000));
    }
  }
}

main().catch(console.error);
