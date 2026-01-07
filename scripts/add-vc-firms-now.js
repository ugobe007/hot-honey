#!/usr/bin/env node
/**
 * ADD VC FIRMS - DIRECT EXECUTION
 * ===============================
 * This script will help you add the 337 VC firms.
 * 
 * If you have the list in any format, we'll process it and add to database.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n' + '='.repeat(80));
console.log('🚀 ADD VC FIRMS TO DATABASE');
console.log('='.repeat(80));
console.log('\nI need the list of 337 VC firms with their URLs.\n');
console.log('Options:');
console.log('1. If you have a CSV/JSON file, provide the path');
console.log('2. If you have it in text format, I can parse it');
console.log('3. If you can paste it here, I\'ll create the file and run it\n');

// Check for common file locations
const possibleFiles = [
  'data/vc-firms-list.csv',
  'data/vc-firms-list.json',
  'vc-firms-list.csv',
  'vc-firms-list.json',
  'investors-batch-001.csv', // The file you have open
];

console.log('📁 Checking for existing files...\n');
for (const file of possibleFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✓ Found: ${file}`);
    const stats = fs.statSync(file);
    console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
  }
}

console.log('\n💡 To proceed:');
console.log('   - Provide the file path with the 337 firms');
console.log('   - Or paste the data and I\'ll create the file');
console.log('   - Then run: node scripts/add-vc-firms-from-list.js --file <your-file>\n');


