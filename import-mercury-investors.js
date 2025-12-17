import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://unkpogyhhjbvxxjvmxlt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVua3BvZ3loaGpidnh4anZteGx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE1OTAzNSwiZXhwIjoyMDc2NzM1MDM1fQ.aWJDwcXFQsMPqSPLSgGvYM9cWev_bDU1Dx4ldLdHXGU'
);

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
    
    // Check if exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id, firm_name')
      .ilike('firm_name', vc.name)
      .maybeSingle();
    
    const record = {
      firm_name: vc.name,
      contact_name: vc.contact,
      sectors: vc.sectors,
      investment_stage: vc.stages,
      min_check_size: minCheck,
      max_check_size: maxCheck,
      data_source: 'mercury',
      last_enriched: new Date().toISOString()
    };
    
    if (existing) {
      const { error } = await supabase
        .from('investors')
        .update(record)
        .eq('id', existing.id);
      if (error) { console.error(`Error updating ${vc.name}:`, error.message); errors++; }
      else { updated++; }
    } else {
      const { error } = await supabase
        .from('investors')
        .insert(record);
      if (error) { console.error(`Error adding ${vc.name}:`, error.message); errors++; }
      else { added++; }
    }
  }
  
  console.log(`\\n✅ Import complete!`);
  console.log(`   New VCs added: ${added}`);
  console.log(`   VCs updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
}

importMercuryInvestors().catch(console.error);
