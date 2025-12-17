#!/usr/bin/env node
/**
 * BULK CSV IMPORT
 * Import startups or investors from CSV files
 * 
 * Usage:
 *   node bulk-import-csv.js investors investors.csv
 *   node bulk-import-csv.js startups startups.csv
 * 
 * CSV Formats:
 * 
 * Investors CSV columns:
 *   name, firm, title, stage, sectors, check_size_min, check_size_max, email, linkedin_url
 * 
 * Startups CSV columns:
 *   name, description, pitch, stage, sectors, website, location, raise_amount
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row');
  }
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || null;
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  return values.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Import investors
 */
async function importInvestors(rows) {
  let added = 0, updated = 0, errors = 0;
  
  for (const row of rows) {
    const name = row.name || row.firm || row['vc firm'];
    if (!name) continue;
    
    try {
      // Check exists
      const { data: existing } = await supabase
        .from('investors')
        .select('id')
        .ilike('name', name)
        .limit(1);
      
      const investor = {
        name: name,
        firm: row.firm || name,
        title: row.title || 'Investment Team',
        stage: row.stage || null,
        sectors: row.sectors ? row.sectors.split(/[,;]/).map(s => s.trim()) : null,
        check_size_min: row.check_size_min ? parseFloat(row.check_size_min) : null,
        check_size_max: row.check_size_max ? parseFloat(row.check_size_max) : null,
        email: row.email || null,
        linkedin_url: row.linkedin_url || row.linkedin || null,
        investment_thesis: row.investment_thesis || row.thesis || row['areas of interest'] || null,
        bio: row.bio || row.description || null,
        status: 'active',
        is_verified: false
      };
      
      if (existing && existing.length > 0) {
        await supabase
          .from('investors')
          .update(investor)
          .eq('id', existing[0].id);
        updated++;
      } else {
        const { error } = await supabase.from('investors').insert(investor);
        if (error) throw error;
        added++;
      }
    } catch (e) {
      errors++;
    }
  }
  
  return { added, updated, errors };
}

/**
 * Import startups
 */
async function importStartups(rows) {
  let added = 0, updated = 0, errors = 0;
  
  for (const row of rows) {
    const name = row.name || row.company || row['startup name'];
    if (!name) continue;
    
    try {
      // Check exists
      const { data: existing } = await supabase
        .from('startup_uploads')
        .select('id')
        .ilike('name', name)
        .limit(1);
      
      const startup = {
        name: name,
        description: row.description || null,
        pitch: row.pitch || row.tagline || null,
        stage: row.stage || null,
        sectors: row.sectors ? row.sectors.split(/[,;]/).map(s => s.trim()) : null,
        website: row.website || row.url || null,
        location: row.location || row.city || null,
        raise_amount: row.raise_amount ? parseFloat(row.raise_amount) : null,
        raise_type: row.raise_type || null,
        source_type: 'csv_import',
        status: 'pending'
      };
      
      if (existing && existing.length > 0) {
        await supabase
          .from('startup_uploads')
          .update(startup)
          .eq('id', existing[0].id);
        updated++;
      } else {
        const { error } = await supabase.from('startup_uploads').insert(startup);
        if (error) throw error;
        added++;
      }
    } catch (e) {
      errors++;
    }
  }
  
  return { added, updated, errors };
}

async function main() {
  const type = process.argv[2];
  const csvFile = process.argv[3];
  
  if (!type || !csvFile) {
    console.log(`
📥 BULK CSV IMPORT

Usage:
  node bulk-import-csv.js <type> <csv_file>

Types:
  investors - Import VC/Angel investors
  startups  - Import startup companies

Examples:
  node bulk-import-csv.js investors my-vcs.csv
  node bulk-import-csv.js startups my-startups.csv

Expected CSV Columns:

Investors:
  name, firm, title, stage, sectors, check_size_min, check_size_max, email, linkedin_url

Startups:
  name, description, pitch, stage, sectors, website, location, raise_amount
`);
    return;
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error('❌ File not found:', csvFile);
    process.exit(1);
  }
  
  console.log('\n📥 BULK CSV IMPORT\n');
  console.log('═'.repeat(60));
  console.log('Type:', type);
  console.log('File:', csvFile);
  console.log('═'.repeat(60) + '\n');
  
  try {
    const rows = parseCSV(csvFile);
    console.log(`📋 Parsed ${rows.length} rows from CSV\n`);
    
    let result;
    if (type === 'investors') {
      result = await importInvestors(rows);
    } else if (type === 'startups') {
      result = await importStartups(rows);
    } else {
      console.error('❌ Unknown type:', type);
      return;
    }
    
    console.log('═'.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Added: ${result.added}`);
    console.log(`⏫ Updated: ${result.updated}`);
    console.log(`❌ Errors: ${result.errors}`);
    console.log('═'.repeat(60));
    
  } catch (e) {
    console.error('❌ Import failed:', e.message);
  }
}

main();
