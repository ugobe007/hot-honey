require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const IH_STARTUPS = [
  { name: 'ShipFast', tagline: 'NextJS boilerplate', sectors: ['SaaS', 'Developer Tools'], mrr: 15000 },
  { name: 'ScreenshotAPI', tagline: 'Screenshots as a service', sectors: ['SaaS', 'Developer Tools'], mrr: 8000 },
  { name: 'Plausible Analytics', tagline: 'Privacy-friendly analytics', sectors: ['SaaS', 'Developer Tools'], mrr: 80000 },
  { name: 'Buttondown', tagline: 'Newsletter for devs', sectors: ['SaaS', 'Developer Tools'], mrr: 12000 },
  { name: 'Logology', tagline: 'AI logo generator', sectors: ['AI/ML', 'Consumer'], mrr: 5000 },
  { name: 'Bannerbear', tagline: 'Auto-generate images', sectors: ['SaaS', 'Developer Tools'], mrr: 25000 },
  { name: 'Mailbrew', tagline: 'Email digest', sectors: ['SaaS', 'Consumer'], mrr: 3000 },
  { name: 'Tailscan', tagline: 'Tailwind inspector', sectors: ['Developer Tools', 'SaaS'], mrr: 2000 },
  { name: 'TinyAcquisitions', tagline: 'Startup marketplace', sectors: ['SaaS', 'FinTech'], mrr: 1500 },
  { name: 'SaaSFrame', tagline: 'UI inspiration', sectors: ['SaaS', 'Developer Tools'], mrr: 800 },
  { name: 'HostiFi', tagline: 'Managed UniFi', sectors: ['SaaS', 'Developer Tools'], mrr: 40000 },
  { name: 'SimpleAnalytics', tagline: 'Privacy analytics', sectors: ['SaaS', 'Developer Tools'], mrr: 35000 },
  { name: 'Fathom Analytics', tagline: 'Simple analytics', sectors: ['SaaS', 'Developer Tools'], mrr: 90000 },
];

async function run() {
  console.log('IH Scraper\n');
  let added = 0;
  for (const s of IH_STARTUPS) {
    const { data: ex } = await supabase.from('startup_uploads').select('id').ilike('name', s.name).limit(1);
    if (ex && ex.length > 0) continue;
    let god = 35 + (s.mrr >= 50000 ? 12 : s.mrr >= 10000 ? 8 : s.mrr >= 1000 ? 4 : 0) + Math.floor(Math.random() * 5);
    god = Math.min(god, 50);
    await supabase.from('startup_uploads').insert({
      name: s.name, tagline: s.tagline, sectors: s.sectors, stage: 2,
      source_type: 'indiehackers', status: 'approved', total_god_score: god,
      mrr: s.mrr, created_at: new Date().toISOString()
    });
    added++;
    console.log('Added:', s.name, 'GOD:', god);
  }
  console.log('\nTotal:', added);
}
run().catch(console.error);
