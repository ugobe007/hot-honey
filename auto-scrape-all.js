#!/usr/bin/env node
/**
 * AUTOMATED SCRAPING ORCHESTRATOR
 * Runs intelligent scraper on all configured sources
 */

const { execSync } = require('child_process');
const fs = require('fs');

const sources = JSON.parse(fs.readFileSync('./scraping-sources.json', 'utf-8'));

console.log('🤖 AUTOMATED SCRAPING ORCHESTRATOR\n');
console.log('═'.repeat(70));

async function scrapeCategory(category, urls) {
  console.log(`\n📂 Category: ${category.toUpperCase()}`);
  console.log(`🎯 Sources: ${urls.length}\n`);
  
  for (const source of urls) {
    console.log(`\n▶️  Scraping: ${source.name}`);
    console.log(`   URL: ${source.url}`);
    console.log(`   Priority: ${source.priority}\n`);
    
    try {
      const output = execSync(`node intelligent-scraper.js "${source.url}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        timeout: 5 * 60 * 1000 // 5 minute timeout
      });
    } catch (error) {
      console.error(`\n❌ Failed to scrape ${source.name}: ${error.message}\n`);
      continue;
    }
    
    // Wait between requests
    console.log('\n⏳ Waiting 5 seconds before next source...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

async function main() {
  const mode = process.argv[2] || 'all';
  
  console.log(`Mode: ${mode}\n`);
  console.log('This will scrape multiple sources and may take 30-60 minutes.');
  console.log('═'.repeat(70));
  
  if (mode === 'all' || mode === 'vcs') {
    await scrapeCategory('VC Firms', sources.vc_firms.filter(s => s.priority === 'high'));
  }
  
  if (mode === 'all' || mode === 'angels') {
    await scrapeCategory('Angel Groups', sources.angel_groups);
  }
  
  if (mode === 'all' || mode === 'startups') {
    await scrapeCategory('Startups', sources.startup_discovery.filter(s => s.priority === 'high'));
  }
  
  if (mode === 'all' || mode === 'news') {
    await scrapeCategory('News', sources.news.filter(s => s.priority === 'high'));
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('✅ SCRAPING ORCHESTRATION COMPLETE');
  console.log('═'.repeat(70));
  console.log('\nCheck your database for new investors and startups!\n');
}

main().catch(console.error);
