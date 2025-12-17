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

async function importVCs(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let added = 0, updated = 0, errors = 0;
  
  for (const vc of data) {
    let minCheck = null, maxCheck = null;
    if (vc.check_size) {
      const checkMatch = vc.check_size.match(/\$?([\d.]+)([KMB])?(?:\s*-\s*\$?([\d.]+)([KMB])?)?/i);
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
    
    const esc = (s) => s ? s.replace(/'/g, "''") : '';
    const checkQuery = `SELECT id FROM investors WHERE LOWER(firm_name) = LOWER('${esc(vc.name)}')`;
    const existing = await execSql(checkQuery);
    
    const stages = vc.stages || vc.investment_stage || '';
    const sectors = vc.sectors || '';
    
    if (existing && existing.length > 0) {
      const updateQuery = `
        UPDATE investors SET
          sectors = COALESCE(NULLIF('${esc(sectors)}', ''), sectors),
          investment_stage = COALESCE(NULLIF('${esc(stages)}', ''), investment_stage),
          min_check_size = COALESCE(${minCheck || 'NULL'}, min_check_size),
          max_check_size = COALESCE(${maxCheck || 'NULL'}, max_check_size),
          last_enriched = NOW()
        WHERE id = '${existing[0].id}'
        RETURNING id
      `;
      try { await execSql(updateQuery); updated++; }
      catch (e) { console.error(`Error updating ${vc.name}:`, e.message); errors++; }
    } else {
      const insertQuery = `
        INSERT INTO investors (firm_name, sectors, investment_stage, min_check_size, max_check_size, data_source, last_enriched)
        VALUES ('${esc(vc.name)}', '${esc(sectors)}', '${esc(stages)}', ${minCheck || 'NULL'}, ${maxCheck || 'NULL'}, 'airtable', NOW())
        RETURNING id
      `;
      try { await execSql(insertQuery); added++; }
      catch (e) { console.error(`Error adding ${vc.name}:`, e.message); errors++; }
    }
  }
  
  return { added, updated, errors };
}

async function main() {
  const file = process.argv[2] || 'airtable-vc-data-batch3.json';
  console.log(`Importing from ${file}...`);
  const result = await importVCs(file);
  console.log(`\n✅ Import complete!`);
  console.log(`   New VCs added: ${result.added}`);
  console.log(`   VCs updated: ${result.updated}`);
  console.log(`   Errors: ${result.errors}`);
}

main().catch(console.error);
