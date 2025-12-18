#!/usr/bin/env node
/**
 * FRESH INVESTOR DISCOVERY
 * Scrapes the fresh-vc-urls.txt for new VCs we haven't gotten yet
 * 
 * Run: node fresh-investor-scraper.js
 */

require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n🆕 FRESH INVESTOR DISCOVERY\n');
  console.log('═'.repeat(70));
  
  // Read fresh URLs
  const urlFile = './fresh-vc-urls.txt';
  if (!fs.existsSync(urlFile)) {
    console.error('❌ fresh-vc-urls.txt not found');
    process.exit(1);
  }
  
  const urls = fs.readFileSync(urlFile, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));
  
  console.log(`📋 Found ${urls.length} fresh VC URLs to scrape\n`);
  
  // Get starting count
  const { count: beforeCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Current investor count: ${beforeCount}\n`);
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`[${i + 1}/${urls.length}] ${url.substring(0, 50)}... `);
    
    try {
      const output = execSync(`node intelligent-scraper.js "${url}" investors`, {
        cwd: __dirname,
        encoding: 'utf-8',
        timeout: 60000,
        stdio: 'pipe'
      });
      
      const addedMatch = output.match(/💼 Investors: (\d+) added/);
      const skippedMatch = output.match(/(\d+) skipped/);
      
      const added = addedMatch ? parseInt(addedMatch[1]) : 0;
      const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
      
      totalAdded += added;
      totalSkipped += skipped;
      
      if (added > 0) {
        console.log(`✅ +${added} new`);
      } else if (skipped > 0) {
        console.log(`⏭️  ${skipped} exist`);
      } else {
        console.log(`📭 none found`);
      }
      
    } catch (error) {
      console.log(`⚠️  error`);
      totalErrors++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Get ending count
  const { count: afterCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n✅ New investors added: ${totalAdded}`);
  console.log(`⏭️  Already existed: ${totalSkipped}`);
  console.log(`⚠️  Errors: ${totalErrors}`);
  console.log(`\n📈 Total investors: ${beforeCount} → ${afterCount} (+${afterCount - beforeCount})`);
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
