require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const FIRM_SECTOR_MAP = {
  'lux': ['SpaceTech', 'DeepTech', 'Robotics', 'Materials'],
  'founders fund': ['SpaceTech', 'Defense', 'DeepTech'],
  'khosla': ['SpaceTech', 'CleanTech', 'DeepTech', 'Energy'],
  'dcvc': ['DeepTech', 'SpaceTech', 'Materials', 'Climate'],
  'a16z': ['Defense', 'AI/ML', 'SaaS', 'Crypto'],
  'andreessen': ['Defense', 'AI/ML', 'SaaS', 'Crypto'],
  'general catalyst': ['Defense', 'AI/ML', 'SaaS'],
  'bessemer': ['SpaceTech', 'SaaS', 'Defense'],
  'energy impact': ['Energy', 'BESS', 'Climate'],
  'breakthrough': ['Energy', 'Climate', 'BESS', 'Materials'],
  'congruent': ['Climate', 'Energy', 'BESS'],
  'prelude': ['Climate', 'Energy', 'DeepTech'],
  'lowercarbon': ['Climate', 'Energy', 'DeepTech'],
  'eclipse': ['Materials', 'DeepTech', 'Manufacturing'],
  'playground': ['DeepTech', 'Robotics', 'AI/ML'],
  'root ventures': ['DeepTech', 'Robotics', 'Manufacturing'],
  'sequoia': ['SaaS', 'AI/ML', 'FinTech', 'Consumer'],
  'greylock': ['SaaS', 'AI/ML', 'Enterprise'],
  'accel': ['SaaS', 'FinTech', 'Consumer'],
  'lightspeed': ['SaaS', 'Consumer', 'FinTech'],
  'index': ['SaaS', 'FinTech', 'Consumer'],
  'first round': ['SaaS', 'Consumer', 'AI/ML'],
  'initialized': ['SaaS', 'AI/ML'],
  'felicis': ['SaaS', 'Consumer', 'FinTech'],
};

async function inferSectors() {
  console.log('INVESTOR INFERENCE ENGINE v2.0\n');

  const { data: investors } = await supabase.from('investors').select('id, name, firm, sectors').limit(2000);
  console.log('Total investors:', investors.length);
  
  let updated = 0;

  for (const inv of investors) {
    const name = (inv.name || '').toLowerCase();
    const firm = (inv.firm || '').toLowerCase();
    const currentSectors = inv.sectors || [];
    let newSectors = [...currentSectors];
    let matched = false;
    
    for (const [pattern, sectors] of Object.entries(FIRM_SECTOR_MAP)) {
      if (name.includes(pattern) || firm.includes(pattern)) {
        sectors.forEach(sec => {
          if (!newSectors.some(s => s.toLowerCase() === sec.toLowerCase())) {
            newSectors.push(sec);
            matched = true;
          }
        });
      }
    }
    
    if (matched && newSectors.length > currentSectors.length) {
      await supabase.from('investors').update({ sectors: newSectors }).eq('id', inv.id);
      updated++;
      console.log('Enriched:', inv.name.substring(0, 40));
    }
  }

  console.log('\nTotal enriched:', updated);

  const { data: final } = await supabase.from('investors').select('sectors').not('sectors', 'eq', '{}');
  const count = (term) => final.filter(i => (i.sectors || []).some(s => s.toLowerCase().includes(term))).length;

  console.log('\nFINAL COVERAGE:');
  console.log('  SpaceTech:', count('space'));
  console.log('  Defense:', count('defense'));
  console.log('  DeepTech:', count('deep'));
  console.log('  Materials:', count('material'));
  console.log('  Energy:', count('energy'));
  console.log('  BESS:', count('bess'));
  console.log('  Climate:', count('climate'));
}

inferSectors().catch(console.error);
