require('dotenv').config();
const s = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyze() {
  const { data } = await s.from('startup_uploads')
    .select('name, sectors, tagline')
    .eq('status', 'approved');
  
  // Find startups with ONLY AI/ML + SaaS (likely over-assigned)
  const overAssigned = data.filter(x => {
    const secs = (x.sectors || []).map(sec => sec.toLowerCase());
    return secs.length <= 2 && secs.every(sec => ['ai/ml', 'saas', 'ai', 'ml'].includes(sec));
  });
  
  console.log('Startups with ONLY AI/ML and/or SaaS:', overAssigned.length);
  console.log('\nSamples (likely wrong):');
  overAssigned.slice(0, 20).forEach(x => {
    console.log('  -', x.name, '|', x.sectors.join(', '), '| Tagline:', (x.tagline || '').substring(0, 50));
  });
  
  // Find startups with generic sectors we should remove
  const generic = data.filter(x => {
    const secs = (x.sectors || []).map(sec => sec.toLowerCase());
    return secs.some(sec => sec === 'technology' || sec === 'tech' || sec === 'internet');
  });
  
  console.log('\n\nStartups with generic technology sector:', generic.length);
  generic.slice(0, 10).forEach(x => {
    console.log('  -', x.name, '|', x.sectors.join(', '));
  });
}

analyze();
