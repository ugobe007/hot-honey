#!/usr/bin/env node
/**
 * MANUAL VC ADDER
 * Quick tool to add VCs manually to database
 * Usage: node add-vcs-manual.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Top VC firms from Dealroom, Forbes Midas, CB Insights
const TOP_VCS = [
  { name: 'Sequoia Capital', type: 'VC Firm', bio: 'Leading Silicon Valley venture capital firm' },
  { name: 'Andreessen Horowitz (a16z)', type: 'VC Firm', bio: 'Tech-focused venture capital firm' },
  { name: 'Accel', type: 'VC Firm', bio: 'Early stage venture capital firm' },
  { name: 'Benchmark', type: 'VC Firm', bio: 'Early stage technology venture firm' },
  { name: 'Greylock Partners', type: 'VC Firm', bio: 'Venture capital firm investing in consumer and enterprise' },
  { name: 'Lightspeed Venture Partners', type: 'VC Firm', bio: 'Multi-stage venture capital firm' },
  { name: 'Index Ventures', type: 'VC Firm', bio: 'International venture capital firm' },
  { name: 'NEA (New Enterprise Associates)', type: 'VC Firm', bio: 'One of the largest venture firms' },
  { name: 'Insight Partners', type: 'VC Firm', bio: 'Growth-stage venture capital and private equity firm' },
  { name: 'Tiger Global Management', type: 'VC Firm', bio: 'Technology-focused hedge fund and VC firm' },
  { name: 'Founders Fund', type: 'VC Firm', bio: 'San Francisco-based venture capital firm' },
  { name: 'Khosla Ventures', type: 'VC Firm', bio: 'Venture capital firm focused on technology' },
  { name: 'General Catalyst', type: 'VC Firm', bio: 'Venture capital firm focused on early stage investments' },
  { name: 'Battery Ventures', type: 'VC Firm', bio: 'Technology-focused investment firm' },
  { name: 'Bessemer Venture Partners', type: 'VC Firm', bio: 'One of the oldest venture capital firms' },
  { name: 'IVP (Institutional Venture Partners)', type: 'VC Firm', bio: 'Later-stage venture capital and growth equity firm' },
  { name: 'Coatue', type: 'VC Firm', bio: 'Technology-focused investment management firm' },
  { name: 'Thrive Capital', type: 'VC Firm', bio: 'Venture capital firm investing in internet and software' },
  { name: 'GGV Capital', type: 'VC Firm', bio: 'Expansion-stage venture capital firm' },
  { name: 'Union Square Ventures', type: 'VC Firm', bio: 'Venture capital firm focused on network effects' },
  { name: 'Spark Capital', type: 'VC Firm', bio: 'Venture capital firm investing in consumer and enterprise' },
  { name: 'Kleiner Perkins', type: 'VC Firm', bio: 'Venture capital firm investing in tech companies' },
  { name: 'Norwest Venture Partners', type: 'VC Firm', bio: 'Multi-stage investment firm' },
  { name: 'CRV (Charles River Ventures)', type: 'VC Firm', bio: 'Early-stage venture capital firm' },
  { name: 'Balderton Capital', type: 'VC Firm', bio: 'European venture capital firm' },
  { name: 'Atomico', type: 'VC Firm', bio: 'International technology investment firm' },
  { name: 'Lux Capital', type: 'VC Firm', bio: 'Venture capital firm investing in emerging science and technology' },
  { name: 'FirstMark Capital', type: 'VC Firm', bio: 'New York-based venture capital firm' },
  { name: 'Redpoint Ventures', type: 'VC Firm', bio: 'Early-stage venture capital firm' },
  { name: 'Iconiq Capital', type: 'VC Firm', bio: 'Investment and family office services firm' },
  { name: 'Ribbit Capital', type: 'VC Firm', bio: 'Venture capital firm focused on fintech' },
  { name: 'QED Investors', type: 'VC Firm', bio: 'Fintech-focused venture capital firm' },
  { name: 'Contrary', type: 'VC Firm', bio: 'Venture capital firm backing early-stage founders' },
  { name: 'Felicis Ventures', type: 'VC Firm', bio: 'Early-stage venture capital firm' },
  { name: 'Menlo Ventures', type: 'VC Firm', bio: 'Venture capital firm investing across stages' },
  { name: 'Canaan Partners', type: 'VC Firm', bio: 'Early-stage venture capital firm' },
  { name: 'GV (Google Ventures)', type: 'Corporate VC', bio: 'Venture capital arm of Alphabet Inc.' },
  { name: 'Intel Capital', type: 'Corporate VC', bio: 'Venture capital arm of Intel Corporation' },
  { name: 'Salesforce Ventures', type: 'Corporate VC', bio: 'Investment arm of Salesforce' },
  { name: 'Microsoft Ventures (M12)', type: 'Corporate VC', bio: 'Venture fund of Microsoft' },
  { name: 'Y Combinator', type: 'Accelerator', bio: 'Leading startup accelerator' },
  { name: 'Techstars', type: 'Accelerator', bio: 'Worldwide network that helps entrepreneurs' },
  { name: '500 Startups', type: 'Accelerator', bio: 'Early-stage venture fund and accelerator' },
  { name: 'Plug and Play Tech Center', type: 'Accelerator', bio: 'Innovation platform and accelerator' },
  { name: 'Sequoia Capital India', type: 'VC Firm', bio: 'Indian arm of Sequoia Capital' },
  { name: 'SoftBank Vision Fund', type: 'VC Firm', bio: 'Technology-focused investment fund' },
  { name: 'DST Global', type: 'VC Firm', bio: 'Investment firm focused on late-stage internet companies' },
  { name: 'Dragoneer Investment Group', type: 'VC Firm', bio: 'Technology growth investor' },
  { name: 'Altimeter Capital', type: 'VC Firm', bio: 'Investment firm focused on technology' },
  { name: 'Wellington Management', type: 'VC Firm', bio: 'Investment management firm' }
];

async function addVCs() {
  console.log('\n🔥 ADDING TOP 50 VC FIRMS\n');
  console.log('═'.repeat(60));
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const vc of TOP_VCS) {
    // Check if exists
    const { data: existing } = await supabase
      .from('investors')
      .select('id')
      .ilike('name', vc.name)
      .single();
    
    if (existing) {
      console.log(`⏭️  ${vc.name} - Already exists`);
      skipped++;
      continue;
    }
    
    // Insert
    const { error } = await supabase
      .from('investors')
      .insert({
        name: vc.name,
        type: vc.type,
        bio: vc.bio,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.log(`❌ ${vc.name} - Error: ${error.message}`);
      errors++;
    } else {
      console.log(`✅ ${vc.name}`);
      added++;
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS:');
  console.log(`   ✅ Added: ${added}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📈 Total: ${TOP_VCS.length}`);
  console.log('═'.repeat(60) + '\n');
  
  console.log('✅ Done! Go to /investors to see all VCs.\n');
}

addVCs();
