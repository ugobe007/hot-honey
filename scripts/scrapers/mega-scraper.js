#!/usr/bin/env node
/**
 * MEGA SCRAPER - Maximum Volume Discovery
 * 
 * Scrapes ALL sources from mega-source-list.txt
 * Goal: Find 100+ startups and investors per run
 * 
 * Run: node mega-scraper.js
 * PM2: pm2 start mega-scraper.js --cron-restart="0 0,6,12,18 * * *"
 */

require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load sources from file
function loadSources() {
  const sourceFile = './mega-source-list.txt';
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ mega-source-list.txt not found');
    process.exit(1);
  }
  
  return fs.readFileSync(sourceFile, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));
}

async function scrapeUrl(url, index, total) {
  const shortUrl = url.replace(/^https?:\/\//, '').substring(0, 40);
  process.stdout.write(`[${index}/${total}] ${shortUrl}... `);
  
  try {
    // Scrape for both startups and investors
    const output = execSync(`node intelligent-scraper.js "${url}" auto`, {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: 120000, // 2 minute timeout
      stdio: 'pipe'
    });
    
    const startupMatch = output.match(/🚀 Startups: (\d+) added/);
    const investorMatch = output.match(/💼 Investors: (\d+) added/);
    
    const startups = startupMatch ? parseInt(startupMatch[1]) : 0;
    const investors = investorMatch ? parseInt(investorMatch[1]) : 0;
    
    if (startups > 0 || investors > 0) {
      console.log(`✅ +${startups} startups, +${investors} investors`);
    } else {
      console.log(`⏭️`);
    }
    
    return { startups, investors, success: true };
    
  } catch (error) {
    console.log(`⚠️`);
    return { startups: 0, investors: 0, success: false };
  }
}

async function getStats() {
  const { count: startups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { count: discovered } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true });
  
  const { count: investors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  return { startups, discovered, investors };
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n');
  console.log('🔥'.repeat(35));
  console.log('🔥                                                                 🔥');
  console.log('🔥   MEGA SCRAPER - Maximum Volume Discovery                       🔥');
  console.log('🔥   Goal: 100+ new startups & investors per run                   🔥');
  console.log('🔥                                                                 🔥');
  console.log('🔥'.repeat(35));
  console.log(`\n⏰ Started: ${new Date().toISOString()}`);
  
  // Get starting stats
  const beforeStats = await getStats();
  console.log(`\n📊 BEFORE: ${beforeStats.discovered} discovered, ${beforeStats.startups} approved, ${beforeStats.investors} investors`);
  
  // Load all sources
  const sources = loadSources();
  console.log(`\n📋 Loaded ${sources.length} sources to scrape\n`);
  console.log('═'.repeat(70));
  
  let totalStartups = 0;
  let totalInvestors = 0;
  let successCount = 0;
  
  for (let i = 0; i < sources.length; i++) {
    const result = await scrapeUrl(sources[i], i + 1, sources.length);
    totalStartups += result.startups;
    totalInvestors += result.investors;
    if (result.success) successCount++;
    
    // Rate limit: 2 seconds between requests
    if (i < sources.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // Get ending stats
  const afterStats = await getStats();
  const duration = Math.round((Date.now() - startTime) / 1000 / 60);
  
  // Final report
  console.log('\n' + '═'.repeat(70));
  console.log('📊 MEGA SCRAPER RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n⏰ Completed: ${new Date().toISOString()}`);
  console.log(`⏱️  Duration: ${duration} minutes`);
  
  console.log(`\n📈 STARTUPS:`);
  console.log(`   • New discovered: ${afterStats.discovered - beforeStats.discovered}`);
  console.log(`   • Total discovered: ${afterStats.discovered}`);
  
  console.log(`\n💼 INVESTORS:`);
  console.log(`   • New added: ${afterStats.investors - beforeStats.investors}`);
  console.log(`   • Total investors: ${afterStats.investors}`);
  
  console.log(`\n📊 SCRAPING STATS:`);
  console.log(`   • Sources scraped: ${sources.length}`);
  console.log(`   • Successful: ${successCount}`);
  console.log(`   • Success rate: ${((successCount / sources.length) * 100).toFixed(1)}%`);
  
  const totalNew = (afterStats.discovered - beforeStats.discovered) + (afterStats.investors - beforeStats.investors);
  console.log('\n' + '═'.repeat(70));
  console.log(`✨ TOTAL NEW ENTITIES: +${totalNew}`);
  console.log('═'.repeat(70) + '\n');
  
  // Log to database
  try {
    await supabase.from('scraper_logs').insert({
      level: 'info',
      message: `Mega Scraper: +${afterStats.discovered - beforeStats.discovered} startups, +${afterStats.investors - beforeStats.investors} investors`,
      metadata: {
        startups_discovered: afterStats.discovered - beforeStats.discovered,
        investors_added: afterStats.investors - beforeStats.investors,
        sources_scraped: sources.length,
        success_rate: ((successCount / sources.length) * 100).toFixed(1) + '%',
        duration_minutes: duration
      }
    });
  } catch (e) {
    // Ignore logging errors
  }
}

main().catch(console.error);
