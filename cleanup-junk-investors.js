#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Protect known short-name investors
const PROTECTED_NAMES = ['TPG', 'KKR', 'NEA', 'a16z', 'GV', 'SVB', 'RRE', 'USV', 'QED', 'NFX', 'GGV', 'DCM', 'CRV', 'BMW', 'SAP'];

async function cleanupJunkInvestors() {
  console.log('🧹 Scanning for junk investors...\n');

  const { data, error } = await supabase.from('investors').select('id, name');
  if (error) {
    console.error('Error fetching investors:', error.message);
    return;
  }

  const junk = data.filter(i => {
    const name = i.name || '';
    
    // Protect known short names
    if (PROTECTED_NAMES.includes(name)) return false;
    
    return (
      // Obvious scraper garbage
      name.includes('min read') ||
      name.includes(' ago ') ||
      name.includes('How the') ||
      name.includes('building SaaS') ||
      name.includes('operations for') ||
      name.includes('playbook for') ||
      name.includes('we build alongside') ||
      name.includes('that matter to') ||
      name.includes('IN BRIEF') ||
      name.includes('Insights Webinar') ||
      name.includes('Data What') ||
      name.includes('Cloud Consumer') ||
      name.includes('Enterprise Six') ||
      name.includes('for early stage') ||
      name.includes('Atlas Unlimited') ||
      name.includes('ML Cloud The') ||
      name.includes('Everest Systems') ||
      name.includes('new and future') ||
      name.includes('from six exceptional') ||
      name.includes('to competitor to') ||
      name.includes('private equity') ||
      name.includes('fund') && name.length < 20 ||
      name.includes('blockchain group') ||
      name.includes('joint ventures') ||
      name.includes('stage VC') ||
      name.includes('token strategies') ||
      name.includes('of schedule') ||
      name.startsWith('at ') ||
      name.startsWith('and ') ||
      name.startsWith('their ') ||
      name.startsWith('founded ') ||
      name.startsWith('on ') ||
      name.startsWith('launch ') ||
      name.startsWith('team ') ||
      /^[a-z]/.test(name) ||
      // Concatenated garbage
      (name.includes('Manager') && name.includes('Partner') && name.includes('Senior')) ||
      name.includes('ManagerVanessa') ||
      name.includes('PartnerSundeep') ||
      name.includes('happyInvesting') ||
      name.includes('Content Roy') ||
      name.includes('FagaGeneral') ||
      name.includes('PeechuManaging')
    );
  });

  console.log('Found ' + junk.length + ' junk investors out of ' + data.length + ' total\n');
  console.log('Sample junk names:');
  junk.slice(0, 20).forEach(j => console.log('  ❌ "' + j.name + '"'));

  if (junk.length === 0) {
    console.log('\n✅ No junk investors found!');
    return;
  }

  console.log('\n⚠️  About to delete ' + junk.length + ' junk investors.');
  console.log('Run with --delete flag to actually delete them.\n');

  if (process.argv.includes('--delete')) {
    console.log('🗑️  Deleting junk investors...');
    const ids = junk.map(j => j.id);
    
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error: delError } = await supabase
        .from('investors')
        .delete()
        .in('id', batch);
      
      if (delError) {
        console.error('Error deleting batch: ' + delError.message);
      } else {
        console.log('  Deleted batch ' + (Math.floor(i/100) + 1) + ': ' + batch.length + ' investors');
      }
    }
    
    console.log('\n✅ Deleted ' + junk.length + ' junk investors!');
  }
}

cleanupJunkInvestors();
