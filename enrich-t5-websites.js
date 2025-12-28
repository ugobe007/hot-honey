require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Known data for major companies (since they're established)
const KNOWN_COMPANIES = {
  'The Trade Desk': { is_launched: true, has_revenue: true, has_customers: true, revenue_annual: 1000000000 },
  'Optimizely': { is_launched: true, has_revenue: true, has_customers: true },
  'Drift': { is_launched: true, has_revenue: true, has_customers: true },
  'Demandbase': { is_launched: true, has_revenue: true, has_customers: true },
  'Branch.io': { is_launched: true, has_revenue: true, has_customers: true },
  'Singular': { is_launched: true, has_revenue: true, has_customers: true },
  'Crazy Egg': { is_launched: true, has_revenue: true, has_customers: true },
  'Mouseflow': { is_launched: true, has_revenue: true, has_customers: true },
  'VWO': { is_launched: true, has_revenue: true, has_customers: true },
  'Instapage': { is_launched: true, has_revenue: true, has_customers: true },
  'Kameleoon': { is_launched: true, has_revenue: true, has_customers: true },
  'Lucky Orange': { is_launched: true, has_revenue: true, has_customers: true },
  'AB Tasty': { is_launched: true, has_revenue: true, has_customers: true },
  'Dash Hudson': { is_launched: true, has_revenue: true, has_customers: true },
  'Emplifi': { is_launched: true, has_revenue: true, has_customers: true }
};

async function enrichKnown() {
  console.log('Enriching known T5 companies with real data...\n');
  
  let updated = 0;
  for (const [name, data] of Object.entries(KNOWN_COMPANIES)) {
    const { error } = await supabase
      .from('startup_uploads')
      .update(data)
      .ilike('name', name);
    
    if (error) {
      console.log('Error updating', name + ':', error.message);
    } else {
      console.log('Updated:', name);
      updated++;
    }
  }
  
  console.log('\nUpdated', updated, 'companies');
}

enrichKnown();
