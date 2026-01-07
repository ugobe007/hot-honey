#!/usr/bin/env node
/**
 * HOT MATCH PM2 & SCRIPTS CLEANUP
 * ================================
 * 
 * This script:
 * 1. Stops and deletes crashed PM2 processes
 * 2. Creates new folder structure
 * 3. Moves scripts to appropriate locations
 * 4. Creates consolidated autopilot script
 * 
 * Run: node scripts/cleanup-pm2-and-scripts.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.cwd();

// Processes to delete (crashed/stopped)
const PROCESSES_TO_DELETE = [
  'watchdog',
  'system-guardian',
  'ai-agent',
  'god-score-monitor',
  'score-recalc',
  'inference-enrichment',
  'match-health-monitor',
  'auto-import',
  'match-regen',
  'rss-discovery',
  'automation-pipeline',
  'daily-report'
];

// Processes to keep (running)
const PROCESSES_TO_KEEP = [
  'hot-match-server',
  'match-processor',
  'rss-scraper',
  'scraper',
  'orchestrator',
  'automation-engine',
  'enrichment-pipeline'
];

console.log('\n' + '═'.repeat(70));
console.log('🧹 HOT MATCH PM2 & SCRIPTS CLEANUP');
console.log('═'.repeat(70) + '\n');

// Step 1: Delete crashed PM2 processes
console.log('📋 Step 1: Cleaning up PM2 processes...\n');

let deletedCount = 0;
let errorCount = 0;

for (const proc of PROCESSES_TO_DELETE) {
  try {
    // Check if process exists
    const checkCmd = `pm2 describe ${proc} 2>&1`;
    const checkResult = execSync(checkCmd, { encoding: 'utf-8', stdio: 'pipe' });
    
    if (!checkResult.includes('not found')) {
      console.log(`   🗑️  Deleting: ${proc}`);
      execSync(`pm2 delete ${proc}`, { encoding: 'utf-8', stdio: 'pipe' });
      deletedCount++;
    } else {
      console.log(`   ⏭️  Skipped: ${proc} (not found)`);
    }
  } catch (err) {
    console.log(`   ⚠️  Error deleting ${proc}: ${err.message}`);
    errorCount++;
  }
}

console.log(`\n   ✅ Deleted ${deletedCount} processes`);
if (errorCount > 0) {
  console.log(`   ⚠️  ${errorCount} errors encountered`);
}

// Save PM2 state
try {
  execSync('pm2 save', { encoding: 'utf-8', stdio: 'pipe' });
  console.log('   💾 Saved PM2 state\n');
} catch (err) {
  console.log(`   ⚠️  Could not save PM2 state: ${err.message}\n`);
}

// Step 2: Create folder structure
console.log('📁 Step 2: Creating folder structure...\n');

const folders = [
  'scripts/core',
  'scripts/cli',
  'scripts/cron',
  'scripts/archive',
  'scripts/archive/utilities',
  'scripts/archive/one-off',
  'scripts/archive/deprecated'
];

for (const folder of folders) {
  const fullPath = path.join(ROOT_DIR, folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`   ✅ Created: ${folder}/`);
  } else {
    console.log(`   ⏭️  Exists: ${folder}/`);
  }
}

// Step 3: Move utilities to archive
console.log('\n📦 Step 3: Archiving utilities...\n');

const utilitiesDir = path.join(ROOT_DIR, 'scripts/utilities');
const archiveUtilitiesDir = path.join(ROOT_DIR, 'scripts/archive/utilities');

if (fs.existsSync(utilitiesDir)) {
  try {
    const files = fs.readdirSync(utilitiesDir);
    console.log(`   📋 Found ${files.length} files in scripts/utilities/`);
    
    // Move files
    let movedCount = 0;
    for (const file of files) {
      const src = path.join(utilitiesDir, file);
      const dest = path.join(archiveUtilitiesDir, file);
      
      if (fs.statSync(src).isFile()) {
        fs.renameSync(src, dest);
        movedCount++;
      }
    }
    
    console.log(`   ✅ Moved ${movedCount} files to archive/utilities/`);
    
    // Try to remove empty utilities directory
    try {
      fs.rmdirSync(utilitiesDir);
      console.log('   ✅ Removed empty utilities/ directory');
    } catch {
      console.log('   ⚠️  Could not remove utilities/ (may not be empty)');
    }
  } catch (err) {
    console.log(`   ⚠️  Error archiving utilities: ${err.message}`);
  }
} else {
  console.log('   ⏭️  scripts/utilities/ not found');
}

// Step 4: Move deprecated to archive
console.log('\n📦 Step 4: Archiving deprecated...\n');

const deprecatedDir = path.join(ROOT_DIR, 'scripts/deprecated');
const archiveDeprecatedDir = path.join(ROOT_DIR, 'scripts/archive/deprecated');

if (fs.existsSync(deprecatedDir)) {
  try {
    const files = fs.readdirSync(deprecatedDir);
    console.log(`   📋 Found ${files.length} files in scripts/deprecated/`);
    
    // Move files
    let movedCount = 0;
    for (const file of files) {
      const src = path.join(deprecatedDir, file);
      const dest = path.join(archiveDeprecatedDir, file);
      
      if (fs.statSync(src).isFile()) {
        fs.renameSync(src, dest);
        movedCount++;
      }
    }
    
    console.log(`   ✅ Moved ${movedCount} files to archive/deprecated/`);
    
    // Try to remove empty deprecated directory
    try {
      fs.rmdirSync(deprecatedDir);
      console.log('   ✅ Removed empty deprecated/ directory');
    } catch {
      console.log('   ⚠️  Could not remove deprecated/ (may not be empty)');
    }
  } catch (err) {
    console.log(`   ⚠️  Error archiving deprecated: ${err.message}`);
  }
} else {
  console.log('   ⏭️  scripts/deprecated/ not found');
}

// Step 5: Identify core scripts
console.log('\n🔍 Step 5: Identifying core scripts...\n');

const coreScripts = [
  { name: 'unified-scraper-orchestrator.js', current: 'scripts/core/unified-scraper-orchestrator.js' },
  { name: 'queue-processor-v16.js', current: 'scripts/core/queue-processor-v16.js' },
];

for (const script of coreScripts) {
  const fullPath = path.join(ROOT_DIR, script.current);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ Found: ${script.current}`);
  } else {
    console.log(`   ⚠️  Missing: ${script.current}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log('📊 CLEANUP SUMMARY');
console.log('═'.repeat(70));
console.log(`
   PM2 processes deleted: ${deletedCount}
   Folders created:       ${folders.length}
   Scripts archived:      See above
   
   Next steps:
   1. Review PM2 processes: pm2 list
   2. Create autopilot.js:  See scripts/core/autopilot.js template
   3. Update package.json: Add new npm scripts
   4. Test core processes: pm2 restart all
`);

console.log('💡 To create the autopilot script, run:');
console.log('   node scripts/create-autopilot.js\n');

