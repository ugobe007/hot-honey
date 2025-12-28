#!/usr/bin/env node
/**
 * RUN ALL ENRICHMENT PIPELINES
 * 
 * Runs all three enrichment scripts in sequence:
 * 1. Website enrichment
 * 2. Location enrichment
 * 3. Tagline & pitch enrichment
 * 
 * Run: node run-all-enrichment.js
 */

const { execSync } = require('child_process');
const path = require('path');

async function runAllEnrichment() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        🔄 RUNNING ALL ENRICHMENT PIPELINES                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  const scripts = [
    { name: 'Website Enrichment', file: 'enrich-websites.js' },
    { name: 'Location Enrichment', file: 'enrich-locations.js' },
    { name: 'Tagline & Pitch Enrichment', file: 'enrich-taglines-pitches.js' }
  ];

  for (const script of scripts) {
    console.log('\n' + '═'.repeat(63));
    console.log(`🔄 Running: ${script.name}`);
    console.log('═'.repeat(63) + '\n');

    try {
      execSync(`node ${script.file}`, {
        cwd: __dirname,
        stdio: 'inherit'
      });
      console.log(`\n✅ ${script.name} complete\n`);
    } catch (error) {
      console.error(`\n❌ ${script.name} failed: ${error.message}\n`);
    }
  }

  console.log('\n' + '═'.repeat(63));
  console.log('✅ ALL ENRICHMENT PIPELINES COMPLETE');
  console.log('═'.repeat(63) + '\n');
}

runAllEnrichment().catch(console.error);





