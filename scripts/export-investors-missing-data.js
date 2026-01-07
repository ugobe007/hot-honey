#!/usr/bin/env node
/**
 * EXPORT INVESTORS MISSING DATA
 * =============================
 * Exports a CSV file of investors missing URL, Value Proposition, or Notable Investments
 * 
 * Usage: node scripts/export-investors-missing-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function exportMissingData() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXPORTING INVESTORS MISSING DATA');
  console.log('='.repeat(80) + '\n');
  
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, url, firm_description_normalized, notable_investments, linkedin_url, bio, sectors, stage')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching investors:', error);
    process.exit(1);
  }
  
  console.log(`📊 Found ${investors.length} total investors\n`);
  
  // Filter to those missing data
  const missingData = investors.filter(inv => {
    const missingUrl = !inv.url || inv.url === '';
    const missingValueProp = !inv.firm_description_normalized || inv.firm_description_normalized.length < 50;
    const missingNotable = !inv.notable_investments || 
      (typeof inv.notable_investments === 'object' && 
       (Array.isArray(inv.notable_investments) ? inv.notable_investments.length === 0 : 
        Object.keys(inv.notable_investments).length === 0));
    
    return missingUrl || missingValueProp || missingNotable;
  });
  
  console.log(`📋 Found ${missingData.length} investors missing data\n`);
  
  // Create CSV
  const csvRows = [
    ['Name', 'Firm', 'ID', 'Missing URL', 'Missing Value Prop', 'Missing Notable', 'LinkedIn', 'Bio', 'Sectors', 'Stage'].join(',')
  ];
  
  for (const inv of missingData) {
    const missingUrl = !inv.url || inv.url === '';
    const missingValueProp = !inv.firm_description_normalized || inv.firm_description_normalized.length < 50;
    const missingNotable = !inv.notable_investments || 
      (typeof inv.notable_investments === 'object' && 
       (Array.isArray(inv.notable_investments) ? inv.notable_investments.length === 0 : 
        Object.keys(inv.notable_investments).length === 0));
    
    const sectors = Array.isArray(inv.sectors) ? inv.sectors.join('; ') : (inv.sectors || '');
    const stage = Array.isArray(inv.stage) ? inv.stage.join('; ') : (inv.stage || '');
    
    const row = [
      `"${(inv.name || '').replace(/"/g, '""')}"`,
      `"${(inv.firm || '').replace(/"/g, '""')}"`,
      inv.id,
      missingUrl ? 'YES' : 'NO',
      missingValueProp ? 'YES' : 'NO',
      missingNotable ? 'YES' : 'NO',
      `"${(inv.linkedin_url || '').replace(/"/g, '""')}"`,
      `"${((inv.bio || '').substring(0, 200)).replace(/"/g, '""')}"`,
      `"${sectors.replace(/"/g, '""')}"`,
      `"${stage.replace(/"/g, '""')}"`,
    ];
    csvRows.push(row.join(','));
  }
  
  const csvPath = path.join(process.cwd(), 'investors-missing-data.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n'));
  
  console.log('✅ Exported to: investors-missing-data.csv');
  console.log(`\n📊 Summary:`);
  console.log(`   Total investors: ${investors.length}`);
  console.log(`   Missing data: ${missingData.length}`);
  console.log(`   Missing URL: ${missingData.filter(i => !i.url || i.url === '').length}`);
  console.log(`   Missing Value Prop: ${missingData.filter(i => !i.firm_description_normalized || i.firm_description_normalized.length < 50).length}`);
  console.log(`   Missing Notable: ${missingData.filter(i => !i.notable_investments || 
    (typeof i.notable_investments === 'object' && 
     (Array.isArray(i.notable_investments) ? i.notable_investments.length === 0 : 
      Object.keys(i.notable_investments).length === 0))).length}`);
  console.log('');
}

exportMissingData().catch(console.error);


