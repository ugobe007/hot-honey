#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  console.log('\n🔥 Discovering VCs from FULL URL List\n');
  
  const urls = fs.readFileSync('./all-vc-urls-unique.txt', 'utf-8')
    .split('\n')
    .filter(u => u.trim() && u.startsWith('http'));
  
  console.log('📋 Found ' + urls.length + ' VC URLs to scrape\n');
  
  let totalAdded = 0;
  let totalExist = 0;
  
  for (let i = 0; i < Math.min(urls.length, 60); i++) {
    const url = urls[i].trim();
    process.stdout.write('[' + (i+1) + '/60] ' + url.substring(0, 40) + '... ');
    
    try {
      const output = execSync(
        'node intelligent-scraper.js "' + url + '" investors',
        { encoding: 'utf-8', timeout: 45000, stdio: 'pipe' }
      );
      
      const addedMatch = output.match(/Investors: (\d+) added/);
      const skippedMatch = output.match(/(\d+) skipped/);
      
      const added = parseInt(addedMatch && addedMatch[1] ? addedMatch[1] : 0);
      const skipped = parseInt(skippedMatch && skippedMatch[1] ? skippedMatch[1] : 0);
      
      totalAdded += added;
      totalExist += skipped;
      
      if (added > 0) {
        console.log('✅ +' + added + ' new');
      } else if (skipped > 0) {
        console.log('⏭️  ' + skipped + ' exist');
      } else {
        console.log('❌ none');
      }
    } catch (e) {
      console.log('⚠️  error');
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n📊 Summary: +' + totalAdded + ' new, ' + totalExist + ' existed\n');
}

main();
