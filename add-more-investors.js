require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const NEW_INVESTORS = [
  // SpaceTech VCs
  { name: 'Space Capital Partners', firm: 'Space Capital', sectors: ['SpaceTech', 'Aerospace', 'Satellite', 'Defense'], stage: ['Seed', 'Series A'] },
  { name: 'Seraphim Space Camp', firm: 'Seraphim', sectors: ['SpaceTech', 'Aerospace', 'Satellite'], stage: ['Seed', 'Series A'] },
  { name: 'Relativity Space Ventures', firm: 'Relativity', sectors: ['SpaceTech', 'Aerospace', 'Manufacturing'], stage: ['Seed', 'Series A'] },
  { name: 'Lockheed Martin Ventures', firm: 'LMV', sectors: ['SpaceTech', 'Defense', 'Aerospace', 'AI/ML'], stage: ['Series A', 'Series B'] },
  { name: 'Boeing HorizonX', firm: 'Boeing', sectors: ['SpaceTech', 'Aerospace', 'Defense', 'Autonomy'], stage: ['Series A', 'Series B'] },
  { name: 'RTX Ventures', firm: 'RTX', sectors: ['Defense', 'Aerospace', 'SpaceTech'], stage: ['Series A', 'Series B'] },
  { name: 'In-Q-Tel', firm: 'IQT', sectors: ['Defense', 'National Security', 'AI/ML', 'SpaceTech'], stage: ['Seed', 'Series A'] },
  { name: 'Northrop Grumman Ventures', firm: 'NGC', sectors: ['Defense', 'SpaceTech', 'Aerospace'], stage: ['Series A', 'Series B'] },
  
  // Defense & National Security
  { name: 'Anduril Ventures', firm: 'Anduril', sectors: ['Defense', 'Autonomy', 'AI/ML', 'Robotics'], stage: ['Seed', 'Series A'] },
  { name: 'Palantir Ventures', firm: 'Palantir', sectors: ['Defense', 'AI/ML', 'Enterprise', 'National Security'], stage: ['Seed', 'Series A'] },
  { name: 'Shield Capital Partners', firm: 'Shield Capital', sectors: ['Defense', 'National Security', 'Cybersecurity'], stage: ['Seed', 'Series A'] },
  { name: 'Razor Edge Ventures', firm: 'Razor Edge', sectors: ['Defense', 'SpaceTech', 'AI/ML'], stage: ['Seed', 'Series A'] },
  { name: 'Riot Ventures', firm: 'Riot', sectors: ['Defense', 'National Security', 'Cybersecurity'], stage: ['Seed', 'Series A'] },
  { name: 'Marlinspike Partners', firm: 'Marlinspike', sectors: ['Defense', 'Maritime', 'Autonomy'], stage: ['Seed', 'Series A'] },
  
  // Materials & DeepTech
  { name: 'The Engine', firm: 'The Engine', sectors: ['DeepTech', 'Materials', 'Climate', 'Energy'], stage: ['Seed', 'Series A'] },
  { name: 'Lux Capital Management', firm: 'Lux', sectors: ['DeepTech', 'SpaceTech', 'Materials', 'Robotics', 'AI/ML'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'DCVC Deep Tech', firm: 'DCVC', sectors: ['DeepTech', 'Materials', 'Climate', 'AI/ML'], stage: ['Seed', 'Series A'] },
  { name: 'Playground Global', firm: 'Playground', sectors: ['DeepTech', 'Robotics', 'AI/ML', 'Materials'], stage: ['Seed', 'Series A'] },
  { name: 'Root Ventures', firm: 'Root', sectors: ['DeepTech', 'Robotics', 'Manufacturing', 'Materials'], stage: ['Seed', 'Series A'] },
  { name: 'Obvious Ventures', firm: 'Obvious', sectors: ['Climate', 'Materials', 'DeepTech', 'Consumer'], stage: ['Seed', 'Series A'] },
  
  // Energy & Climate
  { name: 'Energy Impact Partners LP', firm: 'EIP', sectors: ['Energy', 'BESS', 'Climate', 'CleanTech'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Breakthrough Energy', firm: 'BEV', sectors: ['Energy', 'Climate', 'BESS', 'Materials'], stage: ['Seed', 'Series A', 'Series B'] },
  { name: 'Congruent Ventures LP', firm: 'Congruent', sectors: ['Climate', 'Energy', 'BESS', 'Materials'], stage: ['Seed', 'Series A'] },
  { name: 'Prelude Ventures LLC', firm: 'Prelude', sectors: ['Climate', 'Energy', 'DeepTech'], stage: ['Seed', 'Series A'] },
  { name: 'Lowercarbon Capital', firm: 'Lowercarbon', sectors: ['Climate', 'Energy', 'DeepTech'], stage: ['Seed', 'Series A'] },
  { name: 'Generate Capital', firm: 'Generate', sectors: ['Energy', 'Climate', 'Infrastructure'], stage: ['Series A', 'Series B', 'Growth'] },
  { name: 'Spring Lane Capital', firm: 'Spring Lane', sectors: ['Energy', 'Climate', 'BESS'], stage: ['Series A', 'Series B'] },
];

async function add() {
  console.log('Adding new investors...\n');
  let added = 0;
  
  for (const inv of NEW_INVESTORS) {
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
      console.log('Added:', inv.name);
    } else {
      console.log('Skipped:', inv.name, '-', error.message);
    }
  }
  
  console.log('\nTotal added:', added);
  
  // Final counts
  const { data: investors } = await supabase.from('investors').select('sectors').not('sectors', 'eq', '{}');
  const count = (term) => investors.filter(i => (i.sectors || []).some(s => s.toLowerCase().includes(term))).length;
  
  console.log('\nFINAL SECTOR COVERAGE:');
  console.log('  SpaceTech:', count('space'));
  console.log('  Defense:', count('defense'));
  console.log('  Materials:', count('material'));
  console.log('  Energy:', count('energy'));
  console.log('  BESS:', count('bess'));
  console.log('  DeepTech:', count('deep'));
  console.log('  Climate:', count('climate'));
}

add().catch(console.error);
