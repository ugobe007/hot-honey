#!/usr/bin/env node
/**
 * SCRAPER SYSTEM AUDIT
 * 
 * Audits what's actually running, what's configured, and what's in the database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function audit() {
  console.log('🔍 SCRAPER SYSTEM AUDIT');
  console.log('═'.repeat(70));
  console.log();

  // 1. Check PM2 processes
  console.log('📋 PM2 PROCESSES:');
  console.log('─'.repeat(70));
  try {
    const { execSync } = require('child_process');
    const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
    const processes = JSON.parse(pm2List);
    
    const scraperProcesses = processes.filter(p => 
      p.name.includes('scraper') || 
      p.name.includes('orchestrator') || 
      p.name.includes('automation') ||
      p.name.includes('rss') ||
      p.name.includes('discovery')
    );
    
    if (scraperProcesses.length === 0) {
      console.log('⚠️  No scraper processes found in PM2');
    } else {
      scraperProcesses.forEach(p => {
        const status = p.pm2_env.status === 'online' ? '✅' : '❌';
        console.log(`   ${status} ${p.name} (${p.pm2_env.status})`);
        console.log(`      Script: ${p.pm2_env.script}`);
        console.log(`      Restarts: ${p.pm2_env.restart_time}`);
        console.log();
      });
    }
  } catch (error) {
    console.log('⚠️  Could not check PM2 (may not be running)');
    console.log(`   Error: ${error.message}`);
  }
  console.log();

  // 2. Check ecosystem.config.js
  console.log('📄 ECOSYSTEM CONFIG:');
  console.log('─'.repeat(70));
  const ecosystemPath = path.join(__dirname, 'ecosystem.config.js');
  if (fs.existsSync(ecosystemPath)) {
    const config = require(ecosystemPath);
    const scraperApps = config.apps.filter(app => 
      app.name.includes('scraper') || 
      app.name.includes('orchestrator') || 
      app.name.includes('automation') ||
      app.name.includes('rss') ||
      app.name.includes('discovery')
    );
    
    console.log(`   Found ${scraperApps.length} scraper-related processes:`);
    scraperApps.forEach(app => {
      const enabled = app.enabled !== false ? '✅' : '⚠️';
      console.log(`   ${enabled} ${app.name}`);
      console.log(`      Script: ${app.script} ${app.args || ''}`);
      if (app.cron_restart) {
        console.log(`      Schedule: ${app.cron_restart}`);
      }
      console.log();
    });
  } else {
    console.log('⚠️  ecosystem.config.js not found');
  }
  console.log();

  // 3. Check database - recent activity
  console.log('💾 DATABASE ACTIVITY (Last 24h):');
  console.log('─'.repeat(70));
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Startups
    const { count: startups24h } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);
    
    const { count: totalStartups } = await supabase
      .from('startup_uploads')
      .select('*', { count: 'exact', head: true });
    
    // Discovered startups
    const { count: discovered24h } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);
    
    const { count: totalDiscovered } = await supabase
      .from('discovered_startups')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Startups (startup_uploads):`);
    console.log(`      Last 24h: ${startups24h || 0}`);
    console.log(`      Total: ${totalStartups || 0}`);
    console.log();
    console.log(`   Discovered (discovered_startups):`);
    console.log(`      Last 24h: ${discovered24h || 0}`);
    console.log(`      Total: ${totalDiscovered || 0}`);
    console.log();
    
    // Check for garbage names
    const { data: garbage } = await supabase
      .from('startup_uploads')
      .select('name')
      .or('name.ilike.%Much%,name.ilike.%SLC%,name.ilike.%Team Culture%,name.ilike.%Investor Updates%')
      .limit(10);
    
    if (garbage && garbage.length > 0) {
      console.log(`   ⚠️  Found ${garbage.length} potential garbage names:`);
      garbage.forEach(g => console.log(`      - ${g.name}`));
    }
    console.log();
    
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
  console.log();

  // 4. Check scraper files
  console.log('📁 SCRAPER FILES:');
  console.log('─'.repeat(70));
  const scraperFiles = [
    'tiered-scraper-pipeline.js',
    'unified-scraper-orchestrator.js',
    'automation-engine.js',
    'simple-rss-scraper.js',
    'intelligent-scraper.js',
    'discover-startups-from-rss.js',
    'continuous-scraper.js'
  ];
  
  scraperFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${file}`);
  });
  console.log();

  // 5. Summary
  console.log('📊 SUMMARY:');
  console.log('─'.repeat(70));
  console.log('   Recommendation: Use tiered-scraper-pipeline.js as single source of truth');
  console.log('   Next steps:');
  console.log('      1. Stop conflicting scrapers (automation-engine, unified-orchestrator)');
  console.log('      2. Add quality gates to tiered-scraper-pipeline.js');
  console.log('      3. Add observability dashboard');
  console.log('      4. Update ecosystem.config.js to use tiered-scraper-pipeline.js');
  console.log();
}

audit().catch(console.error);

