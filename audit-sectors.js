require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function audit() {
  // Get all unique startup sectors
  const { data: startups } = await s.from('startup_uploads')
    .select('sectors')
    .eq('status', 'approved');
  
  const startupSectors = {};
  startups.forEach(st => {
    (st.sectors || []).forEach(sec => {
      const key = sec.toLowerCase().trim();
      startupSectors[key] = (startupSectors[key] || 0) + 1;
    });
  });
  
  // Get all unique investor sectors
  const { data: investors } = await s.from('investors')
    .select('sectors')
    .not('sectors', 'eq', '{}');
  
  const investorSectors = {};
  investors.forEach(inv => {
    (inv.sectors || []).forEach(sec => {
      const key = sec.toLowerCase().trim();
      investorSectors[key] = (investorSectors[key] || 0) + 1;
    });
  });
  
  console.log('STARTUP SECTORS (top 30):');
  Object.entries(startupSectors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([sec, count]) => {
      // Check if this matches any investor sector
      const hasMatch = Object.keys(investorSectors).some(is => 
        is === sec || is.includes(sec) || sec.includes(is)
      );
      console.log('  ' + count.toString().padStart(4), sec.padEnd(25), hasMatch ? '✓' : '✗ NO MATCH');
    });
  
  console.log('\n\nINVESTOR SECTORS (top 30):');
  Object.entries(investorSectors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([sec, count]) => {
      const hasMatch = Object.keys(startupSectors).some(ss => 
        ss === sec || ss.includes(sec) || sec.includes(ss)
      );
      console.log('  ' + count.toString().padStart(4), sec.padEnd(25), hasMatch ? '✓' : '✗ NO MATCH');
    });
  
  // Find sectors that exist in startups but not investors (and vice versa)
  console.log('\n\nSTARTUP SECTORS WITH NO INVESTOR MATCH:');
  Object.entries(startupSectors)
    .filter(([sec]) => {
      return !Object.keys(investorSectors).some(is => 
        is === sec || is.includes(sec) || sec.includes(is)
      );
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([sec, count]) => {
      console.log('  ' + count.toString().padStart(4), sec);
    });
}

audit();
