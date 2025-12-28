#!/usr/bin/env node
/**
 * STARTUP INFERENCE ENRICHMENT (Node.js wrapper)
 * ==============================================
 * 
 * Wrapper for the TypeScript enrichment service that can be called from Node.js
 * 
 * Usage:
 *   node scripts/enrich-startups-inference.js [--limit 100] [--missing]
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 100;
const missing = args.includes('--missing');

// Build command
const scriptPath = path.join(__dirname, 'enrich-startups-inference.ts');
const cmd = `npx tsx "${scriptPath}" --limit ${limit}${missing ? ' --missing' : ''}`;

console.log('═'.repeat(70));
console.log('    🤖 STARTUP INFERENCE ENRICHMENT (Node.js Wrapper)');
console.log('═'.repeat(70));
console.log(`\n📊 Configuration:`);
console.log(`   Limit: ${limit}`);
console.log(`   Missing Only: ${missing}`);
console.log(`   Script: ${scriptPath}\n`);

try {
  // Run the TypeScript script
  const result = execSync(cmd, {
    encoding: 'utf-8',
    stdio: 'inherit',
    env: {
      ...process.env,
      SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
    }
  });
  
  process.exit(0);
} catch (error) {
  console.error('❌ Enrichment failed:', error.message);
  process.exit(1);
}



