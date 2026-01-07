require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Key SpaceTech and Defense investors to add/update
const SPACETECH_DEFENSE_INVESTORS = [
  // SpaceTech Focused
  { name: 'Lux Capital', firm: 'Lux Capital', sectors: ['SpaceTech', 'DeepTech', 'Robotics', 'AI/ML', 'Materials'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Founders Fund', firm: 'Founders Fund', sectors: ['SpaceTech', 'Defense', 'DeepTech', 'AI/ML', 'Robotics'], stage: ['Seed', 'Series A', 'Series B', 'Growth'] },
  { name: 'Khosla Ventures', firm: 'Khosla Ventures', sectors: ['SpaceTech', 'CleanTech', 'DeepTech', 'AI/ML', 'Energy'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'DCVC', firm: 'DCVC', sectors: ['DeepTech', 'SpaceTech', 'Materials', 'AI/ML', 'Climate'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Draper Fisher Jurvetson', firm: 'DFJ', sectors: ['SpaceTech', 'Robotics', 'AI/ML', 'DeepTech'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Space Capital', firm: 'Space Capital', sectors: ['SpaceTech', 'Aerospace', 'Defense', 'Satellite'], stage: ['Seed', 'Series A'] },
  { name: 'Seraphim Space', firm: 'Seraphim', sectors: ['SpaceTech', 'Satellite', 'Aerospace', 'Defense'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Bessemer Venture Partners', firm: 'Bessemer', sectors: ['SpaceTech', 'SaaS', 'AI/ML', 'Defense'], stage: ['Seed', 'Series A', 'Series B'] },
  
  // Defense Focused
  { name: 'Andreessen Horowitz', firm: 'a16z', sectors: ['Defense', 'AI/ML', 'SaaS', 'Crypto', 'Robotics'], stage: ['Seed', 'Series A', 'Series B', 'Growth'] },
  { name: 'Shield Capital', firm: 'Shield Capital', sectors: ['Defense', 'National Security', 'Cybersecurity', 'AI/ML'], stage: ['Seed', 'Series A'] },
  { name: 'Decisive Point', firm: 'Decisive Point', sectors: ['Defense', 'National Security', 'AI/ML', 'Autonomy'], stage: ['Seed', 'Series A'] },
  { name: 'America Frontier Fund', firm: 'AFF', sectors: ['Defense', 'DeepTech', 'SpaceTech', 'Materials'], stage: ['Seed', 'Series A'] },
  { name: 'General Catalyst', firm: 'General Catalyst', sectors: ['Defense', 'AI/ML', 'SaaS', 'FinTech'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Point72 Ventures', firm: 'Point72', sectors: ['Defense', 'AI/ML', 'FinTech', 'DeepTech'], stage: ['Seed', 'Series A', 'Series B'] },
  
  // Materials & DeepTech
  { name: 'Eclipse Ventures', firm: 'Eclipse', sectors: ['Materials', 'DeepTech', 'Manufacturing', 'Robotics'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Breakthrough Energy Ventures', firm: 'BEV', sectors: ['Energy', 'Climate', 'Materials', 'DeepTech'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Engine Ventures', firm: 'Engine', sectors: ['Materials', 'Manufacturing', 'DeepTech', 'Robotics'], stage: ['Seed', 'Series A'] },
  { name: 'Congruent Ventures', firm: 'Congruent', sectors: ['Climate', 'Energy', 'Materials', 'DeepTech'], stage: ['Seed', 'Series A'] },
  
  // Energy & BESS
  { name: 'Energy Impact Partners', firm: 'EIP', sectors: ['Energy', 'CleanTech', 'BESS', 'Climate'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Clean Energy Ventures', firm: 'CEV', sectors: ['Energy', 'BESS', 'Solar', 'Climate'], stage: ['Seed', 'Series A'] },
  { name: 'Prelude Ventures', firm: 'Prelude', sectors: ['Climate', 'Energy', 'BESS', 'Materials'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Lowercarbon Capital', firm: 'Lowercarbon', sectors: ['Climate', 'Energy', 'DeepTech', 'Materials'], stage: ['Seed', 'Series A'] },
];

async function addInvestors() {
  console.log('Adding SpaceTech, Defense, Materials, and Energy investors...\n');
  
  let added = 0;
  let updated = 0;
  
  for (const inv of SPACETECH_DEFENSE_INVESTORS) {
    // Check if exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id, sectors')
      .ilike('name', '%' + inv.name.split(' ')[0] + '%')
      .limit(1);
    
    if (existing && existing.length > 0) {
      // Update existing with new sectors
      const mergedSectors = [...new Set([...(existing[0].sectors || []), ...inv.sectors])];
      await supabase.from('investors').update({ 
        sectors: mergedSectors,
        stage: inv.stage,
        updated_at: new Date().toISOString()
      }).eq('id', existing[0].id);
      updated++;
      console.log('Updated:', inv.name, '| Sectors:', mergedSectors.join(', '));
    } else {
      // Insert new
      const { error } = await supabase.from('investors').insert({
        name: inv.name,
        firm: inv.firm,
        sectors: inv.sectors,
        stage: inv.stage,
        source_type: 'manual',
        created_at: new Date().toISOString()
      });
      if (!error) {
        added++;
        console.log('Added:', inv.name, '| Sectors:', inv.sectors.join(', '));
      }
    }
  }
  
  console.log('\nDone! Added:', added, '| Updated:', updated);
  
  // Check new counts
  const { data: investors } = await supabase.from('investors').select('sectors').not('sectors', 'eq', '{}');
  const count = (term) => investors.filter(i => (i.sectors || []).some(s => s.toLowerCase().includes(term))).length;
  
  console.log('\nNEW SECTOR COVERAGE:');
  console.log('  SpaceTech:', count('space'));
  console.log('  Defense:', count('defense'));
  console.log('  Materials:', count('material'));
  console.log('  Energy:', count('energy'));
  console.log('  DeepTech:', count('deep'));
}

addInvestors().catch(console.error);
