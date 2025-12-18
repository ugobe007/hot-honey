#!/usr/bin/env node
/**
 * FRESH STARTUP DISCOVERY
 * Scrapes fresh-startup-sources.txt for new startups
 * 
 * Run: node fresh-startup-scraper.js
 */

require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('\n🚀 FRESH STARTUP DISCOVERY\n');
  console.log('═'.repeat(70));
  
  // Read fresh URLs
  const urlFile = './fresh-startup-sources.txt';
  if (!fs.existsSync(urlFile)) {
    console.error('❌ fresh-startup-sources.txt not found');
    process.exit(1);
  }
  
  const urls = fs.readFileSync(urlFile, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));
  
  console.log(`📋 Found ${urls.length} fresh startup sources to scrape\n`);
  
  // Get starting count
  const { count: beforeDiscovered } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Current discovered startups: ${beforeDiscovered}\n`);
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`[${i + 1}/${urls.length}] ${url.substring(0, 50)}... `);
    
    try {
      const output = execSync(`node intelligent-scraper.js "${url}" startups`, {
        cwd: __dirname,
        encoding: 'utf-8',
        timeout: 90000, // 90 second timeout
        stdio: 'pipe'
      });
      
      const addedMatch = output.match(/🚀 Startups: (\d+) added/);
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
    
    // Rate limit - 3 seconds between requests
    await new Promise(r => setTimeout(r, 3000));
  }
  
  // Get ending count
  const { count: afterDiscovered } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n✅ New startups discovered: ${totalAdded}`);
  console.log(`⏭️  Already existed: ${totalSkipped}`);
  console.log(`⚠️  Errors: ${totalErrors}`);
  console.log(`\n📈 Total discovered: ${beforeDiscovered} → ${afterDiscovered} (+${afterDiscovered - beforeDiscovered})`);
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
