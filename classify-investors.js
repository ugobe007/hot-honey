require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function classifyAll() {
  let offset = 0;
  let total = 0;
  
  while (true) {
    const { data: investors } = await supabase
      .from('investors')
      .select('id, name, firm, type')
      .range(offset, offset + 999);
    
    if (!investors || investors.length === 0) break;
    
    for (const inv of investors) {
      const name = (inv.name || '').toLowerCase();
      const firm = (inv.firm || '').toLowerCase();
      let type = 'VC';
      
      if (firm.includes('combinator') || firm.includes('techstars') || 
          firm.includes('accelerator') || firm.includes('500 startups') ||
          name.includes('combinator') || name.includes('accelerator')) {
        type = 'Accelerator';
      } else if (firm.includes('google ventures') || firm.includes(' gv ') ||
          firm.includes('intel capital') || firm.includes('salesforce') ||
          firm.includes('microsoft') || name.includes('corporate')) {
        type = 'Corporate VC';
      } else if (firm.includes('capital') || firm.includes('ventures') || 
          firm.includes('partners') || firm.includes('fund') ||
          name.includes('capital') || name.includes('ventures')) {
        type = 'VC Firm';
      } else if (firm && firm === name.toLowerCase()) {
        type = 'Angel';
      }
      
      if (inv.type !== type) {
        await supabase.from('investors').update({ type }).eq('id', inv.id);
        total++;
      }
    }
    
    offset += 1000;
    process.stdout.write('\rProcessed: ' + offset);
  }
  
  console.log('\nUpdated:', total);
  
  // Verify
  const { data: counts } = await supabase.from('investors').select('type');
  const dist = {};
  counts.forEach(c => dist[c.type] = (dist[c.type] || 0) + 1);
  console.log('Final distribution:', dist);
}

classifyAll();
