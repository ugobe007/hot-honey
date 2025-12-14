#!/usr/bin/env node
/**
 * COMPREHENSIVE SYSTEM AUDIT
 * Checks all processes, databases, and workflows
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function section(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

async function checkDatabase() {
  section('📊 DATABASE AUDIT');
  
  try {
    // Check main tables
    const tables = [
      { name: 'startup_uploads', desc: 'Manual/Bulk Imports' },
      { name: 'investors', desc: 'VC/Investor Database' },
      { name: 'startup_investor_matches', desc: 'Matching Engine Results' },
      { name: 'rss_sources', desc: 'RSS Feed Sources' },
      { name: 'rss_articles', desc: 'Scraped RSS Articles' },
      { name: 'discovered_startups', desc: 'RSS Discovered Startups' },
      { name: 'ai_logs', desc: 'AI Processing Logs' },
      { name: 'ml_jobs', desc: 'ML Training Jobs' }
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`  ❌ ${table.name}: ${error.message}`);
        } else {
          const status = count === 0 ? '⚠️ ' : '✅';
          console.log(`  ${status} ${table.name}: ${count} records (${table.desc})`);
        }
      } catch (err) {
        console.log(`  ❌ ${table.name}: Table doesn't exist or error`);
      }
    }
  } catch (error) {
    console.error('❌ Database audit failed:', error.message);
  }
}

async function checkProcesses() {
  section('⚙️  RUNNING PROCESSES');
  
  try {
    const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
    const processes = JSON.parse(pm2List);
    
    console.log(`\n  Total PM2 processes: ${processes.length}\n`);
    
    processes.forEach(proc => {
      const status = proc.pm2_env.status === 'online' ? '✅' : '❌';
      const memory = (proc.monit.memory / 1024 / 1024).toFixed(2);
      const uptime = Math.floor((Date.now() - proc.pm2_env.pm_uptime_timestamp) / 1000 / 60);
      
      console.log(`  ${status} ${proc.name}`);
      console.log(`     Status: ${proc.pm2_env.status}`);
      console.log(`     Memory: ${memory} MB`);
      console.log(`     Uptime: ${uptime} minutes`);
      console.log(`     Restarts: ${proc.pm2_env.restart_time}`);
      console.log('');
    });
  } catch (error) {
    console.log('  ⚠️  PM2 not running or no processes');
  }
  
  // Check if dev server is running
  try {
    execSync('lsof -i :5173', { encoding: 'utf-8' });
    console.log('  ✅ Vite Dev Server: Running on port 5173');
  } catch {
    console.log('  ❌ Vite Dev Server: Not running');
  }
}

async function checkWorkflow() {
  section('🔄 WORKFLOW STATUS');
  
  // Check startup pipeline
  const { data: pending } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  const { data: approved } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');
  
  const { data: rssReady } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .eq('imported_to_startups', false);
    
  const { data: rssImported } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .eq('imported_to_startups', true);
  
  console.log('\n  STEP 1: Bulk Import');
  console.log(`     → Manual imports ready for review: ${pending?.count || 0}`);
  console.log(`     → Already approved: ${approved?.count || 0}`);
  
  console.log('\n  STEP 2: Edit & Approve');
  console.log(`     → Startups pending approval: ${pending?.count || 0}`);
  console.log(`     → Action needed: ${pending?.count > 0 ? '⚠️  GO APPROVE!' : '✅ All clear'}`);
  
  console.log('\n  STEP 3: RSS Discovery');
  console.log(`     → Ready to import: ${rssReady?.count || 0}`);
  console.log(`     → Already imported: ${rssImported?.count || 0}`);
  console.log(`     → Action needed: ${rssReady?.count > 0 ? '⚠️  GO IMPORT!' : '✅ All clear'}`);
  
  // Check matches
  const { count: matchCount } = await supabase
    .from('startup_investor_matches')
    .select('*', { count: 'exact', head: true });
    
  console.log('\n  MATCHING ENGINE:');
  console.log(`     → Total matches generated: ${matchCount || 0}`);
  console.log(`     → Status: ${matchCount > 0 ? '✅ Working' : '⚠️  No matches yet'}`);
}

async function checkRSS() {
  section('📡 RSS SYSTEM');
  
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true);
  
  console.log(`\n  Active RSS Sources: ${sources?.length || 0}`);
  
  if (sources && sources.length > 0) {
    const neverScraped = sources.filter(s => !s.last_scraped).length;
    const recentlyScraped = sources.filter(s => {
      if (!s.last_scraped) return false;
      const lastScrape = new Date(s.last_scraped);
      const hoursSince = (Date.now() - lastScrape.getTime()) / 1000 / 60 / 60;
      return hoursSince < 2;
    }).length;
    
    console.log(`     → Never scraped: ${neverScraped}`);
    console.log(`     → Scraped recently (< 2hrs): ${recentlyScraped}`);
    console.log(`     → Needs scraping: ${neverScraped > 0 ? '⚠️  YES' : '✅ All current'}`);
  }
  
  const { data: articles } = await supabase
    .from('rss_articles')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\n  RSS Articles Collected: ${articles?.count || 0}`);
}

async function checkEnvironment() {
  section('🔧 ENVIRONMENT');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'VITE_OPENAI_API_KEY'
  ];
  
  console.log('');
  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${varName}: ${exists ? 'Set' : 'MISSING'}`);
  });
}

async function generateRecommendations() {
  section('💡 RECOMMENDATIONS');
  
  const { count: pendingCount } = await supabase
    .from('startup_uploads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  const { count: rssReadyCount } = await supabase
    .from('discovered_startups')
    .select('*', { count: 'exact', head: true })
    .eq('imported_to_startups', false);
    
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('active', true);
    
  const neverScraped = sources?.filter(s => !s.last_scraped).length || 0;
  
  console.log('');
  
  if (pendingCount > 0) {
    console.log(`  🔥 ACTION NEEDED: ${pendingCount} startups need approval`);
    console.log(`     → Go to: /admin/edit-startups`);
    console.log(`     → Click: "🚀 Bulk Approve" button\n`);
  }
  
  if (rssReadyCount > 0) {
    console.log(`  🔥 ACTION NEEDED: ${rssReadyCount} RSS startups ready to import`);
    console.log(`     → Go to: /admin/discovered-startups`);
    console.log(`     → Select startups → Click "Import Selected"\n`);
  }
  
  if (neverScraped > 0) {
    console.log(`  ⚠️  WARNING: ${neverScraped} RSS sources never scraped`);
    console.log(`     → Wait for next cycle (every 30 min)`);
    console.log(`     → Or manually run: node discover-startups-from-rss.js\n`);
  }
  
  if (pendingCount === 0 && rssReadyCount === 0) {
    console.log('  ✅ All clear! No immediate actions needed.\n');
    console.log('  📝 NEXT STEPS:');
    console.log('     1. Add more RSS sources at /admin/rss-manager');
    console.log('     2. Bulk import more startups at /admin/bulk-import');
    console.log('     3. Check matching engine at /matching-engine\n');
  }
}

async function main() {
  console.log('\n🔍 RUNNING COMPREHENSIVE SYSTEM AUDIT');
  console.log('⏰ ' + new Date().toLocaleString());
  
  await checkEnvironment();
  await checkProcesses();
  await checkDatabase();
  await checkWorkflow();
  await checkRSS();
  await generateRecommendations();
  
  console.log('\n' + '═'.repeat(70));
  console.log('  ✅ AUDIT COMPLETE');
  console.log('═'.repeat(70) + '\n');
}

main().catch(console.error);
