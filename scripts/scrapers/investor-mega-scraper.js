#!/usr/bin/env node
/**
 * INVESTOR MEGA SCRAPER
 * Focused specifically on finding VCs, Angels, and PE investors
 * 
 * Scrapes:
 * - VC/PE news sites
 * - VC firm team pages
 * - Angel networks
 * - Investor blogs
 * 
 * Run: node investor-mega-scraper.js
 * Schedule: pm2 start investor-mega-scraper.js --cron-restart="0 3,9,15,21 * * *"
 */

require('dotenv').config();
const fs = require('fs');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Fallback credentials if .env fails to load
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://unkpogyhhjbvxxjvmxlt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.MYfYe8wDL1MYac1NHq2WkjFH27-eFUDi3Xn1hD5rLFA';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function loadSources() {
  const sourceFile = './investor-news-sources.txt';
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ investor-news-sources.txt not found');
    process.exit(1);
  }
  
  return fs.readFileSync(sourceFile, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));
}

async function scrapeForInvestors(url, index, total) {
  const shortUrl = url.replace(/^https?:\/\//, '').substring(0, 45);
  process.stdout.write(`[${index}/${total}] ${shortUrl}... `);
  
  try {
    // Force investor mode
    const output = execSync(`node intelligent-scraper.js "${url}" investors`, {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: 90000,
      stdio: 'pipe'
    });
    
    const investorMatch = output.match(/💼 Investors: (\d+) added/);
    const skippedMatch = output.match(/(\d+) skipped/);
    
    const added = investorMatch ? parseInt(investorMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;
    
    if (added > 0) {
      console.log(`✅ +${added} investors`);
    } else if (skipped > 0) {
      console.log(`⏭️ ${skipped} exist`);
    } else {
      console.log(`📭`);
    }
    
    return { added, skipped, success: true };
    
  } catch (error) {
    console.log(`⚠️`);
    return { added: 0, skipped: 0, success: false };
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n');
  console.log('💼'.repeat(35));
  console.log('💼                                                                 💼');
  console.log('💼   INVESTOR MEGA SCRAPER - VC & Angel Discovery                  💼');
  console.log('💼   Goal: Find 50+ new investors per run                          💼');
  console.log('💼                                                                 💼');
  console.log('💼'.repeat(35));
  console.log(`\n⏰ Started: ${new Date().toISOString()}`);
  
  // Get starting count
  const { count: beforeCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 BEFORE: ${beforeCount} investors in database`);
  
  // Load sources
  const sources = loadSources();
  console.log(`\n📋 Loaded ${sources.length} investor sources to scrape\n`);
  console.log('═'.repeat(70));
  
  let totalAdded = 0;
  let totalSkipped = 0;
  let successCount = 0;
  
  for (let i = 0; i < sources.length; i++) {
    const result = await scrapeForInvestors(sources[i], i + 1, sources.length);
    totalAdded += result.added;
    totalSkipped += result.skipped;
    if (result.success) successCount++;
    
    // Rate limit: 2 seconds between requests
    if (i < sources.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // Get ending count
  const { count: afterCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  const duration = Math.round((Date.now() - startTime) / 1000 / 60);
  const actualNew = afterCount - beforeCount;
  
  // Final report
  console.log('\n' + '═'.repeat(70));
  console.log('📊 INVESTOR MEGA SCRAPER RESULTS');
  console.log('═'.repeat(70));
  console.log(`\n⏰ Completed: ${new Date().toISOString()}`);
  console.log(`⏱️  Duration: ${duration} minutes`);
  
  console.log(`\n💼 INVESTORS:`);
  console.log(`   • New added: ${actualNew}`);
  console.log(`   • Already existed: ${totalSkipped}`);
  console.log(`   • Total in DB: ${afterCount}`);
  
  console.log(`\n📊 SCRAPING STATS:`);
  console.log(`   • Sources scraped: ${sources.length}`);
  console.log(`   • Successful: ${successCount}`);
  console.log(`   • Success rate: ${((successCount / sources.length) * 100).toFixed(1)}%`);
  
  console.log('\n' + '═'.repeat(70));
  console.log(`✨ NEW INVESTORS FOUND: +${actualNew}`);
  console.log('═'.repeat(70) + '\n');
  
  // Log to database
  try {
    await supabase.from('scraper_logs').insert({
      level: 'info',
      message: `Investor Mega Scraper: +${actualNew} new investors`,
      metadata: {
        investors_added: actualNew,
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
