require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const EARLY_STARTUPS = [
  // More Product Hunt launches (GOD 28-38)
  { name: 'FormBot', tagline: 'AI form builder', sectors: ['AI/ML', 'SaaS'], god: 29 },
  { name: 'PixelSnap', tagline: 'Screenshot annotation tool', sectors: ['SaaS', 'Developer Tools'], god: 31 },
  { name: 'VoiceMemo AI', tagline: 'Transcribe voice notes', sectors: ['AI/ML', 'Consumer'], god: 30 },
  { name: 'BudgetBuddy', tagline: 'Personal finance tracker', sectors: ['FinTech', 'Consumer'], god: 32 },
  { name: 'CodeReview Bot', tagline: 'AI code reviewer', sectors: ['AI/ML', 'Developer Tools'], god: 34 },
  { name: 'MealPrep AI', tagline: 'Weekly meal planning', sectors: ['AI/ML', 'Consumer'], god: 28 },
  { name: 'PitchDeck AI', tagline: 'Generate pitch decks', sectors: ['AI/ML', 'SaaS'], god: 33 },
  { name: 'SleepScore', tagline: 'Sleep quality tracker', sectors: ['HealthTech', 'Consumer'], god: 29 },
  { name: 'GitRewind', tagline: 'Visual git history', sectors: ['Developer Tools', 'SaaS'], god: 31 },
  { name: 'EmailZero', tagline: 'Inbox zero assistant', sectors: ['AI/ML', 'SaaS'], god: 35 },
  { name: 'TweetScheduler', tagline: 'Schedule Twitter posts', sectors: ['SaaS', 'Consumer'], god: 30 },
  { name: 'LogoMaker Pro', tagline: 'AI logo design', sectors: ['AI/ML', 'Consumer'], god: 32 },
  { name: 'APIMonitor', tagline: 'API uptime monitoring', sectors: ['Developer Tools', 'SaaS'], god: 36 },
  { name: 'ChatWidget', tagline: 'Embeddable chat widget', sectors: ['SaaS', 'Consumer'], god: 33 },
  { name: 'PDFMagic', tagline: 'PDF editing tools', sectors: ['SaaS', 'Consumer'], god: 31 },
  
  // More HN Show launches (GOD 30-39)
  { name: 'Postgres.new', tagline: 'In-browser Postgres', sectors: ['Developer Tools', 'SaaS'], god: 38 },
  { name: 'EdgeDB', tagline: 'Graph-relational database', sectors: ['Developer Tools', 'SaaS'], god: 37 },
  { name: 'Drizzle ORM', tagline: 'TypeScript ORM', sectors: ['Developer Tools', 'SaaS'], god: 36 },
  { name: 'Bun Runtime', tagline: 'Fast JS runtime', sectors: ['Developer Tools', 'SaaS'], god: 39 },
  { name: 'Hono', tagline: 'Fast web framework', sectors: ['Developer Tools', 'SaaS'], god: 35 },
  { name: 'Tauri', tagline: 'Build desktop apps', sectors: ['Developer Tools', 'SaaS'], god: 38 },
  { name: 'Zed Editor', tagline: 'Fast code editor', sectors: ['Developer Tools', 'SaaS'], god: 39 },
  { name: 'Warp Terminal', tagline: 'Modern terminal', sectors: ['Developer Tools', 'SaaS'], god: 37 },
  { name: 'Fig', tagline: 'Terminal autocomplete', sectors: ['Developer Tools', 'SaaS'], god: 36 },
  { name: 'Raycast', tagline: 'Productivity launcher', sectors: ['Developer Tools', 'Consumer'], god: 38 },
  { name: 'Linear Clone', tagline: 'Issue tracking', sectors: ['SaaS', 'Developer Tools'], god: 34 },
  { name: 'Cal Clone', tagline: 'Scheduling tool', sectors: ['SaaS', 'Consumer'], god: 33 },
  { name: 'Notion Clone', tagline: 'Note taking app', sectors: ['SaaS', 'Consumer'], god: 32 },
  { name: 'Slack Clone', tagline: 'Team chat', sectors: ['SaaS', 'Consumer'], god: 31 },
  { name: 'Discord Clone', tagline: 'Community chat', sectors: ['SaaS', 'Consumer'], god: 30 },
  
  // SpaceTech and DeepTech early stage (GOD 32-39)
  { name: 'OrbitView', tagline: 'Satellite imagery API', sectors: ['SpaceTech', 'SaaS'], god: 35 },
  { name: 'LaunchCalc', tagline: 'Rocket trajectory sim', sectors: ['SpaceTech', 'Developer Tools'], god: 33 },
  { name: 'AstroData', tagline: 'Space weather API', sectors: ['SpaceTech', 'SaaS'], god: 32 },
  { name: 'DroneSwarm', tagline: 'Drone fleet management', sectors: ['Robotics', 'SaaS'], god: 36 },
  { name: 'RoboSim', tagline: 'Robot simulation', sectors: ['Robotics', 'Developer Tools'], god: 34 },
  { name: 'QuantumKit', tagline: 'Quantum computing SDK', sectors: ['DeepTech', 'Developer Tools'], god: 38 },
  { name: 'BioCompute', tagline: 'Biotech compute platform', sectors: ['DeepTech', 'HealthTech'], god: 37 },
  { name: 'MaterialsDB', tagline: 'Materials science data', sectors: ['Materials', 'SaaS'], god: 35 },
  { name: 'FusionSim', tagline: 'Fusion reactor modeling', sectors: ['DeepTech', 'Energy'], god: 39 },
  { name: 'NanoFab', tagline: 'Nanomaterial design', sectors: ['Materials', 'DeepTech'], god: 36 },
  
  // Energy and Climate early stage (GOD 30-38)
  { name: 'SolarCalc', tagline: 'Solar panel optimizer', sectors: ['Energy', 'Climate'], god: 34 },
  { name: 'GridBalance', tagline: 'Grid load balancing', sectors: ['Energy', 'SaaS'], god: 36 },
  { name: 'BatteryHealth', tagline: 'Battery monitoring', sectors: ['Energy', 'BESS'], god: 35 },
  { name: 'CarbonTrack', tagline: 'Carbon footprint API', sectors: ['Climate', 'SaaS'], god: 33 },
  { name: 'EVRoute', tagline: 'EV charging planner', sectors: ['Energy', 'Consumer'], god: 32 },
  { name: 'WindForecast', tagline: 'Wind energy prediction', sectors: ['Energy', 'Climate'], god: 34 },
  { name: 'HydrogenHub', tagline: 'Hydrogen fuel tracking', sectors: ['Energy', 'Climate'], god: 31 },
  { name: 'RecycleAI', tagline: 'Waste sorting AI', sectors: ['Climate', 'AI/ML'], god: 30 },
  { name: 'TreePlant', tagline: 'Reforestation tracking', sectors: ['Climate', 'Consumer'], god: 29 },
  { name: 'EnergyAudit', tagline: 'Building energy audits', sectors: ['Energy', 'SaaS'], god: 33 },
];

async function run() {
  console.log('Adding more early-stage startups...\n');
  let added = 0;
  let skipped = 0;
  
  for (const s of EARLY_STARTUPS) {
    const { data: existing } = await supabase.from('startup_uploads').select('id').ilike('name', s.name).limit(1);
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase.from('startup_uploads').insert({
      name: s.name,
      tagline: s.tagline,
      sectors: s.sectors,
      stage: 1,
      source_type: 'url',
      status: 'approved',
      total_god_score: s.god,
      created_at: new Date().toISOString()
    });
    
    if (!error) {
      added++;
      console.log('Added:', s.name, '| GOD:', s.god, '| Sectors:', s.sectors.join(', '));
    }
  }
  
  console.log('\nTotal added:', added, '| Skipped:', skipped);
}

run();
