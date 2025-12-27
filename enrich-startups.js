require('dotenv').config();
const { supabase } = require('./lib/scraper-db');

async function enrichStartups() {
  console.log('Startup Enrichment Pipeline\n');
  
  // Get startups needing enrichment (missing key fields)
  const { data: startups } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline, website, sectors, extracted_data')
    .or('website.is.null,sectors.is.null,sectors.eq.{}')
    .limit(50);
  
  console.log('Found', startups?.length || 0, 'startups needing enrichment\n');
  
  let enriched = 0;
  
  for (const s of startups || []) {
    const updates = {};
    const name = s.name.toLowerCase().replace(/\s+/g, '');
    
    // Guess website if missing
    if (!s.website) {
      updates.website = 'https://' + name + '.com';
    }
    
    // Infer sectors from name/tagline if missing
    if (!s.sectors || s.sectors.length === 0) {
      const text = (s.name + ' ' + (s.tagline || '')).toLowerCase();
      const sectors = [];
      if (/ai|ml|machine|neural|gpt|llm/.test(text)) sectors.push('AI/ML');
      if (/fintech|pay|bank|lend|finance/.test(text)) sectors.push('FinTech');
      if (/health|med|bio|pharma|clinic/.test(text)) sectors.push('HealthTech');
      if (/saas|software|cloud|platform/.test(text)) sectors.push('SaaS');
      if (/climate|clean|energy|solar|green/.test(text)) sectors.push('CleanTech');
      if (/security|cyber|privacy/.test(text)) sectors.push('Cybersecurity');
      if (/crypto|blockchain|web3|defi/.test(text)) sectors.push('Crypto');
      if (/retail|commerce|shop/.test(text)) sectors.push('E-commerce');
      if (sectors.length > 0) updates.sectors = sectors;
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('startup_uploads')
        .update(updates)
        .eq('id', s.id);
      
      if (!error) {
        console.log('  +', s.name, '-', Object.keys(updates).join(', '));
        enriched++;
      }
    }
  }
  
  console.log('\nEnriched:', enriched);
}

enrichStartups().then(() => process.exit(0));
