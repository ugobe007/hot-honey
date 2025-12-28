require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STARTUPS = [
  { name: 'Anthropic', tagline: 'AI safety company', sectors: ['AI'] },
  { name: 'Cohere', tagline: 'Enterprise AI platform', sectors: ['AI'] },
  { name: 'Mistral AI', tagline: 'Open source LLMs', sectors: ['AI'] },
  { name: 'Perplexity', tagline: 'AI search engine', sectors: ['AI'] },
  { name: 'Runway', tagline: 'AI video generation', sectors: ['AI'] },
  { name: 'Stability AI', tagline: 'Open source generative AI', sectors: ['AI'] },
  { name: 'Inflection AI', tagline: 'Personal AI assistant', sectors: ['AI'] },
  { name: 'Adept AI', tagline: 'AI that takes actions', sectors: ['AI'] },
  { name: 'Character AI', tagline: 'AI characters', sectors: ['AI'] },
  { name: 'Jasper', tagline: 'AI content platform', sectors: ['AI'] },
  { name: 'Synthesia', tagline: 'AI video avatars', sectors: ['AI'] },
  { name: 'Descript', tagline: 'AI video editing', sectors: ['AI'] },
  { name: 'Glean', tagline: 'AI enterprise search', sectors: ['AI'] },
  { name: 'Harvey', tagline: 'AI for lawyers', sectors: ['AI'] },
  { name: 'Hugging Face', tagline: 'AI model hub', sectors: ['AI'] },
  { name: 'Anduril', tagline: 'Defense technology', sectors: ['Defense'] },
  { name: 'Shield AI', tagline: 'AI for defense', sectors: ['Defense'] },
  { name: 'Skydio', tagline: 'Autonomous drones', sectors: ['Defense'] },
  { name: 'Palantir', tagline: 'Data analytics', sectors: ['Defense'] },
  { name: 'Hadrian', tagline: 'Defense manufacturing', sectors: ['Defense'] },
  { name: 'Figure', tagline: 'Humanoid robots', sectors: ['Robotics'] },
  { name: 'Agility Robotics', tagline: 'Bipedal robots', sectors: ['Robotics'] },
  { name: 'Covariant', tagline: 'AI robotics', sectors: ['Robotics'] },
  { name: 'Nuro', tagline: 'Autonomous delivery', sectors: ['Robotics'] },
  { name: 'Zipline', tagline: 'Drone delivery', sectors: ['Robotics'] },
  { name: 'Commonwealth Fusion', tagline: 'Fusion energy', sectors: ['Climate'] },
  { name: 'Climeworks', tagline: 'Carbon capture', sectors: ['Climate'] },
  { name: 'Form Energy', tagline: 'Long duration batteries', sectors: ['Climate'] },
  { name: 'QuantumScape', tagline: 'Solid state batteries', sectors: ['Climate'] },
  { name: 'Redwood Materials', tagline: 'Battery recycling', sectors: ['Climate'] },
  { name: 'Stripe', tagline: 'Payment infrastructure', sectors: ['Fintech'] },
  { name: 'Plaid', tagline: 'Financial data', sectors: ['Fintech'] },
  { name: 'Ramp', tagline: 'Corporate cards', sectors: ['Fintech'] },
  { name: 'Brex', tagline: 'Business finance', sectors: ['Fintech'] },
  { name: 'Mercury', tagline: 'Startup banking', sectors: ['Fintech'] },
  { name: 'Vercel', tagline: 'Frontend cloud', sectors: ['DevTools'] },
  { name: 'Supabase', tagline: 'Open source Firebase', sectors: ['DevTools'] },
  { name: 'Railway', tagline: 'Deploy anything', sectors: ['DevTools'] },
  { name: 'Linear', tagline: 'Issue tracking', sectors: ['DevTools'] },
  { name: 'Notion', tagline: 'Connected workspace', sectors: ['DevTools'] },
  { name: 'Tempus', tagline: 'Precision medicine', sectors: ['HealthTech'] },
  { name: 'Ro', tagline: 'Telehealth', sectors: ['HealthTech'] },
  { name: 'Spring Health', tagline: 'Mental health', sectors: ['HealthTech'] },
  { name: 'Abridge', tagline: 'Medical AI scribe', sectors: ['HealthTech'] },
  { name: 'SpaceX', tagline: 'Space transportation', sectors: ['Space'] },
  { name: 'Rocket Lab', tagline: 'Small satellite launch', sectors: ['Space'] },
  { name: 'Relativity Space', tagline: '3D printed rockets', sectors: ['Space'] },
  { name: 'Planet Labs', tagline: 'Earth imaging', sectors: ['Space'] },
  { name: 'Axiom Space', tagline: 'Commercial space station', sectors: ['Space'] },
  { name: 'Varda Space', tagline: 'Space manufacturing', sectors: ['Space'] }
];

async function run() {
  let added = 0, skipped = 0;
  for (const s of STARTUPS) {
    const { data: ex } = await supabase.from('startup_uploads').select('id').ilike('name', s.name).limit(1);
    if (ex && ex.length > 0) { skipped++; continue; }
    const { error } = await supabase.from('startup_uploads').insert({
      name: s.name, tagline: s.tagline, sectors: s.sectors, status: 'approved', source: 'curated'
    });
    if (!error) { added++; console.log('+ ' + s.name); }
  }
  console.log('Added: ' + added + ' | Skipped: ' + skipped);
}
run();
