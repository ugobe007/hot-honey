#!/usr/bin/env node
require('dotenv').config();
const { execSync } = require('child_process');

const STARTUP_SOURCES = [
  // YC and accelerators
  'https://www.ycombinator.com/companies?batch=W25',
  'https://www.ycombinator.com/companies?batch=S24',
  'https://www.ycombinator.com/companies?batch=W24',
  'https://www.techstars.com/portfolio',
  'https://www.500.co/startups',
  
  // Product discovery platforms
  'https://www.producthunt.com/topics/artificial-intelligence',
  'https://www.producthunt.com/topics/fintech',
  'https://www.producthunt.com/topics/health',
  
  // Funding databases
  'https://news.crunchbase.com/sections/venture/',
  'https://techcrunch.com/category/startups/',
  'https://www.cbinsights.com/research-unicorn-companies',
  
  // Angel/early stage
  'https://wellfound.com/discover/startups',
  'https://angel.co/companies',
  
  // Regional accelerators
  'https://skydeck.berkeley.edu/portfolio/',
  'https://www.plugandplaytechcenter.com/startups/',
  'https://www.alchemistaccelerator.com/portfolio',
];

async function main() {
  console.log('\n🚀 Discovering More Startups\n');
  console.log('Sources: ' + STARTUP_SOURCES.length);
  
  let total = 0;
  
  for (let i = 0; i < STARTUP_SOURCES.length; i++) {
    const url = STARTUP_SOURCES[i];
    console.log('\n[' + (i+1) + '/' + STARTUP_SOURCES.length + '] ' + url);
    
    try {
      const output = execSync(
        'node intelligent-scraper.js "' + url + '" startups',
        { encoding: 'utf-8', timeout: 180000, stdio: 'pipe' }
      );
      
      const match = output.match(/Startups: (\d+) added/);
      if (match) {
        total += parseInt(match[1]);
        console.log('  ✅ +' + match[1] + ' startups');
      } else {
        console.log('  ⏭️ No new startups');
      }
    } catch (e) {
      console.log('  ⚠️ Error/timeout');
    }
    
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('\n📊 Total new startups: ' + total + '\n');
}

main();
