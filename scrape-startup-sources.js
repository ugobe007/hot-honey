#!/usr/bin/env node
/**
 * SCRAPE STARTUP SOURCES
 * =======================
 * Scrapes all startup sources defined in startup-sources.js
 * 
 * Run: node scrape-startup-sources.js [priority]
 *   priority: 1, 2, or 3 (default: run priority 1 and 2)
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { ALL_SOURCES, getPriority1Sources, getPriority2Sources } = require('./startup-sources');

const args = process.argv.slice(2);
const priorityArg = args[0];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeSource(source) {
  console.log(`\n📍 ${source.name}`);
  console.log(`   URL: ${source.url}`);
  
  try {
    const output = execSync(
      `node intelligent-scraper.js "${source.url}" startups 2>&1`,
      { encoding: 'utf-8', timeout: 180000 }
    );
    
    // Parse results
    const addedMatch = output.match(/Startups?: (\d+) added/i);
    const updatedMatch = output.match(/(\d+) updated/i);
    const errorMatch = output.match(/error/i);
    
    if (addedMatch) {
      const added = parseInt(addedMatch[1]);
      const updated = updatedMatch ? parseInt(updatedMatch[1]) : 0;
      console.log(`   ✅ Added: ${added} | Updated: ${updated}`);
      return { success: true, added, updated };
    } else if (errorMatch) {
      console.log(`   ⚠️ Completed with warnings`);
      return { success: true, added: 0, updated: 0 };
    } else {
      console.log(`   ⏭️ No new startups found`);
      return { success: true, added: 0, updated: 0 };
    }
  } catch (error) {
    console.log(`   ❌ Error/timeout: ${error.message?.substring(0, 50) || 'Unknown'}`);
    return { success: false, added: 0, updated: 0 };
  }
}

async function main() {
  console.log('\n🚀 STARTUP SOURCE SCRAPER\n');
  console.log('═'.repeat(60));
  
  // Determine which sources to scrape
  let sourcesToScrape;
  if (priorityArg === '1') {
    sourcesToScrape = getPriority1Sources();
    console.log('Running Priority 1 sources only');
  } else if (priorityArg === '2') {
    sourcesToScrape = getPriority2Sources();
    console.log('Running Priority 1 + 2 sources');
  } else if (priorityArg === '3' || priorityArg === 'all') {
    sourcesToScrape = ALL_SOURCES;
    console.log('Running ALL sources (including Priority 3)');
  } else {
    // Default: Priority 1 + 2
    sourcesToScrape = getPriority2Sources();
    console.log('Running Priority 1 + 2 sources (default)');
  }
  
  console.log(`\n📊 Total sources to scrape: ${sourcesToScrape.length}`);
  console.log('═'.repeat(60));
  
  // Track stats
  let totalAdded = 0;
  let totalUpdated = 0;
  let successCount = 0;
  let failCount = 0;
  
  // Group by priority for progress display
  const byPriority = {};
  sourcesToScrape.forEach(s => {
    if (!byPriority[s.priority]) byPriority[s.priority] = [];
    byPriority[s.priority].push(s);
  });
  
  // Scrape in priority order
  for (const [priority, sources] of Object.entries(byPriority).sort((a, b) => a[0] - b[0])) {
    console.log(`\n\n🏷️  PRIORITY ${priority} SOURCES (${sources.length})\n` + '─'.repeat(40));
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      console.log(`[${i + 1}/${sources.length}]`);
      
      const result = await scrapeSource(source);
      
      if (result.success) {
        successCount++;
        totalAdded += result.added;
        totalUpdated += result.updated;
      } else {
        failCount++;
      }
      
      // Rate limiting - wait between requests
      if (i < sources.length - 1) {
        await sleep(5000); // 5 second delay between sources
      }
    }
  }
  
  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 SCRAPING COMPLETE\n');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total Added: ${totalAdded}`);
  console.log(`   🔄 Total Updated: ${totalUpdated}`);
  console.log('═'.repeat(60) + '\n');
  
  // Return exit code based on results
  process.exit(failCount > successCount ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
