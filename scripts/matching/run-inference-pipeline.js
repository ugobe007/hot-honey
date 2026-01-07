#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('\n🔄 RUNNING INFERENCE PIPELINE\n');

async function runPipeline() {
  const [invBefore, startBefore] = await Promise.all([
    supabase.from('investors').select('id', { count: 'exact', head: true }).eq('sectors', '{}'),
    supabase.from('startup_uploads').select('id', { count: 'exact', head: true }).is('extracted_data', null).eq('status', 'approved')
  ]);
  
  console.log('Before: Investors needing data:', invBefore.count, '| Startups:', startBefore.count);

  await runInvestorInference();
  await runStartupInference();

  const [invAfter, startAfter] = await Promise.all([
    supabase.from('investors').select('id', { count: 'exact', head: true }).eq('sectors', '{}'),
    supabase.from('startup_uploads').select('id', { count: 'exact', head: true }).is('extracted_data', null).eq('status', 'approved')
  ]);
  
  console.log('\n✅ COMPLETE - Enriched:', (invBefore.count||0)-(invAfter.count||0), 'investors,', (startBefore.count||0)-(startAfter.count||0), 'startups');
}

async function runInvestorInference() {
  const FIRMS = {
    'sequoia': ['AI/ML', 'SaaS', 'Consumer'], 'a16z': ['AI/ML', 'Crypto', 'SaaS'], 'andreessen': ['AI/ML', 'Crypto', 'SaaS'],
    'benchmark': ['SaaS', 'Consumer'], 'greylock': ['Enterprise', 'SaaS'], 'accel': ['SaaS', 'Consumer', 'Fintech'],
    'first round': ['SaaS', 'Consumer'], 'initialized': ['SaaS', 'Developer Tools'], 'felicis': ['SaaS', 'Consumer', 'Fintech'],
    'boldstart': ['Enterprise', 'SaaS'], 'y combinator': ['SaaS', 'AI/ML'], 'yc': ['SaaS', 'AI/ML'], 'nea': ['Healthcare', 'Enterprise'],
    'khosla': ['DeepTech', 'CleanTech'], 'bessemer': ['SaaS', 'Cloud'], 'index': ['SaaS', 'Fintech'], 'lightspeed': ['Enterprise', 'Consumer'],
  };

  const { data: investors } = await supabase.from('investors').select('id, name, firm, bio').eq('sectors', '{}').limit(200);
  if (!investors?.length) { console.log('No investors need inference'); return; }

  let n = 0;
  for (const inv of investors) {
    const text = `${inv.name} ${inv.firm || ''} ${inv.bio || ''}`.toLowerCase();
    let sectors = ['SaaS', 'AI/ML'];
    for (const [firm, s] of Object.entries(FIRMS)) { if (text.includes(firm)) { sectors = s; break; } }
    if (inv.firm && inv.firm !== inv.name) {
      const { data: m } = await supabase.from('investors').select('sectors').ilike('name', `%${inv.firm}%`).not('sectors', 'eq', '{}').limit(1);
      if (m?.[0]?.sectors?.length) sectors = m[0].sectors;
    }
    await supabase.from('investors').update({ sectors, last_enrichment_date: new Date().toISOString() }).eq('id', inv.id);
    n++;
  }
  console.log('✅ Enriched', n, 'investors');
}

async function runStartupInference() {
  const KEYWORDS = {
    'AI/ML': ['ai', 'ml', 'gpt', 'llm'], 'FinTech': ['fintech', 'banking', 'payment', 'neobank'],
    'HealthTech': ['health', 'medical', 'biotech'], 'SaaS': ['saas', 'software', 'platform', 'cloud'],
    'CleanTech': ['climate', 'clean', 'carbon', 'energy'], 'EdTech': ['education', 'learning'],
  };

  const { data: startups } = await supabase.from('startup_uploads').select('id, name, tagline, description, sectors, stage, raise_amount, website').eq('status', 'approved').is('extracted_data', null).limit(200);
  if (!startups?.length) { console.log('No startups need inference'); return; }

  let n = 0;
  for (const s of startups) {
    const text = `${s.name} ${s.tagline || ''} ${s.description || ''}`.toLowerCase();
    let sectors = s.sectors?.length ? s.sectors : [];
    if (!sectors.length) { for (const [sec, kw] of Object.entries(KEYWORDS)) { if (kw.some(k => text.includes(k))) sectors.push(sec); } }
    if (!sectors.length) sectors = ['Technology'];
    const extractedData = {
      solution: s.tagline || s.description?.substring(0, 150),
      market: { sectors }, funding: { stage: s.stage || 2 },
      fivePoints: [s.tagline || s.name, sectors.join(', '), s.website || 'Early stage'],
      sectors, source: 'inferred', inferred_at: new Date().toISOString()
    };
    await supabase.from('startup_uploads').update({ extracted_data: extractedData }).eq('id', s.id);
    n++;
  }
  console.log('✅ Enriched', n, 'startups');
}

runPipeline().catch(console.error);
