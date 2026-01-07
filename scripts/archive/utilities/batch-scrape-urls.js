#!/usr/bin/env node
/**
 * BATCH URL SCRAPER
 * Reads URLs from file and scrapes them all
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const urlFile = process.argv[2] || 'vc-urls.txt';
  
  if (!fs.existsSync(urlFile)) {
    console.error(`❌ File not found: ${urlFile}`);
    process.exit(1);
  }
  
  const urls = fs.readFileSync(urlFile, 'utf-8')
    .split('\n')
    .map(url => url.trim())
    .filter(url => url && url.startsWith('http'));
  
  console.log(`\n🚀 BATCH SCRAPING ${urls.length} URLs\n`);
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
        timeout: 2 * 60 * 1000, // 2 min timeout per URL
        killSignal: 'SIGTERM'
      });
      
      // Parse results
      const addedMatch = output.match(/💼 Investors: (\d+) added/);
      const skippedMatch = output.match(/(\d+) skipped/);
      
      if (addedMatch) totalAdded += parseInt(addedMatch[1]);
      if (skippedMatch) totalSkipped += parseInt(skippedMatch[1]);
      
      console.log(`✅ Done`);
      
    } catch (error) {
      // Continue on error - don't stop the batch
      if (error.signal === 'SIGTERM' || error.signal === 'SIGINT') {
        console.log(`⚠️  Interrupted - continuing to next URL`);
      } else if (error.status) {
        console.log(`⚠️  Error (exit code ${error.status}) - continuing`);
      } else {
        console.log(`⚠️  ${error.message} - continuing`);
      }
      totalErrors++;
    }
    
    // Wait between requests
    if (i < urls.length - 1) {
      console.log('⏳ Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('🎉 BATCH SCRAPING COMPLETE');
  console.log('═'.repeat(70));
  console.log(`\n✅ URLs processed: ${urls.length}`);
  console.log(`💼 Total investors added: ${totalAdded}`);
  console.log(`⏭️  Total skipped: ${totalSkipped}`);
  console.log(`❌ Total errors: ${totalErrors}\n`);
}

main().catch(console.error);
