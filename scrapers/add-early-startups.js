require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const EARLY_STARTUPS = [
  // Product Hunt - very early (GOD 30-39)
  { name: 'LaunchPad AI', tagline: 'AI-powered landing page builder', sectors: ['AI/ML', 'SaaS'], god: 32, source: 'producthunt' },
  { name: 'CodeBuddy', tagline: 'Your AI pair programmer', sectors: ['AI/ML', 'Developer Tools'], god: 34, source: 'producthunt' },
  { name: 'InvoiceFlow', tagline: 'Automated invoicing', sectors: ['FinTech', 'SaaS'], god: 30, source: 'producthunt' },
  { name: 'HealthTrack', tagline: 'Personal health dashboard', sectors: ['HealthTech', 'Consumer'], god: 33, source: 'producthunt' },
  { name: 'MeetingBot', tagline: 'AI meeting notes', sectors: ['AI/ML', 'SaaS'], god: 38, source: 'producthunt' },
  { name: 'CryptoAlert', tagline: 'Crypto price alerts', sectors: ['Crypto', 'Consumer'], god: 31, source: 'producthunt' },
  { name: 'DesignSync', tagline: 'Figma to code', sectors: ['Developer Tools', 'SaaS'], god: 35, source: 'producthunt' },
  { name: 'GreenCommute', tagline: 'Carbon tracking', sectors: ['Climate', 'Consumer'], god: 33, source: 'producthunt' },
  { name: 'StudyAI', tagline: 'AI tutor', sectors: ['EdTech', 'AI/ML'], god: 32, source: 'producthunt' },
  { name: 'DataPipe', tagline: 'No-code data pipelines', sectors: ['SaaS', 'Developer Tools'], god: 37, source: 'producthunt' },
  
  // Hacker News - early with traction (GOD 33-42)
  { name: 'SQLite Cloud', tagline: 'Distributed SQLite', sectors: ['Developer Tools', 'SaaS'], god: 34, source: 'hackernews' },
  { name: 'Deepgram Nova', tagline: 'Speech-to-text API', sectors: ['AI/ML', 'Developer Tools'], god: 38, source: 'hackernews' },
  { name: 'Ollama Local', tagline: 'Run LLMs locally', sectors: ['AI/ML', 'Developer Tools'], god: 42, source: 'hackernews' },
  { name: 'Pocketbase', tagline: 'Open source Firebase', sectors: ['Developer Tools', 'SaaS'], god: 40, source: 'hackernews' },
  { name: 'Turso DB', tagline: 'Edge database', sectors: ['Developer Tools', 'SaaS'], god: 38, source: 'hackernews' },
  { name: 'Typesense', tagline: 'Open source Algolia', sectors: ['Developer Tools', 'SaaS'], god: 39, source: 'hackernews' },
  { name: 'Meilisearch', tagline: 'Fast search engine', sectors: ['Developer Tools', 'SaaS'], god: 37, source: 'hackernews' },
  { name: 'Dub.co', tagline: 'Open source Bitly', sectors: ['SaaS', 'Developer Tools'], god: 33, source: 'hackernews' },
  { name: 'Trigger.dev', tagline: 'Background jobs', sectors: ['Developer Tools', 'SaaS'], god: 36, source: 'hackernews' },
  { name: 'Unkey API', tagline: 'API key management', sectors: ['Developer Tools', 'SaaS'], god: 35, source: 'hackernews' },
  
  // Indie Hackers - bootstrapped with revenue (GOD 38-48)
  { name: 'ShipFast', tagline: 'NextJS boilerplate', sectors: ['SaaS', 'Developer Tools'], god: 44, source: 'indiehackers' },
  { name: 'Plausible', tagline: 'Privacy analytics', sectors: ['SaaS', 'Developer Tools'], god: 48, source: 'indiehackers' },
  { name: 'Buttondown', tagline: 'Newsletter for devs', sectors: ['SaaS', 'Developer Tools'], god: 43, source: 'indiehackers' },
  { name: 'Bannerbear', tagline: 'Auto-generate images', sectors: ['SaaS', 'Developer Tools'], god: 45, source: 'indiehackers' },
  { name: 'Fathom', tagline: 'Simple analytics', sectors: ['SaaS', 'Developer Tools'], god: 48, source: 'indiehackers' },
  { name: 'HostiFi', tagline: 'Managed UniFi', sectors: ['SaaS', 'Developer Tools'], god: 46, source: 'indiehackers' },
  { name: 'SimpleAnalytics', tagline: 'Privacy analytics', sectors: ['SaaS', 'Developer Tools'], god: 45, source: 'indiehackers' },
  { name: 'Logology', tagline: 'AI logo generator', sectors: ['AI/ML', 'Consumer'], god: 38, source: 'indiehackers' },
  { name: 'Mailbrew', tagline: 'Email digest', sectors: ['SaaS', 'Consumer'], god: 39, source: 'indiehackers' },
  { name: 'SaaSFrame', tagline: 'UI inspiration', sectors: ['SaaS', 'Developer Tools'], god: 38, source: 'indiehackers' },
];

async function run() {
  console.log('Adding early-stage startups (using url source_type)...\n');
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
      source_url: 'https://' + s.source + '.com/' + s.name.toLowerCase().replace(/ /g, '-'),
      status: 'approved',
      total_god_score: s.god,
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.log('Error:', s.name, error.message);
    } else {
      added++;
      console.log('Added:', s.name, '| GOD:', s.god, '| Source:', s.source);
    }
  }
  
  console.log('\nDone. Added:', added, '| Skipped:', skipped);
}

run().catch(console.error);
