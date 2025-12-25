require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixSectors() {
  console.log('Fixing generic Technology sectors...\n');
  
  // Get startups with only "Technology" or "technology" as sector
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, sectors, tagline, description')
    .eq('status', 'approved');
  
  let fixed = 0;
  
  for (const s of startups) {
    const sectors = s.sectors || [];
    
    // Check if sectors are too generic
    const isGeneric = sectors.length === 0 || 
      sectors.every(sec => ['technology', 'tech', 'internet', 'digital'].includes(sec.toLowerCase()));
    
    if (!isGeneric) continue;
    
    // Infer better sectors from name/tagline
    const text = ((s.name || '') + ' ' + (s.tagline || '') + ' ' + (s.description || '')).toLowerCase();
    const newSectors = [];
    
    if (text.includes('ai') || text.includes('ml') || text.includes('machine') || text.includes('gpt') || text.includes('llm')) {
      newSectors.push('AI/ML');
    }
    if (text.includes('saas') || text.includes('software') || text.includes('platform') || text.includes('cloud')) {
      newSectors.push('SaaS');
    }
    if (text.includes('fintech') || text.includes('payment') || text.includes('bank') || text.includes('finance')) {
      newSectors.push('FinTech');
    }
    if (text.includes('health') || text.includes('medical') || text.includes('bio')) {
      newSectors.push('HealthTech');
    }
    if (text.includes('enterprise') || text.includes('b2b')) {
      newSectors.push('Enterprise');
    }
    if (text.includes('consumer') || text.includes('b2c') || text.includes('app')) {
      newSectors.push('Consumer');
    }
    if (text.includes('data') || text.includes('analytics')) {
      newSectors.push('AI/ML', 'SaaS');
    }
    
    // Default to SaaS + AI/ML if still empty
    if (newSectors.length === 0) {
      newSectors.push('SaaS', 'AI/ML');
    }
    
    // Update
    const uniqueSectors = [...new Set(newSectors)];
    await supabase.from('startup_uploads')
      .update({ sectors: uniqueSectors })
      .eq('id', s.id);
    
    fixed++;
    console.log('Fixed:', s.name, '| Old:', sectors.join(', ') || 'none', '| New:', uniqueSectors.join(', '));
  }
  
  console.log('\nTotal fixed:', fixed);
}

fixSectors().catch(console.error);
