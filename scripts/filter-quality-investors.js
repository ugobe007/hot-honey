#!/usr/bin/env node
/**
 * FILTER QUALITY INVESTORS FROM ENRICHMENT LIST
 * =============================================
 * Removes obvious garbage entries from the investor enrichment list.
 * 
 * Usage: node scripts/filter-quality-investors.js
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate garbage entries
const GARBAGE_PATTERNS = [
  /^ai\s+/i,                    // "ai Alexander..."
  /^and\s+/i,                   // "and advice for..."
  /^article\s+/i,               // "article Guillermo..."
  /^as\s+Managing/i,            // "as Managing..."
  /^boldicorn\s+/i,             // "boldicorn Ed..."
  /^day\s+ago/i,                // "day ago PAI..."
  /^cost\s+of\s+capital/i,       // "cost of capital"
  /^blockchain\s+group$/i,       // "blockchain group"
  /^and\s+capital$/i,           // "and capital"
  /^\s*\([^)]*\)\s*$/i,         // Just parentheses
  /^[a-z]+\s+[A-Z][a-z]+\s+\([^)]+\)$/i, // "word Name (Firm)" - likely article fragments
];

function isGarbage(name) {
  if (!name || name.trim().length < 3) return true;
  return GARBAGE_PATTERNS.some(pattern => pattern.test(name.trim()));
}

function filterCSV() {
  const csvPath = path.join(process.cwd(), 'investor-enrichment-list.csv');
  const filteredPath = path.join(process.cwd(), 'investor-enrichment-list-filtered.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ investor-enrichment-list.csv not found. Run audit first.');
    process.exit(1);
  }
  
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  
  if (lines.length < 2) {
    console.error('❌ CSV file is empty or has no data rows');
    process.exit(1);
  }
  
  const header = lines[0];
  const dataLines = lines.slice(1).filter(l => l.trim());
  
  // Find name column index
  const headers = header.split(',');
  const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name') && !h.toLowerCase().includes('firm'));
  
  if (nameIndex === -1) {
    console.error('❌ Could not find Name column in CSV');
    process.exit(1);
  }
  
  // Filter out garbage entries
  const qualityLines = [header];
  const garbageLines = [];
  
  for (const line of dataLines) {
    // Parse CSV (simple - assumes no commas in quoted fields for now)
    const fields = line.split(',');
    if (fields.length <= nameIndex) continue;
    
    // Extract name (remove quotes)
    const nameField = fields[nameIndex].replace(/^"|"$/g, '');
    const name = nameField.replace(/""/g, '"'); // Unescape double quotes
    
    if (isGarbage(name)) {
      garbageLines.push(line);
    } else {
      qualityLines.push(line);
    }
  }
  
  // Write filtered CSV
  fs.writeFileSync(filteredPath, qualityLines.join('\n'));
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ QUALITY FILTER COMPLETE');
  console.log('='.repeat(80));
  console.log(`\n   Total entries: ${dataLines.length}`);
  console.log(`   Quality entries: ${qualityLines.length - 1}`);
  console.log(`   Garbage entries: ${garbageLines.length}`);
  console.log(`\n   ✅ Saved to: investor-enrichment-list-filtered.csv`);
  console.log(`\n   💡 Use the filtered CSV for manual enrichment.\n`);
  
  if (garbageLines.length > 0) {
    console.log('   ⚠️  Sample garbage entries (first 5):');
    garbageLines.slice(0, 5).forEach((line, idx) => {
      const fields = line.split(',');
      const name = fields[nameIndex]?.replace(/^"|"$/g, '') || 'unknown';
      console.log(`      ${idx + 1}. ${name}`);
    });
    console.log('');
  }
}

filterCSV();


