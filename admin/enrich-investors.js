require('dotenv').config();
const { supabase } = require('../lib/scraper-db');

// Known VC data for enrichment
const KNOWN_VCS = {
  'khosla ventures': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'sequoia capital': { check_min: 1e6, check_max: 100e6, stages: ['Seed', 'Series A', 'Series B', 'Series C'] },
  'andreessen horowitz': { check_min: 1e6, check_max: 100e6, stages: ['Seed', 'Series A', 'Series B'] },
  'greylock partners': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'benchmark': { check_min: 5e6, check_max: 30e6, stages: ['Seed', 'Series A'] },
  'accel': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'first round capital': { check_min: 500e3, check_max: 10e6, stages: ['Pre-Seed', 'Seed'] },
  'y combinator': { check_min: 125e3, check_max: 500e3, stages: ['Pre-Seed', 'Seed'] },
  'founders fund': { check_min: 5e6, check_max: 100e6, stages: ['Seed', 'Series A', 'Series B'] },
  'bessemer venture partners': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'general catalyst': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'index ventures': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'lightspeed venture partners': { check_min: 1e6, check_max: 50e6, stages: ['Seed', 'Series A', 'Series B'] },
  'nea': { check_min: 5e6, check_max: 100e6, stages: ['Series A', 'Series B', 'Series C'] },
};

async function enrichInvestors() {
  console.log('Investor Enrichment Pipeline\n');
  
  // Get investors needing enrichment
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, firm, check_size_min, check_size_max, stage, sectors, photo_url')
    .or('check_size_min.is.null,stage.is.null,stage.eq.{}')
    .limit(100);
  
  console.log('Found', investors?.length || 0, 'investors needing enrichment\n');
  
  let enriched = 0;
  
  for (const inv of investors || []) {
    const updates = {};
    const nameLower = (inv.name || '').toLowerCase();
    
    // Check if known VC
    const known = KNOWN_VCS[nameLower];
    if (known) {
      if (!inv.check_size_min) updates.check_size_min = known.check_min;
      if (!inv.check_size_max) updates.check_size_max = known.check_max;
      if (!inv.stage || inv.stage.length === 0) updates.stage = known.stages;
    } else {
      // Default values based on name patterns
      if (!inv.check_size_min) {
        if (/angel|seed/i.test(inv.name)) {
          updates.check_size_min = 50e3;
          updates.check_size_max = 500e3;
        } else if (/capital|partners/i.test(inv.name)) {
          updates.check_size_min = 1e6;
          updates.check_size_max = 20e6;
        } else {
          updates.check_size_min = 500e3;
          updates.check_size_max = 10e6;
        }
      }
      
      if (!inv.stage || inv.stage.length === 0) {
        if (/angel|seed/i.test(inv.name)) {
          updates.stage = ['Pre-Seed', 'Seed'];
        } else {
          updates.stage = ['Seed', 'Series A'];
        }
      }
    }
    
    // Fix photo_url if missing or placeholder
    if (!inv.photo_url || inv.photo_url.includes('ui-avatars')) {
      const cleanName = (inv.firm || inv.name).replace(/[^a-zA-Z0-9]/g, '');
      updates.photo_url = 'https://logo.clearbit.com/' + cleanName.toLowerCase() + '.com';
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', inv.id);
      
      if (!error) {
        console.log('  +', inv.name, '-', Object.keys(updates).join(', '));
        enriched++;
      }
    }
  }
  
  console.log('\nEnriched:', enriched);
}

enrichInvestors().then(() => process.exit(0));
