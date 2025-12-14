#!/usr/bin/env node
/**
 * Discover New Investors
 * Scrapes VC websites from all-vc-urls-combined.txt to find new investors
 */

require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');

const VC_URLS_FILE = './all-vc-urls-combined.txt';
const BATCH_SIZE = 5;  // Process 5 at a time
const DELAY_BETWEEN_BATCHES = 10000;  // 10 seconds between batches

async function main() {
  console.log('\n🔥 Discovering New Investors from VC Websites\n');
  console.log('═'.repeat(70));
  
  // Read VC URLs
  if (!fs.existsSync(VC_URLS_FILE)) {
    console.error(`❌ File not found: ${VC_URLS_FILE}`);
    process.exit(1);
  }
  
  const urls = fs.readFileSync(VC_URLS_FILE, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));
  
  console.log(`📋 Found ${urls.length} VC URLs to scrape\n`);
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(urls.length / BATCH_SIZE);
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Batch ${batchNum}/${totalBatches} (URLs ${i+1}-${Math.min(i+BATCH_SIZE, urls.length)})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    for (const url of batch) {
      console.log(`\n🌐 Scraping: ${url}`);
      
      try {
        // Try team page first (most likely to have investor info)
        const teamUrls = [
          url.replace(/\/$/, '') + '/team',
          url.replace(/\/$/, '') + '/team/',
          url.replace(/\/$/, '') + '/people',
          url.replace(/\/$/, '') + '/about/team',
          url
        ];
        
        let scraped = false;
        for (const tryUrl of teamUrls) {
          try {
            const output = execSync(`node intelligent-scraper.js "${tryUrl}" investors`, {
              stdio: 'pipe',
              encoding: 'utf-8',
              timeout: 60000
            });
            
            // Parse output
            const addedMatch = output.match(/Investors: (\d+) added/);
            const skippedMatch = output.match(/(\d+) skipped/);
            
            if (addedMatch) {
              const added = parseInt(addedMatch[1]);
              const skipped = parseInt(skippedMatch?.[1] || 0);
              
              if (added > 0 || skipped > 0) {
                totalAdded += added;
                totalSkipped += skipped;
                console.log(`   ✅ ${added} new investors, ${skipped} already exist`);
                scraped = true;
                break;
              }
            }
          } catch (err) {
            // Try next URL variant
            continue;
          }
        }
        
        if (!scraped) {
          console.log(`   ⏭️  No investors found`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        totalErrors++;
      }
      
      // Small delay between URLs
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Delay between batches
    if (i + BATCH_SIZE < urls.length) {
      console.log(`\n⏸️  Pausing ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📈 DISCOVERY SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ New investors added: ${totalAdded}`);
  console.log(`⏭️  Already existed: ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`📊 URLs processed: ${urls.length}`);
  console.log('\n✨ Discovery complete!\n');
  console.log('💡 Next: Run bulk-enrich-investors.js to add details');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
