/**
 * Scraper Database Abstraction Layer
 * All scrapers use this to insert data - handles schema quirks in one place
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Default values that satisfy all constraints
const DEFAULTS = {
  startup: {
    source_type: 'url',      // Constraint: manual, url
    status: 'approved',       // Constraint: approved, rejected, etc
    stage: 2,
    total_god_score: 40,
  },
  investor: {
    status: 'active',
  }
};

async function addStartup(data) {
  const record = {
    ...DEFAULTS.startup,
    ...data,
    created_at: new Date().toISOString(),
  };
  
  const { data: result, error } = await supabase
    .from('startup_uploads')
    .insert(record)
    .select();
  
  if (error) {
    console.error('addStartup error:', error.message);
    return null;
  }
  return result[0];
}

async function startupExists(name) {
  const { data } = await supabase
    .from('startup_uploads')
    .select('id')
    .ilike('name', name)
    .limit(1);
  return data && data.length > 0;
}

async function addInvestor(data) {
  const record = {
    ...DEFAULTS.investor,
    ...data,
  };
  
  const { data: result, error } = await supabase
    .from('investors')
    .insert(record)
    .select();
  
  if (error) {
    console.error('addInvestor error:', error.message);
    return null;
  }
  return result[0];
}

async function investorExists(name) {
  const { data } = await supabase
    .from('investors')
    .select('id')
    .ilike('name', name)
    .limit(1);
  return data && data.length > 0;
}

module.exports = {
  supabase,
  addStartup,
  startupExists,
  addInvestor,
  investorExists,
  DEFAULTS
};
