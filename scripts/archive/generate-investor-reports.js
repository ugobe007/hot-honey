#!/usr/bin/env node
/**
 * GENERATE INVESTOR REPORTS (100 at a time)
 * ==========================================
 * Creates small CSV reports you can work through
 * 
 * Usage: node scripts/generate-investor-reports.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BATCH_SIZE = 100;

async function generateReports() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 GENERATING INVESTOR REPORTS (100 per batch)');
  console.log('='.repeat(80) + '\n');
  
  // Get all investors missing data
  const { data: allInvestors, error } = await supabase
    .from('investors')
    .select('id, name, firm, url, firm_description_normalized, notable_investments, linkedin_url, bio, sectors, stage')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching investors:', error);
    process.exit(1);
  }
  
  // Filter to those missing data
  const missingData = allInvestors.filter(inv => {
    const missingUrl = !inv.url || inv.url === '';
    const missingValueProp = !inv.firm_description_normalized || inv.firm_description_normalized.length < 50;
    const missingNotable = !inv.notable_investments || 
      (typeof inv.notable_investments === 'object' && 
       (Array.isArray(inv.notable_investments) ? inv.notable_investments.length === 0 : 
        Object.keys(inv.notable_investments).length === 0));
    
    return missingUrl || missingValueProp || missingNotable;
  });
  
  console.log(`📋 Found ${missingData.length} investors missing data\n`);
  
  // Split into batches of 100
  const batches = [];
  for (let i = 0; i < missingData.length; i += BATCH_SIZE) {
    batches.push(missingData.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📦 Creating ${batches.length} reports (${BATCH_SIZE} investors each)\n`);
  
  // Generate each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;
    const filename = `investors-batch-${batchNum.toString().padStart(3, '0')}.csv`;
    const filepath = path.join(process.cwd(), filename);
    
    // Create CSV
    const csvRows = [
      ['Name', 'Firm', 'ID', 'Missing URL', 'Missing Value Prop', 'Missing Notable', 'LinkedIn', 'Bio', 'Sectors', 'Stage'].join(',')
    ];
    
    for (const inv of batch) {
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
    
    fs.writeFileSync(filepath, csvRows.join('\n'));
    console.log(`✅ Created: ${filename} (${batch.length} investors)`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Total investors missing data: ${missingData.length}`);
  console.log(`   Number of reports: ${batches.length}`);
  console.log(`   Investors per report: ${BATCH_SIZE}`);
  console.log(`\n   💡 Work through each batch file one at a time`);
  console.log(`   💡 Files: investors-batch-001.csv, investors-batch-002.csv, etc.\n`);
}

generateReports().catch(console.error);

