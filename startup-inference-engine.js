#!/usr/bin/env node
/**
 * STARTUP INFERENCE ENGINE
 * ========================
 * Builds extracted_data from existing startup fields using inference.
 * No API calls needed!
 * 
 * Takes: name, description, tagline, website, sectors, pitch, stage, raise_amount
 * Creates: extracted_data { team, market, funding, product, traction, fivePoints }
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sector keywords for inference
const SECTOR_KEYWORDS = {
  'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural', 'gpt', 'llm', 'generative', 'automation'],
  'FinTech': ['fintech', 'banking', 'payment', 'finance', 'credit', 'lending', 'insurance', 'neobank', 'wallet', 'money'],
  'HealthTech': ['health', 'healthcare', 'medical', 'biotech', 'pharma', 'clinical', 'patient', 'diagnostic', 'therapeutics'],
  'SaaS': ['saas', 'software', 'platform', 'cloud', 'enterprise', 'b2b', 'workflow', 'erp', 'crm'],
  'E-Commerce': ['ecommerce', 'e-commerce', 'marketplace', 'retail', 'shopping', 'commerce'],
  'EdTech': ['education', 'edtech', 'learning', 'school', 'student', 'teaching', 'course'],
  'CleanTech': ['climate', 'clean', 'green', 'carbon', 'sustainability', 'renewable', 'energy', 'solar'],
  'Cybersecurity': ['security', 'cyber', 'encryption', 'privacy', 'fraud', 'identity', 'auth'],
  'Robotics': ['robot', 'robotics', 'autonomous', 'drone', 'humanoid'],
  'Developer Tools': ['developer', 'api', 'devops', 'infrastructure', 'code', 'sdk', 'git'],
  'Consumer': ['consumer', 'social', 'dating', 'lifestyle', 'entertainment', 'media'],
};

// Stage mapping
const STAGE_MAP = {
  0: 'Idea',
  1: 'Pre-Seed',
  2: 'Seed', 
  3: 'Series A',
  4: 'Series B',
  5: 'Series C+',
  6: 'Growth',
};

/**
 * Infer sectors from text
 */
function inferSectors(text) {
  if (!text) return ['Technology'];
  const lowerText = text.toLowerCase();
  const matched = [];
  
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        if (!matched.includes(sector)) matched.push(sector);
        break;
      }
    }
  }
  
  return matched.length > 0 ? matched.slice(0, 3) : ['Technology'];
}

/**
 * Parse raise amount to number
 */
function parseRaiseAmount(raiseStr) {
  if (!raiseStr) return null;
  const str = raiseStr.toString().toLowerCase();
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  
  if (str.includes('m') || str.includes('million')) return num * 1000000;
  if (str.includes('k') || str.includes('thousand')) return num * 1000;
  if (str.includes('b') || str.includes('billion')) return num * 1000000000;
  return num;
}

/**
 * Build extracted_data from existing fields
 */
function buildExtractedData(startup) {
  const text = `${startup.name} ${startup.tagline || ''} ${startup.description || ''} ${startup.pitch || ''}`;
  const sectors = startup.sectors?.length > 0 ? startup.sectors : inferSectors(text);
  const stageName = STAGE_MAP[startup.stage] || 'Seed';
  const raiseAmount = parseRaiseAmount(startup.raise_amount);
  
  // Build the 5-point summary
  const fivePoints = [
    startup.tagline || startup.description?.substring(0, 100) || `${startup.name} - innovative startup`,
    `Stage: ${stageName}`,
    sectors.join(', '),
    startup.website ? `Website: ${startup.website}` : 'Early stage startup',
    raiseAmount ? `Raising: $${(raiseAmount / 1000000).toFixed(1)}M` : `${stageName} stage funding`,
  ];
  
  const extractedData = {
    // Problem/Solution from description
    problem: startup.description ? `Addressing challenges in ${sectors[0] || 'technology'}` : null,
    solution: startup.tagline || startup.description?.substring(0, 150) || null,
    value_proposition: startup.tagline || startup.description?.substring(0, 100) || null,
    
    // Market info
    market: {
      sectors: sectors,
      location: startup.location || null,
    },
    
    // Funding info  
    funding: {
      stage: startup.stage || 2,
      stage_name: stageName,
      seeking: raiseAmount ? `$${(raiseAmount / 1000000).toFixed(1)}M ${stageName}` : null,
      raise_amount: raiseAmount,
    },
    
    // Product info (inferred)
    product: {
      launched: startup.is_launched || startup.website ? true : null,
      demo_available: startup.has_demo || null,
    },
    
    // Team info (from existing fields if available)
    team: {
      team_size: startup.team_size || startup.team_size_estimate || null,
      has_technical_cofounder: startup.has_technical_cofounder || null,
    },
    
    // Traction (from existing fields)
    traction: {
      mrr: startup.mrr || null,
      arr: startup.arr || null,
      customers: startup.customer_count || null,
      growth_rate: startup.growth_rate_monthly || null,
    },
    
    // Five points summary
    fivePoints: fivePoints,
    
    // Metadata
    sectors: sectors,
    industries: sectors,
    source: 'inferred',
    inferred_at: new Date().toISOString(),
  };
  
  return extractedData;
}

/**
 * Process startups
 */
async function processStartups(options = {}) {
  const { limit = 100 } = options;
  
  console.log('\n🚀 STARTUP INFERENCE ENGINE');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  // Get startups missing extracted_data
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('id, name, tagline, description, pitch, website, sectors, stage, raise_amount, location, team_size, team_size_estimate, has_technical_cofounder, is_launched, has_demo, mrr, arr, customer_count, growth_rate_monthly')
    .eq('status', 'approved')
    .is('extracted_data', null)
    .limit(limit);
  
  if (error) {
    console.error('Error fetching startups:', error.message);
    return;
  }
  
  console.log('📊 Found ' + startups.length + ' startups needing extracted_data\n');
  
  let success = 0;
  let failed = 0;
  
  for (const startup of startups) {
    const extractedData = buildExtractedData(startup);
    
    const { error: updateError } = await supabase
      .from('startup_uploads')
      .update({ extracted_data: extractedData })
      .eq('id', startup.id);
    
    if (!updateError) {
      success++;
      console.log('✅ ' + startup.name);
      console.log('   Sectors: ' + extractedData.sectors.join(', '));
      console.log('   Stage: ' + extractedData.funding.stage_name);
    } else {
      failed++;
      console.log('❌ ' + startup.name + ': ' + updateError.message);
    }
  }
  
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📈 INFERENCE SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ Enriched: ' + success);
  console.log('❌ Failed: ' + failed);
  console.log('💰 API cost: $0.00 (pure inference!)');
  console.log('════════════════════════════════════════════════════════════════\n');
}

processStartups({ limit: 100 });
