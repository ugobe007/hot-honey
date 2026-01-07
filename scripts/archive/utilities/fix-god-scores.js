require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const updates = [
  { name: 'LaunchPad AI', god: 32 },
  { name: 'CodeBuddy', god: 34 },
  { name: 'InvoiceFlow', god: 30 },
  { name: 'HealthTrack', god: 33 },
  { name: 'MeetingBot', god: 38 },
  { name: 'CryptoAlert', god: 31 },
  { name: 'DesignSync', god: 35 },
  { name: 'GreenCommute', god: 33 },
  { name: 'StudyAI', god: 32 },
  { name: 'DataPipe', god: 37 },
  { name: 'SQLite Cloud', god: 34 },
  { name: 'Deepgram Nova', god: 38 },
  { name: 'Ollama Local', god: 42 },
  { name: 'Pocketbase', god: 40 },
  { name: 'Turso DB', god: 38 },
  { name: 'Typesense', god: 39 },
  { name: 'Meilisearch', god: 37 },
  { name: 'Dub.co', god: 33 },
  { name: 'Trigger.dev', god: 36 },
  { name: 'Unkey API', god: 35 },
  { name: 'ShipFast', god: 44 },
  { name: 'Plausible', god: 48 },
  { name: 'Buttondown', god: 43 },
  { name: 'Bannerbear', god: 45 },
  { name: 'Fathom', god: 48 },
  { name: 'HostiFi', god: 46 },
  { name: 'SimpleAnalytics', god: 45 },
  { name: 'Logology', god: 38 },
  { name: 'Mailbrew', god: 39 },
  { name: 'SaaSFrame', god: 38 },
];

async function fix() {
  console.log('Updating GOD scores now that trigger is removed...\n');
  let updated = 0;
  
  for (const u of updates) {
    const { error } = await s.from('startup_uploads')
      .update({ total_god_score: u.god })
      .eq('name', u.name);
    
    if (!error) {
      updated++;
      console.log('Updated:', u.name, '-> GOD:', u.god);
    } else {
      console.log('Error:', u.name, error.message);
    }
  }
  
  console.log('\nTotal updated:', updated);
  
  // Verify
  const { data } = await s.from('startup_uploads')
    .select('name, total_god_score')
    .eq('name', 'InvoiceFlow')
    .single();
  
  console.log('\nVerify InvoiceFlow:', data);
}

fix();
