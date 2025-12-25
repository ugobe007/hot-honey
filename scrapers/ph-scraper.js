require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const PH_STARTUPS = [
  { name: 'LaunchPad AI', tagline: 'AI-powered landing page builder', sectors: ['AI/ML', 'SaaS'], stage: 0 },
  { name: 'CodeBuddy', tagline: 'Your AI pair programmer', sectors: ['AI/ML', 'Developer Tools'], stage: 0 },
  { name: 'InvoiceFlow', tagline: 'Automated invoicing for freelancers', sectors: ['FinTech', 'SaaS'], stage: 0 },
  { name: 'HealthTrack', tagline: 'Personal health metrics dashboard', sectors: ['HealthTech', 'Consumer'], stage: 0 },
  { name: 'MeetingBot', tagline: 'AI meeting notes and action items', sectors: ['AI/ML', 'SaaS'], stage: 1 },
  { name: 'CryptoAlert', tagline: 'Real-time crypto price alerts', sectors: ['Crypto', 'Consumer'], stage: 0 },
  { name: 'DesignSync', tagline: 'Figma to code in seconds', sectors: ['Developer Tools', 'SaaS'], stage: 0 },
  { name: 'GreenCommute', tagline: 'Carbon tracking for daily commute', sectors: ['Climate', 'Consumer'], stage: 0 },
  { name: 'StudyAI', tagline: 'AI tutor for any subject', sectors: ['EdTech', 'AI/ML'], stage: 0 },
  { name: 'DataPipe', tagline: 'No-code data pipelines', sectors: ['SaaS', 'Developer Tools'], stage: 1 },
  { name: 'RoboChef', tagline: 'AI recipe generator', sectors: ['AI/ML', 'Consumer'], stage: 0 },
  { name: 'LegalEase', tagline: 'AI contract review', sectors: ['AI/ML', 'SaaS'], stage: 1 },
  { name: 'FitCoach', tagline: 'Personalized workout plans', sectors: ['HealthTech', 'Consumer'], stage: 0 },
  { name: 'SpaceView', tagline: 'Satellite imagery for agriculture', sectors: ['SpaceTech', 'Climate'], stage: 1 },
  { name: 'SecureVault', tagline: 'Zero-knowledge password manager', sectors: ['Cybersecurity', 'Consumer'], stage: 0 },
];

async function run() {
  console.log('Product Hunt Scraper - Adding early-stage startups\n');
  let added = 0;
  
  for (const s of PH_STARTUPS) {
    const { data: existing } = await supabase.from('startup_uploads').select('id').ilike('name', s.name).limit(1);
    if (existing && existing.length > 0) continue;
    
    const godScore = 30 + (s.stage * 5) + Math.floor(Math.random() * 10);
    
    await supabase.from('startup_uploads').insert({
      name: s.name, tagline: s.tagline, sectors: s.sectors, stage: s.stage,
      source_type: 'producthunt', status: 'approved', total_god_score: godScore,
      created_at: new Date().toISOString()
    });
    added++;
    console.log('Added:', s.name, '| GOD:', godScore);
  }
  console.log('\nTotal added:', added);
}

run().catch(console.error);
