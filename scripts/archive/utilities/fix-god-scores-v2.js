require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixGodScores() {
  const fixes = [
    { name: 'Anduril', god: 61, sectors: ['Defense', 'AI/ML', 'Robotics'] },
    { name: 'Shield AI', god: 58, sectors: ['Defense', 'AI/ML'] },
    { name: 'Palantir', god: 60, sectors: ['Defense', 'Enterprise', 'AI/ML'] },
    { name: 'Stripe', god: 63, sectors: ['FinTech', 'SaaS'] },
    { name: 'Plaid', god: 58, sectors: ['FinTech', 'SaaS', 'Developer Tools'] },
    { name: 'Anthropic', god: 62, sectors: ['AI/ML', 'Enterprise'] },
    { name: 'Perplexity', god: 57, sectors: ['AI/ML', 'Consumer'] },
    { name: 'Character.AI', god: 55, sectors: ['AI/ML', 'Consumer', 'Gaming'] },
    { name: 'Hugging Face', god: 56, sectors: ['AI/ML', 'Developer Tools'] },
    { name: 'Runway', god: 54, sectors: ['AI/ML', 'Consumer'] },
    { name: 'Relativity Space', god: 58, sectors: ['SpaceTech', 'DeepTech'] },
    { name: 'Rocket Lab', god: 56, sectors: ['SpaceTech', 'Defense'] },
  ];
  
  console.log('Fixing GOD scores for key startups...\n');
  
  for (const fix of fixes) {
    const { error } = await s.from('startup_uploads')
      .update({ total_god_score: fix.god, sectors: fix.sectors })
      .ilike('name', fix.name);
    
    if (error) {
      console.log('Error:', fix.name, error.message);
    } else {
      console.log('Fixed:', fix.name, '-> GOD:', fix.god);
    }
  }
  
  console.log('\nDone.');
}

fixGodScores();
