#!/usr/bin/env node
/**
 * SCRAPER HEALTH CHECK & MANAGER
 * ==============================
 * Check status, start/stop scrapers
 * 
 * Usage:
 *   node scraper-manager.js status   - Check if scrapers are running
 *   node scraper-manager.js start    - Start the scraper
 *   node scraper-manager.js stop     - Stop all scrapers
 *   node scraper-manager.js restart  - Restart scrapers
 */

import { createClient } from '@supabase/supabase-js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkStatus() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          🔍 SCRAPER HEALTH CHECK                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Time: ${new Date().toISOString()}\n`);
  
  // Check running processes
  try {
    const { stdout } = await execAsync('ps aux | grep -E "node.*scraper" | grep -v grep | grep -v scraper-manager');
    const lines = stdout.trim().split('\n').filter(l => l.length > 0);
    
    if (lines.length > 0) {
      console.log(`  ✅ ${lines.length} scraper process(es) running:\n`);
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const pid = parts[1];
        const cmd = parts.slice(10).join(' ').substring(0, 50);
        console.log(`     PID ${pid}: ${cmd}...`);
      }
    } else {
      console.log('  ⚠️  No scraper processes running!\n');
    }
  } catch (err) {
    console.log('  ⚠️  No scraper processes running!\n');
  }
  
  // Check database stats
  const { count: startupCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true });
  
  const { count: investorCount } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true });
  
  // Check recent additions
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count: recentStartups } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);
  
  const { count: recentInvestors } = await supabase
    .from('investors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo);
  
  console.log('\n  📊 DATABASE STATUS:');
  console.log(`     Total Startups:  ${startupCount}`);
  console.log(`     Total Investors: ${investorCount}`);
  console.log(`     Added (24h):     ${recentStartups} startups, ${recentInvestors} investors`);
  
  // Health assessment
  console.log('\n  🏥 HEALTH ASSESSMENT:');
  if (recentStartups > 0 || recentInvestors > 0) {
    console.log('     ✅ Data is being collected');
  } else {
    console.log('     ⚠️  No new data in 24 hours - scrapers may need restart');
  }
  
  console.log('\n');
}

async function stopScrapers() {
  console.log('  🛑 Stopping all scrapers...');
  try {
    await execAsync('pkill -f "scraper.js" 2>/dev/null || true');
    await execAsync('pkill -f "rss-scraper" 2>/dev/null || true');
    console.log('  ✅ Scrapers stopped\n');
  } catch (err) {
    console.log('  ✅ No scrapers to stop\n');
  }
}

async function startScraper() {
  console.log('  🚀 Starting scraper in background...\n');
  
  const child = spawn('node', ['sql-scraper.js'], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd()
  });
  
  child.unref();
  console.log(`  ✅ Scraper started (PID: ${child.pid})\n`);
}

async function main() {
  const command = process.argv[2] || 'status';
  
  switch (command) {
    case 'status':
      await checkStatus();
      break;
    case 'stop':
      await stopScrapers();
      break;
    case 'start':
      await startScraper();
      break;
    case 'restart':
      await stopScrapers();
      await new Promise(r => setTimeout(r, 1000));
      await startScraper();
      break;
    default:
      console.log('Usage: node scraper-manager.js [status|start|stop|restart]');
  }
}

main().catch(console.error);
