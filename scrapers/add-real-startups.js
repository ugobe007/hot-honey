require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Real startups from recent funding rounds (2024-2025)
const NEW_STARTUPS = [
  // AI/ML - Hot sector
  { name: 'Anthropic', tagline: 'AI safety company building reliable AI systems', sectors: ['AI/ML', 'Enterprise'], god: 62 },
  { name: 'Mistral AI', tagline: 'Open-weight LLMs for enterprise', sectors: ['AI/ML', 'Enterprise'], god: 60 },
  { name: 'Cohere', tagline: 'Enterprise AI platform for text generation', sectors: ['AI/ML', 'Enterprise', 'SaaS'], god: 58 },
  { name: 'Perplexity', tagline: 'AI-powered answer engine', sectors: ['AI/ML', 'Consumer'], god: 57 },
  { name: 'Character.AI', tagline: 'Conversational AI characters', sectors: ['AI/ML', 'Consumer', 'Gaming'], god: 55 },
  { name: 'Hugging Face', tagline: 'ML platform and model hub', sectors: ['AI/ML', 'Developer Tools'], god: 56 },
  { name: 'Runway', tagline: 'AI video generation tools', sectors: ['AI/ML', 'Consumer', 'Media'], god: 54 },
  { name: 'Jasper', tagline: 'AI marketing content platform', sectors: ['AI/ML', 'SaaS', 'Enterprise'], god: 52 },
  
  // SpaceTech
  { name: 'Relativity Space', tagline: '3D printed rockets', sectors: ['SpaceTech', 'DeepTech'], god: 58 },
  { name: 'Rocket Lab', tagline: 'Small satellite launch provider', sectors: ['SpaceTech', 'Defense'], god: 56 },
  { name: 'Planet Labs', tagline: 'Earth observation satellites', sectors: ['SpaceTech', 'Climate'], god: 54 },
  { name: 'Spire Global', tagline: 'Satellite data analytics', sectors: ['SpaceTech', 'SaaS'], god: 50 },
  { name: 'Astra', tagline: 'Small rocket launch services', sectors: ['SpaceTech'], god: 45 },
  
  // Defense Tech
  { name: 'Anduril', tagline: 'Defense technology and autonomous systems', sectors: ['Defense', 'AI/ML', 'Robotics'], god: 61 },
  { name: 'Shield AI', tagline: 'AI pilot for defense aircraft', sectors: ['Defense', 'AI/ML'], god: 58 },
  { name: 'Palantir', tagline: 'Data analytics for defense and enterprise', sectors: ['Defense', 'Enterprise', 'AI/ML'], god: 60 },
  { name: 'Hadrian', tagline: 'Automated manufacturing for aerospace', sectors: ['Defense', 'Robotics'], god: 52 },
  
  // FinTech
  { name: 'Stripe', tagline: 'Payment processing infrastructure', sectors: ['FinTech', 'SaaS'], god: 63 },
  { name: 'Plaid', tagline: 'Financial data connectivity', sectors: ['FinTech', 'SaaS', 'Developer Tools'], god: 58 },
  { name: 'Ramp', tagline: 'Corporate cards and spend management', sectors: ['FinTech', 'Enterprise'], god: 56 },
  { name: 'Brex', tagline: 'Financial services for startups', sectors: ['FinTech', 'Enterprise'], god: 55 },
  { name: 'Mercury', tagline: 'Banking for startups', sectors: ['FinTech', 'SaaS'], god: 54 },
  { name: 'Deel', tagline: 'Global payroll and compliance', sectors: ['FinTech', 'HR Tech', 'SaaS'], god: 57 },
  
  // Climate/Energy
  { name: 'Commonwealth Fusion', tagline: 'Commercial fusion energy', sectors: ['Energy', 'DeepTech', 'Climate'], god: 58 },
  { name: 'Form Energy', tagline: 'Long-duration energy storage', sectors: ['Energy', 'Climate'], god: 55 },
  { name: 'Redwood Materials', tagline: 'Battery recycling', sectors: ['Climate', 'Energy'], god: 54 },
  { name: 'Twelve', tagline: 'CO2 to chemicals transformation', sectors: ['Climate', 'DeepTech'], god: 52 },
  { name: 'Climeworks', tagline: 'Direct air carbon capture', sectors: ['Climate', 'DeepTech'], god: 53 },
  
  // HealthTech
  { name: 'Tempus', tagline: 'AI-powered precision medicine', sectors: ['HealthTech', 'AI/ML'], god: 57 },
  { name: 'Ro', tagline: 'Digital health clinic', sectors: ['HealthTech', 'Consumer'], god: 52 },
  { name: 'Hims & Hers', tagline: 'Telehealth platform', sectors: ['HealthTech', 'Consumer'], god: 51 },
  { name: 'Devoted Health', tagline: 'Medicare Advantage plans', sectors: ['HealthTech', 'FinTech'], god: 54 },
  
  // Robotics
  { name: 'Figure', tagline: 'Humanoid robots for labor', sectors: ['Robotics', 'AI/ML'], god: 56 },
  { name: 'Apptronik', tagline: 'General purpose humanoid robots', sectors: ['Robotics', 'AI/ML'], god: 50 },
  { name: 'Agility Robotics', tagline: 'Bipedal warehouse robots', sectors: ['Robotics', 'Enterprise'], god: 52 },
  { name: 'Covariant', tagline: 'AI for robotic picking', sectors: ['Robotics', 'AI/ML', 'Enterprise'], god: 51 },
  
  // Developer Tools
  { name: 'Vercel', tagline: 'Frontend cloud platform', sectors: ['Developer Tools', 'SaaS'], god: 57 },
  { name: 'Supabase', tagline: 'Open source Firebase alternative', sectors: ['Developer Tools', 'SaaS'], god: 55 },
  { name: 'Railway', tagline: 'Infrastructure platform', sectors: ['Developer Tools', 'SaaS'], god: 48 },
  { name: 'Render', tagline: 'Cloud application hosting', sectors: ['Developer Tools', 'SaaS'], god: 47 },
  { name: 'Retool', tagline: 'Internal tool builder', sectors: ['Developer Tools', 'Enterprise'], god: 53 },
  
  // Early Stage (GOD 30-40)
  { name: 'AICodeHelper', tagline: 'AI pair programming assistant', sectors: ['AI/ML', 'Developer Tools'], god: 38 },
  { name: 'GreenRoute', tagline: 'Carbon-neutral delivery routing', sectors: ['Climate', 'Logistics'], god: 35 },
  { name: 'MedChat', tagline: 'AI health assistant', sectors: ['HealthTech', 'AI/ML'], god: 33 },
  { name: 'SpaceScan', tagline: 'Satellite imagery for farms', sectors: ['SpaceTech', 'Climate'], god: 36 },
  { name: 'RoboDelivery', tagline: 'Last-mile delivery robots', sectors: ['Robotics', 'Consumer'], god: 32 },
  { name: 'CryptoSafe', tagline: 'Secure crypto wallet', sectors: ['Crypto', 'FinTech'], god: 34 },
  { name: 'LearnAI', tagline: 'AI tutoring platform', sectors: ['EdTech', 'AI/ML'], god: 31 },
  { name: 'FarmBot', tagline: 'Agricultural automation', sectors: ['Robotics', 'Climate'], god: 37 },
  { name: 'LegalBot', tagline: 'AI contract analysis', sectors: ['LegalTech', 'AI/ML'], god: 35 },
  { name: 'PropFind', tagline: 'AI property matching', sectors: ['PropTech', 'AI/ML'], god: 33 },
];

async function addStartups() {
  console.log('Adding real startups...\n');
  let added = 0;
  let skipped = 0;
  
  for (const s of NEW_STARTUPS) {
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .ilike('name', s.name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase.from('startup_uploads').insert({
      name: s.name,
      tagline: s.tagline,
      sectors: s.sectors,
      stage: s.god >= 55 ? 3 : s.god >= 45 ? 2 : 1,
      source_type: 'url',
      status: 'approved',
      total_god_score: s.god,
      created_at: new Date().toISOString()
    });
    
    if (!error) {
      added++;
      console.log('Added:', s.name, '| GOD:', s.god, '| Sectors:', s.sectors.join(', '));
    } else {
      console.log('Error:', s.name, error.message);
    }
  }
  
  console.log('\nTotal added:', added, '| Skipped:', skipped);
}

addStartups();
