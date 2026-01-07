#!/usr/bin/env node

/**
 * Apply Enrichment Results to Database
 * 
 * Usage:
 *   node scripts/apply-enrichment.js <batch-number>
 *   node scripts/apply-enrichment.js --file <path-to-results.json>
 *   node scripts/apply-enrichment.js --interactive
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// APPLY ENRICHMENT
// ============================================================================

async function applyEnrichment(results) {
  console.log(`\n📥 Applying enrichment to ${results.length} investors...\n`);

  let updated = 0;
  let errors = 0;

  for (const result of results) {
    if (!result.id) {
      console.log(`⚠️  Skipping result without ID`);
      continue;
    }

    // Build update object (only include non-null fields)
    const update = {};
    
    if (result.bio) update.bio = result.bio;
    if (result.investment_thesis) update.investment_thesis = result.investment_thesis;
    if (result.sectors && Array.isArray(result.sectors) && result.sectors.length > 0) {
      update.sectors = result.sectors;
    }
    if (result.stage && Array.isArray(result.stage) && result.stage.length > 0) {
      update.stage = result.stage;
    }
    if (result.check_size_min && typeof result.check_size_min === 'number') {
      update.check_size_min = result.check_size_min;
    }
    if (result.check_size_max && typeof result.check_size_max === 'number') {
      update.check_size_max = result.check_size_max;
    }
    if (result.geography_focus && Array.isArray(result.geography_focus)) {
      update.geography_focus = result.geography_focus;
    }
    if (result.notable_investments && Array.isArray(result.notable_investments)) {
      update.notable_investments = result.notable_investments;
    }
    if (result.linkedin_url) update.linkedin_url = result.linkedin_url;
    if (result.blog_url) update.blog_url = result.blog_url;
    if (result.url) update.url = result.url;
    if (result.firm) update.firm = result.firm;
    if (result.firm_description_normalized) update.firm_description_normalized = result.firm_description_normalized;

    if (Object.keys(update).length === 0) {
      console.log(`⏭️  ${result.name || result.id}: No fields to update`);
      continue;
    }

    // Apply update
    const { error } = await supabase
      .from('investors')
      .update(update)
      .eq('id', result.id);

    if (error) {
      console.log(`❌ ${result.name || result.id}: ${error.message}`);
      errors++;
    } else {
      const fields = Object.keys(update).join(', ');
      console.log(`✅ ${result.name || result.id}: Updated (${fields})`);
      updated++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⏭️  Skipped: ${results.length - updated - errors}`);
  console.log('');
}

async function loadAndApplyBatch(batchNum) {
  const batchFile = path.join(
    process.cwd(), 
    'data', 
    'enrichment-results', 
    `batch-${String(batchNum).padStart(3, '0')}-results.json`
  );

  if (!fs.existsSync(batchFile)) {
    console.error(`❌ Results file not found: ${batchFile}`);
    console.log(`\nExpected file location: ${batchFile}`);
    console.log('Make sure to save AI enrichment results with this naming convention.');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(batchFile, 'utf-8'));
  await applyEnrichment(Array.isArray(results) ? results : [results]);
}

async function loadAndApplyFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  await applyEnrichment(Array.isArray(results) ? results : [results]);
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📝 INTERACTIVE ENRICHMENT MODE\n');
  console.log('Paste JSON enrichment data (array or single object).');
  console.log('When done, type "DONE" on a new line and press Enter.\n');

  let jsonInput = '';
  
  const prompt = () => {
    rl.question('> ', (line) => {
      if (line.trim().toUpperCase() === 'DONE') {
        rl.close();
        try {
          const parsed = JSON.parse(jsonInput);
          applyEnrichment(Array.isArray(parsed) ? parsed : [parsed]);
        } catch (e) {
          console.error('❌ Invalid JSON:', e.message);
          process.exit(1);
        }
      } else {
        jsonInput += line + '\n';
        prompt();
      }
    });
  };

  prompt();
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveMode().catch(console.error);
} else if (args.includes('--file') || args.includes('-f')) {
  const fileIdx = args.indexOf('--file') !== -1 ? args.indexOf('--file') : args.indexOf('-f');
  const filePath = args[fileIdx + 1];
  if (!filePath) {
    console.error('❌ Please provide a file path');
    process.exit(1);
  }
  loadAndApplyFile(filePath).catch(console.error);
} else if (args[0] && !isNaN(parseInt(args[0]))) {
  loadAndApplyBatch(parseInt(args[0])).catch(console.error);
} else {
  console.log(`
Apply Enrichment Results

Usage:
  node scripts/apply-enrichment.js <batch-number>
    Load results from data/enrichment-results/batch-XXX-results.json

  node scripts/apply-enrichment.js --file <path>
    Load results from a specific JSON file

  node scripts/apply-enrichment.js --interactive
    Paste JSON data directly into the terminal

Example JSON format:
[
  {
    "id": "uuid-here",
    "name": "John Smith",
    "bio": "Partner at Example Ventures...",
    "sectors": ["AI/ML", "SaaS"],
    "stage": ["Seed", "Series A"],
    "check_size_min": 100000,
    "check_size_max": 500000,
    "url": "https://example.com",
    "firm_description_normalized": "Example Ventures is a seed-stage VC..."
  }
]
`);
}


