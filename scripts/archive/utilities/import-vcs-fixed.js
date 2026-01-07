import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

async function execSql(query) {
  const { data, error } = await supabase.rpc('exec_sql_rows', { sql_query: query });
  if (error) throw error;
  return data;
}

async function importVCs(filePath, source) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let added = 0, updated = 0, errors = 0;
  
  for (const vc of data) {
    // Get firm name - handle both formats
    const firmName = vc.name || vc.firm_name;
    const contact = vc.contact || '';
    
    // Parse check size
    let minCheck = null, maxCheck = null;
    const checkStr = vc.check_size || '';
    if (checkStr) {
      const checkMatch = checkStr.match(/\$?([\d.]+)([KMB])?(?:\s*-\s*\$?([\d.]+)([KMB])?)?/i);
      if (checkMatch) {
        const parseAmount = (num, unit) => {
          if (!num) return null;
          const n = parseFloat(num);
          const mult = { 'K': 1000, 'M': 1000000, 'B': 1000000000 }[unit?.toUpperCase()] || 1;
          return n * mult;
        };
        minCheck = parseAmount(checkMatch[1], checkMatch[2]);
        maxCheck = checkMatch[3] ? parseAmount(checkMatch[3], checkMatch[4]) : minCheck;
      }
    }
    
    // Parse stages - convert to array format
    const stagesStr = vc.stages || vc.investment_stage || '';
    const stages = stagesStr ? stagesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    // Parse sectors - convert to array format
    const sectorsStr = vc.sectors || '';
    const sectors = sectorsStr ? sectorsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    const esc = (s) => s ? s.replace(/'/g, "''") : '';
    
    // Check if exists by firm name
    const checkQuery = `SELECT id FROM investors WHERE LOWER(firm) = LOWER('${esc(firmName)}')`;
    const existing = await execSql(checkQuery);
    
    if (existing && existing.length > 0) {
      const updateQuery = `
        UPDATE investors SET
          stage = CASE WHEN array_length(ARRAY[${stages.map(s => `'${esc(s)}'`).join(',')}]::text[], 1) > 0 
                       THEN ARRAY[${stages.map(s => `'${esc(s)}'`).join(',')}]::text[] 
                       ELSE stage END,
          sectors = CASE WHEN array_length(ARRAY[${sectors.map(s => `'${esc(s)}'`).join(',')}]::text[], 1) > 0 
                        THEN ARRAY[${sectors.map(s => `'${esc(s)}'`).join(',')}]::text[] 
                        ELSE sectors END,
          check_size_min = COALESCE(${minCheck || 'NULL'}, check_size_min),
          check_size_max = COALESCE(${maxCheck || 'NULL'}, check_size_max),
          updated_at = NOW()
        WHERE id = '${existing[0].id}'
        RETURNING id
      `;
      try { await execSql(updateQuery); updated++; }
      catch (e) { console.error(`Error updating ${firmName}:`, e.message); errors++; }
    } else {
      // Insert new
      const insertQuery = `
        INSERT INTO investors (firm, name, stage, sectors, check_size_min, check_size_max, status, created_at, updated_at)
        VALUES (
          '${esc(firmName)}', 
          '${esc(contact || firmName)}', 
          ARRAY[${stages.length ? stages.map(s => `'${esc(s)}'`).join(',') : "'Pre-Seed', 'Seed'"}]::text[], 
          ARRAY[${sectors.length ? sectors.map(s => `'${esc(s)}'`).join(',') : "'Technology'"}]::text[], 
          ${minCheck || 'NULL'}, 
          ${maxCheck || 'NULL'},
          'active',
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      try { await execSql(insertQuery); added++; }
      catch (e) { console.error(`Error adding ${firmName}:`, e.message); errors++; }
    }
  }
  
  return { added, updated, errors };
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    files.push('mercury-investors-batch1.json', 'airtable-vc-data-batch3.json');
  }
  
  for (const file of files) {
    console.log(`\nImporting from ${file}...`);
    const result = await importVCs(file, file.includes('mercury') ? 'mercury' : 'airtable');
    console.log(`   New VCs added: ${result.added}`);
    console.log(`   VCs updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
  }
  
  // Get final count
  const count = await execSql("SELECT COUNT(*) as total FROM investors");
  console.log(`\n✅ Total investors in database: ${count[0]?.total || 'unknown'}`);
}

main().catch(console.error);
