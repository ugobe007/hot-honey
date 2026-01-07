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

async function importMercuryInvestors() {
  const filePath = process.argv[2] || 'mercury-investors-batch1.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let added = 0, updated = 0, errors = 0;
  
  for (const vc of data) {
    // Parse check size into min/max
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
    
    // Escape strings for SQL
    const esc = (s) => s ? s.replace(/'/g, "''") : '';
    
    // Check if exists
    const checkQuery = `SELECT id FROM investors WHERE LOWER(firm_name) = LOWER('${esc(vc.name)}')`;
    const existing = await execSql(checkQuery);
    
    if (existing && existing.length > 0) {
      const updateQuery = `
        UPDATE investors SET
          sectors = '${esc(vc.sectors)}',
          investment_stage = '${esc(vc.stages)}',
          min_check_size = ${minCheck || 'NULL'},
          max_check_size = ${maxCheck || 'NULL'},
          data_source = 'mercury',
          last_enriched = NOW()
        WHERE id = '${existing[0].id}'
        RETURNING id
      `;
      try {
        await execSql(updateQuery);
        updated++;
      } catch (e) {
        console.error(`Error updating ${vc.name}:`, e.message);
        errors++;
      }
    } else {
      const insertQuery = `
        INSERT INTO investors (firm_name, sectors, investment_stage, min_check_size, max_check_size, data_source, last_enriched)
        VALUES ('${esc(vc.name)}', '${esc(vc.sectors)}', '${esc(vc.stages)}', ${minCheck || 'NULL'}, ${maxCheck || 'NULL'}, 'mercury', NOW())
        RETURNING id
      `;
      try {
        await execSql(insertQuery);
        added++;
      } catch (e) {
        console.error(`Error adding ${vc.name}:`, e.message);
        errors++;
      }
    }
  }
  
  console.log(`\n✅ Import complete!`);
  console.log(`   New VCs added: ${added}`);
  console.log(`   VCs updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
}

importMercuryInvestors().catch(console.error);
