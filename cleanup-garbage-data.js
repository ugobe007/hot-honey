require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanup() {
  // Get all startups with garbage taglines
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline, sectors, extracted_data')
    .eq('status', 'approved')
    .ilike('tagline', '%Discovered from%');
  
  console.log('Fixing', startups?.length || 0, 'startups with garbage taglines...');
  
  let fixed = 0;
  for (const s of startups || []) {
    // Generate a better tagline from name + sectors
    const sectors = s.sectors || s.extracted_data?.sectors || ['technology'];
    const sectorText = Array.isArray(sectors) ? sectors.slice(0, 2).join(' & ') : sectors;
    const newTagline = `Innovating in ${sectorText}`;
    
    // Clear the garbage fivePoints too
    const cleanFivePoints = [
      (s.extracted_data?.value_proposition || '').includes('Discovered') ? `${s.name} - ${sectorText} startup` : (s.extracted_data?.value_proposition || ''),
      (s.extracted_data?.fivePoints?.[1] || '').includes('Discovered') ? `Building solutions for ${sectorText}` : (s.extracted_data?.fivePoints?.[1] || ''),
      (s.extracted_data?.fivePoints?.[2] || '').includes('Discovered') ? `${sectorText} innovation` : (s.extracted_data?.fivePoints?.[2] || ''),
      s.extracted_data?.fivePoints?.[3] || 'Early stage startup',
      s.extracted_data?.fivePoints?.[4] || 'Seeking investment'
    ];
    
    const newDesc = (s.description || '').includes('Discovered') ? `${s.name} - a ${sectorText} company` : s.description;
    
    const { error } = await supabase
      .from('startup_uploads')
      .update({
        tagline: newTagline,
        description: newDesc,
        extracted_data: {
          ...s.extracted_data,
          fivePoints: cleanFivePoints,
          value_proposition: cleanFivePoints[0],
          solution: cleanFivePoints[2]
        }
      })
      .eq('id', s.id);
    
    if (!error) {
      fixed++;
      if (fixed % 50 === 0) console.log('  Fixed', fixed, '...');
    }
  }
  
  console.log('\n✅ Fixed', fixed, 'startups');
}

cleanup().catch(console.error);
