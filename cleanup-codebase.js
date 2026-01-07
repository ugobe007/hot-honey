#!/usr/bin/env node
/**
 * HOT MATCH CODEBASE CLEANUP
 * ==========================
 * Safe reorganization of the Hot Match codebase.
 * 
 * PRINCIPLES:
 * 1. NEVER delete files - move to deprecated/
 * 2. Audit before any changes
 * 3. Create manifest of all moves
 * 4. Reversible with undo script
 * 
 * Run: node cleanup-codebase.js --audit        # See what we have
 * Run: node cleanup-codebase.js --plan         # See what will happen
 * Run: node cleanup-codebase.js --execute      # Actually move files
 * Run: node cleanup-codebase.js --undo         # Reverse all moves
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOT_DIR = process.cwd();
const MANIFEST_FILE = 'cleanup-manifest.json';

// Target folder structure
const FOLDER_STRUCTURE = {
  'scripts/core': 'Essential active scripts',
  'scripts/enrichment': 'Data enrichment scripts',
  'scripts/scrapers': 'RSS and web scrapers',
  'scripts/matching': 'Matching and scoring scripts',
  'scripts/utilities': 'One-off tools and utilities',
  'scripts/deprecated': 'Old versions - archived, not deleted',
  'lib': 'Shared libraries',
  'docs': 'Documentation',
};

// CORE SCRIPTS - These are the keepers (newest/best versions)
const CORE_SCRIPTS = {
  // Main pipeline
  'enrichment-orchestrator.js': 'scripts/core',
  'hot-match-autopilot.js': 'scripts/core',
  'unified-scraper-orchestrator.js': 'scripts/core',
  
  // GOD Scoring (keep only v5)
  'god-score-v5-tiered.js': 'scripts/core',
  
  // Queue processing (keep only v16)
  'queue-processor-v16.js': 'scripts/core',
  
  // RSS scraping
  'simple-rss-scraper.js': 'scripts/core',
  
  // Inference engines
  'investor-inference-engine.js': 'scripts/core',
  'startup-inference-engine.js': 'scripts/core',
  
  // Matching
  'intelligent-matching-v16.js': 'scripts/core',
  
  // Auto-import
  'auto-import-pipeline.js': 'scripts/core',
  
  // Queue management
  'populate-matching-queue.js': 'scripts/core',
};

// ENRICHMENT SCRIPTS - Keep but organize
const ENRICHMENT_SCRIPTS = {
  'enrich-investor-websites.js': 'scripts/enrichment',
  'enrich-startups-ai.js': 'scripts/enrichment',
  'enrich-investor-data.ts': 'scripts/enrichment',
  'enrich-taglines-pitches.js': 'scripts/enrichment',
  'enrich-locations.js': 'scripts/enrichment',
  'enrich-founder-ages-v2.js': 'scripts/enrichment',
  'enrich-yc-style-metrics.js': 'scripts/enrichment',
  'enrich-with-dynamicmatch.js': 'scripts/enrichment',
  'enrich-discovered-startups.js': 'scripts/enrichment',
  'enrich-startup-uploads.js': 'scripts/enrichment',
};

// SCRAPER SCRIPTS - Keep but organize
const SCRAPER_SCRIPTS = {
  'continuous-scraper.js': 'scripts/scrapers',
  'enhanced-startup-discovery.js': 'scripts/scrapers',
  'intelligent-scraper.js': 'scripts/scrapers',
  'multimodal-scraper.js': 'scripts/scrapers',
  'stagehand-enrichment.mjs': 'scripts/scrapers',
  'mega-scraper.js': 'scripts/scrapers',
  'investor-mega-scraper.js': 'scripts/scrapers',
  'yc-companies-scraper.js': 'scripts/scrapers',
  'sequoia-scraper.js': 'scripts/scrapers',
  'hax-scraper.js': 'scripts/scrapers',
  'speedrun-full.mjs': 'scripts/scrapers',
  'speedrun-yc-scraper.mjs': 'scripts/scrapers',
  'tiered-scraper-pipeline.js': 'scripts/scrapers',
};

// MATCHING/SCORING SCRIPTS - Keep but organize  
const MATCHING_SCRIPTS = {
  'run-inference-pipeline.js': 'scripts/matching',
  'generate-matches.js': 'scripts/matching',
  'calculate-match-scores.js': 'scripts/matching',
};

// UTILITY SCRIPTS - Keep but organize
const UTILITY_SCRIPTS = {
  'card-data-doctor.js': 'scripts/utilities',
  'check-db-status.js': 'scripts/utilities',
  'test-dynamicmatch-v2.js': 'scripts/utilities',
  'fix-rss-sources.js': 'scripts/utilities',
  'import-investors.js': 'scripts/utilities',
  'import-startups.js': 'scripts/utilities',
  'cleanup-mature-companies.js': 'scripts/utilities',
  'cleanup-garbage-startups.js': 'scripts/utilities',
  'check-card-data-status.js': 'scripts/utilities',
  'audit-scraper-system.js': 'scripts/utilities',
  'fix-blocked-rss-feeds.js': 'scripts/utilities',
  'add-premium-sources.js': 'scripts/utilities',
};

// DEPRECATED PATTERNS - Move to deprecated/
const DEPRECATED_PATTERNS = [
  /god-score-v[1-4].*\.js$/,           // Old GOD score versions
  /queue-processor-v(?!16)[0-9]+\.js$/, // Old queue processor versions
  /enrich.*-v[0-9]+\.js$/,             // Old enrichment versions (except v2)
  /-old\.js$/,                          // Explicitly marked old
  /-backup\.js$/,                       // Backup files
  /\.bak$/,                             // Backup files
  /test-.*\.js$/,                       // Test files (keep some)
];

// FILES TO IGNORE (don't move these)
const IGNORE_PATTERNS = [
  /^node_modules/,
  /^\.git/,
  /^\.next/,
  /^dist/,
  /^build/,
  /^src\//,           // Don't touch React source
  /^public\//,        // Don't touch public assets
  /^\.env/,           // Don't touch env files
  /package.*\.json$/, // Don't touch package files
  /tsconfig\.json$/,
  /vite\.config/,
  /tailwind\.config/,
  /postcss\.config/,
  /eslint/,
  /prettier/,
  /^README/,
  /^LICENSE/,
  /cleanup-/,         // Don't move cleanup scripts
  /^scripts\//,       // Already in scripts folder
  /^lib\//,           // Already in lib folder
  /^docs\//,          // Already in docs folder
  /^supabase\//,      // Don't touch Supabase migrations
];

// ============================================================================
// UTILITIES
// ============================================================================

function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function isDeprecated(fileName) {
  return DEPRECATED_PATTERNS.some(pattern => pattern.test(fileName));
}

function getTargetFolder(fileName) {
  // Check each category
  if (CORE_SCRIPTS[fileName]) return CORE_SCRIPTS[fileName];
  if (ENRICHMENT_SCRIPTS[fileName]) return ENRICHMENT_SCRIPTS[fileName];
  if (SCRAPER_SCRIPTS[fileName]) return SCRAPER_SCRIPTS[fileName];
  if (MATCHING_SCRIPTS[fileName]) return MATCHING_SCRIPTS[fileName];
  if (UTILITY_SCRIPTS[fileName]) return UTILITY_SCRIPTS[fileName];
  
  // Check if deprecated
  if (isDeprecated(fileName)) return 'scripts/deprecated';
  
  // Default: if it's a .js file in root, move to utilities
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) return 'scripts/utilities';
  
  return null; // Don't move
}

function getAllFiles(dir, fileList = [], relativePath = '') {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = relativePath ? `${relativePath}/${file}` : file;
    
    if (shouldIgnore(relPath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, fileList, relPath);
    } else {
      fileList.push({
        name: file,
        path: relPath,
        fullPath,
        size: stat.size,
        modified: stat.mtime,
      });
    }
  }
  
  return fileList;
}

// ============================================================================
// AUDIT MODE
// ============================================================================

function runAudit() {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 HOT MATCH CODEBASE AUDIT');
  console.log('═'.repeat(70) + '\n');
  
  const allFiles = getAllFiles(ROOT_DIR);
  
  // Categorize files
  const categories = {
    core: [],
    enrichment: [],
    scrapers: [],
    matching: [],
    utilities: [],
    deprecated: [],
    unknown: [],
    ignored: [],
  };
  
  // Find all JS files in root
  const rootJsFiles = allFiles.filter(f => !f.path.includes('/') && (f.name.endsWith('.js') || f.name.endsWith('.mjs')));
  
  console.log(`📁 Found ${rootJsFiles.length} JavaScript files in root directory\n`);
  
  for (const file of rootJsFiles) {
    const target = getTargetFolder(file.name);
    
    if (!target) {
      categories.unknown.push(file);
    } else if (target === 'scripts/core') {
      categories.core.push(file);
    } else if (target === 'scripts/enrichment') {
      categories.enrichment.push(file);
    } else if (target === 'scripts/scrapers') {
      categories.scrapers.push(file);
    } else if (target === 'scripts/matching') {
      categories.matching.push(file);
    } else if (target === 'scripts/utilities') {
      categories.utilities.push(file);
    } else if (target === 'scripts/deprecated') {
      categories.deprecated.push(file);
    }
  }
  
  // Print results
  console.log('🟢 CORE SCRIPTS (keep in scripts/core/)');
  console.log('─'.repeat(50));
  if (categories.core.length === 0) {
    console.log('   (none found - may already be organized)');
  }
  for (const f of categories.core) {
    console.log(`   ✓ ${f.name}`);
  }
  
  console.log('\n🔵 ENRICHMENT SCRIPTS (move to scripts/enrichment/)');
  console.log('─'.repeat(50));
  for (const f of categories.enrichment) {
    console.log(`   → ${f.name}`);
  }
  
  console.log('\n🟣 SCRAPER SCRIPTS (move to scripts/scrapers/)');
  console.log('─'.repeat(50));
  for (const f of categories.scrapers) {
    console.log(`   → ${f.name}`);
  }
  
  console.log('\n🟡 MATCHING SCRIPTS (move to scripts/matching/)');
  console.log('─'.repeat(50));
  for (const f of categories.matching) {
    console.log(`   → ${f.name}`);
  }
  
  console.log('\n⚪ UTILITY SCRIPTS (move to scripts/utilities/)');
  console.log('─'.repeat(50));
  for (const f of categories.utilities) {
    console.log(`   → ${f.name}`);
  }
  
  console.log('\n🔴 DEPRECATED (move to scripts/deprecated/)');
  console.log('─'.repeat(50));
  for (const f of categories.deprecated) {
    console.log(`   ⚠ ${f.name}`);
  }
  
  console.log('\n❓ UNKNOWN (needs manual review)');
  console.log('─'.repeat(50));
  for (const f of categories.unknown) {
    console.log(`   ? ${f.name}`);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('📈 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`
   Core scripts:       ${categories.core.length}
   Enrichment scripts: ${categories.enrichment.length}
   Scraper scripts:    ${categories.scrapers.length}
   Matching scripts:   ${categories.matching.length}
   Utility scripts:    ${categories.utilities.length}
   Deprecated:         ${categories.deprecated.length}
   Unknown:            ${categories.unknown.length}
   ─────────────────────────────
   TOTAL:              ${rootJsFiles.length}
  `);
  
  console.log('\n💡 Next steps:');
  console.log('   1. Review the categorization above');
  console.log('   2. Run: node cleanup-codebase.js --plan    (see exact moves)');
  console.log('   3. Run: node cleanup-codebase.js --execute (do the moves)\n');
  
  return categories;
}

// ============================================================================
// PLAN MODE
// ============================================================================

function runPlan() {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 CLEANUP EXECUTION PLAN');
  console.log('═'.repeat(70) + '\n');
  
  const allFiles = getAllFiles(ROOT_DIR);
  const rootJsFiles = allFiles.filter(f => !f.path.includes('/') && (f.name.endsWith('.js') || f.name.endsWith('.mjs')));
  
  const moves = [];
  
  for (const file of rootJsFiles) {
    const target = getTargetFolder(file.name);
    if (target) {
      moves.push({
        from: file.path,
        to: `${target}/${file.name}`,
        category: target.split('/').pop(),
      });
    }
  }
  
  // Create folder structure plan
  console.log('📁 FOLDERS TO CREATE:');
  console.log('─'.repeat(50));
  for (const [folder, desc] of Object.entries(FOLDER_STRUCTURE)) {
    const exists = fs.existsSync(path.join(ROOT_DIR, folder));
    console.log(`   ${exists ? '✓' : '+'} ${folder}/ - ${desc}`);
  }
  
  console.log('\n📦 FILES TO MOVE:');
  console.log('─'.repeat(50));
  
  const byCategory = {};
  for (const move of moves) {
    if (!byCategory[move.category]) byCategory[move.category] = [];
    byCategory[move.category].push(move);
  }
  
  for (const [category, categoryMoves] of Object.entries(byCategory)) {
    console.log(`\n   ${category.toUpperCase()} (${categoryMoves.length} files):`);
    for (const move of categoryMoves) {
      console.log(`   ${move.from} → ${move.to}`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log(`📊 TOTAL: ${moves.length} files will be moved`);
  console.log('═'.repeat(70));
  
  console.log('\n⚠️  This will NOT delete any files.');
  console.log('   Old versions go to scripts/deprecated/');
  console.log('   A manifest will be created for undo.\n');
  
  console.log('💡 To execute: node cleanup-codebase.js --execute\n');
  
  return moves;
}

// ============================================================================
// EXECUTE MODE
// ============================================================================

function runExecute() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 EXECUTING CLEANUP');
  console.log('═'.repeat(70) + '\n');
  
  const allFiles = getAllFiles(ROOT_DIR);
  const rootJsFiles = allFiles.filter(f => !f.path.includes('/') && (f.name.endsWith('.js') || f.name.endsWith('.mjs')));
  
  const manifest = {
    timestamp: new Date().toISOString(),
    moves: [],
    foldersCreated: [],
  };
  
  // Create folders
  console.log('📁 Creating folders...');
  for (const folder of Object.keys(FOLDER_STRUCTURE)) {
    const fullPath = path.join(ROOT_DIR, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      manifest.foldersCreated.push(folder);
      console.log(`   ✓ Created ${folder}/`);
    } else {
      console.log(`   - ${folder}/ (already exists)`);
    }
  }
  
  // Move files
  console.log('\n📦 Moving files...');
  let moved = 0;
  let skipped = 0;
  
  for (const file of rootJsFiles) {
    const target = getTargetFolder(file.name);
    if (!target) {
      skipped++;
      continue;
    }
    
    const fromPath = file.fullPath;
    const toPath = path.join(ROOT_DIR, target, file.name);
    
    // Check if destination already exists
    if (fs.existsSync(toPath)) {
      console.log(`   ⚠ Skipped ${file.name} (already exists in ${target}/)`);
      skipped++;
      continue;
    }
    
    try {
      // Copy first (safer than move)
      fs.copyFileSync(fromPath, toPath);
      
      // Then delete original
      fs.unlinkSync(fromPath);
      
      manifest.moves.push({
        from: file.path,
        to: `${target}/${file.name}`,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`   ✓ ${file.name} → ${target}/`);
      moved++;
    } catch (err) {
      console.log(`   ❌ Failed to move ${file.name}: ${err.message}`);
    }
  }
  
  // Save manifest
  fs.writeFileSync(
    path.join(ROOT_DIR, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 CLEANUP COMPLETE');
  console.log('═'.repeat(70));
  console.log(`
   Files moved:    ${moved}
   Files skipped:  ${skipped}
   Folders created: ${manifest.foldersCreated.length}
   
   Manifest saved: ${MANIFEST_FILE}
  `);
  
  console.log('💡 To undo: node cleanup-codebase.js --undo\n');
  
  return manifest;
}

// ============================================================================
// UNDO MODE
// ============================================================================

function runUndo() {
  console.log('\n' + '═'.repeat(70));
  console.log('⏪ UNDOING CLEANUP');
  console.log('═'.repeat(70) + '\n');
  
  const manifestPath = path.join(ROOT_DIR, MANIFEST_FILE);
  
  if (!fs.existsSync(manifestPath)) {
    console.log('❌ No manifest file found. Cannot undo.\n');
    return;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  console.log(`📋 Manifest from: ${manifest.timestamp}`);
  console.log(`   Moves to undo: ${manifest.moves.length}\n`);
  
  let undone = 0;
  let failed = 0;
  
  // Reverse the moves
  for (const move of manifest.moves.reverse()) {
    const fromPath = path.join(ROOT_DIR, move.to);
    const toPath = path.join(ROOT_DIR, move.from);
    
    if (!fs.existsSync(fromPath)) {
      console.log(`   ⚠ File not found: ${move.to}`);
      failed++;
      continue;
    }
    
    try {
      fs.copyFileSync(fromPath, toPath);
      fs.unlinkSync(fromPath);
      console.log(`   ✓ ${move.to} → ${move.from}`);
      undone++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }
  
  // Note: We don't delete created folders (they might have other files now)
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 UNDO COMPLETE');
  console.log('═'.repeat(70));
  console.log(`
   Files restored: ${undone}
   Failed:         ${failed}
   
   Note: Created folders were not removed.
  `);
  
  // Rename manifest so it's not used again
  fs.renameSync(manifestPath, manifestPath + '.undone');
  console.log(`   Manifest archived: ${MANIFEST_FILE}.undone\n`);
}

// ============================================================================
// MAIN
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--audit')) {
  runAudit();
} else if (args.includes('--plan')) {
  runPlan();
} else if (args.includes('--execute')) {
  runExecute();
} else if (args.includes('--undo')) {
  runUndo();
} else {
  console.log(`
HOT MATCH CODEBASE CLEANUP
==========================

Usage:
  node cleanup-codebase.js --audit     See what files we have
  node cleanup-codebase.js --plan      See what will be moved
  node cleanup-codebase.js --execute   Actually move files
  node cleanup-codebase.js --undo      Reverse all moves

Safety:
  • Files are MOVED, never deleted
  • Old versions go to scripts/deprecated/
  • A manifest tracks all changes
  • --undo reverses everything

Start with --audit to see current state.
  `);
}


