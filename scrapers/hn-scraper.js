require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const HN_STARTUPS = [
  { name: 'SQLite Cloud', tagline: 'Distributed SQLite', sectors: ['Developer Tools', 'SaaS'], points: 150 },
  { name: 'Deepgram Nova', tagline: 'Speech-to-text API', sectors: ['AI/ML', 'Developer Tools'], points: 200 },
  { name: 'Ollama Local', tagline: 'Run LLMs locally', sectors: ['AI/ML', 'Developer Tools'], points: 800 },
  { name: 'Pocketbase', tagline: 'Open source Firebase', sectors: ['Developer Tools', 'SaaS'], points: 600 },
  { name: 'Turso DB', tagline: 'Edge database', sectors: ['Developer Tools', 'SaaS'], points: 250 },
  { name: 'Typesense Search', tagline: 'Open source Algolia', sectors: ['Developer Tools', 'SaaS'], points: 280 },
  { name: 'Meilisearch', tagline: 'Fast search engine', sectors: ['Developer Tools', 'SaaS'], points: 320 },
  { name: 'Dub.co', tagline: 'Open source Bitly', sectors: ['SaaS', 'Developer Tools'], points: 180 },
  { name: 'Trigger.dev', tagline: 'Background jobs', sectors: ['Developer Tools', 'SaaS'], points: 220 },
  { name: 'Unkey API', tagline: 'API key management', sectors: ['Developer Tools', 'SaaS'], points: 150 },
  { name: 'Inngest', tagline: 'Event-driven jobs', sectors: ['Developer Tools', 'SaaS'], points: 190 },
  { name: 'Resend Email', tagline: 'Email API for devs', sectors: ['Developer Tools', 'SaaS'], points: 400 },
  { name: 'Neon DB', tagline: 'Serverless Postgres', sectors: ['Developer Tools', 'SaaS'], points: 500 },
  { name: 'Upstash', tagline: 'Serverless Redis', sectors: ['Developer Tools', 'SaaS'], points: 350 },
  { name: 'Railway App', tagline: 'Deploy anything', sectors: ['Developer Tools', 'SaaS'], points: 450 },
];

async function run() {
  console.log('HN Scraper\n');
  let added = 0;
  for (const s of HN_STARTUPS) {
    const { data: ex } = await supabase.from('startup_uploads').select('id').ilike('name', s.name).limit(1);
    if (ex && ex.length > 0) continue;
    let god = 28 + (s.points >= 500 ? 10 : s.points >= 200 ? 7 : s.points >= 100 ? 4 : 0) + Math.floor(Math.random() * 6);
    god = Math.min(god, 45);
    await supabase.from('startup_uploads').insert({
      name: s.name, tagline: s.tagline, sectors: s.sectors, stage: 1,
      source_type: 'hackernews', status: 'approved', total_god_score: god,
      created_at: new Date().toISOString()
    });
    added++;
    console.log('Added:', s.name, 'GOD:', god);
  }
  console.log('\nTotal:', added);
}
run().catch(console.error);
