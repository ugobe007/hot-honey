#!/usr/bin/env node
/**
 * Import VCs from Airtable data (extracted from screenshots)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseCheckSize(checkSize) {
  if (!checkSize) return { min: null, max: null };
  
  // Extract numbers from check size string
  const matches = checkSize.match(/\$?([\d.]+)([KMB])?/gi);
  if (!matches || matches.length === 0) return { min: null, max: null };
  
  function parseAmount(str) {
    const match = str.match(/\$?([\d.]+)([KMB])?/i);
    if (!match) return null;
    let amount = parseFloat(match[1]);
    const suffix = (match[2] || '').toUpperCase();
    if (suffix === 'K') amount *= 1000;
    if (suffix === 'M') amount *= 1000000;
    if (suffix === 'B') amount *= 1000000000;
    return amount;
  }
  
  const amounts = matches.map(parseAmount).filter(a => a !== null).sort((a, b) => a - b);
  
  return {
    min: amounts[0] || null,
    max: amounts[amounts.length - 1] || amounts[0] || null
  };
}

function normalizeStage(stages) {
  if (!stages || stages.length === 0) return null;
  // Return array as JSON for storage
  return stages;
}

async function main() {
  console.log('\n🔥 Importing VCs from Airtable Data\n');
  console.log('═'.repeat(60));
  
  // Read VC data
  const vcData = JSON.parse(fs.readFileSync('./airtable-vc-data-batch2.json', 'utf-8'));
  console.log('📋 Found ' + vcData.length + ' VCs to import\n');
  
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const vc of vcData) {
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('investors')
        .select('id, name')
        .ilike('name', vc.name)
        .limit(1);
      
      const checkSize = parseCheckSize(vc.check_size);
      const stages = normalizeStage(vc.stage);
      
      const investorData = {
        name: vc.name,
        firm: vc.name,
        sectors: vc.sectors ? vc.sectors.split(',').map(s => s.trim()) : null,
        stage: stages,
        check_size_min: checkSize.min,
        check_size_max: checkSize.max,
        investment_thesis: vc.sectors || null,
        status: 'active',
        updated_at: new Date().toISOString()
      };
      
      if (existing && existing.length > 0) {
        // Update existing
        const { error } = await supabase
          .from('investors')
          .update(investorData)
          .eq('id', existing[0].id);
        
        if (error) {
          console.log('⚠️  ' + vc.name + ' - update error: ' + error.message);
          errors++;
        } else {
          console.log('🔄 ' + vc.name + ' - updated');
          updated++;
        }
      } else {
        // Insert new
        investorData.created_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('investors')
          .insert(investorData);
        
        if (error) {
          console.log('⚠️  ' + vc.name + ' - insert error: ' + error.message);
          errors++;
        } else {
          console.log('✅ ' + vc.name + ' - added');
          added++;
        }
      }
    } catch (err) {
      console.log('❌ ' + vc.name + ' - ' + err.message);
      errors++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('═'.repeat(60));
  console.log('✅ New VCs added: ' + added);
  console.log('🔄 VCs updated: ' + updated);
  console.log('⏭️  Skipped: ' + skipped);
  console.log('❌ Errors: ' + errors);
  console.log('📋 Total processed: ' + vcData.length);
  console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
