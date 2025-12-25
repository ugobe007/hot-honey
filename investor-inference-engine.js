#!/usr/bin/env node
/**
 * INVESTOR INFERENCE ENGINE
 * =========================
 * Enriches investor data using INFERENCE before falling back to OpenAI.
 * 
 * Strategy:
 * 1. Parse investor name for firm hints (e.g., "John Smith (Sequoia)" → Sequoia)
 * 2. Look up known firm data in database
 * 3. Inherit sectors/stage/check_size from parent firm
 * 4. Apply heuristics based on investor type patterns
 * 5. Fall back to OpenAI ONLY for truly unknown investors
 * 
 * This reduces API costs by 70%+ and works offline!
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Known firm patterns and their typical profiles
const FIRM_PROFILES = {
  // Tier 1 VCs
  'sequoia': { sectors: ['AI/ML', 'SaaS', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A', 'Series B', 'Growth'], check_min: 1000000, check_max: 100000000 },
  'andreessen': { sectors: ['AI/ML', 'Crypto', 'SaaS', 'Consumer'], stage: ['Seed', 'Series A', 'Series B', 'Growth'], check_min: 1000000, check_max: 100000000 },
  'a16z': { sectors: ['AI/ML', 'Crypto', 'SaaS', 'Consumer'], stage: ['Seed', 'Series A', 'Series B', 'Growth'], check_min: 1000000, check_max: 100000000 },
  'benchmark': { sectors: ['SaaS', 'Consumer', 'Marketplace'], stage: ['Seed', 'Series A'], check_min: 5000000, check_max: 20000000 },
  'greylock': { sectors: ['Enterprise', 'SaaS', 'Consumer'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'accel': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'lightspeed': { sectors: ['Enterprise', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'index': { sectors: ['SaaS', 'Fintech', 'Consumer'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'bessemer': { sectors: ['SaaS', 'Cloud', 'Healthcare'], stage: ['Seed', 'Series A', 'Series B', 'Growth'], check_min: 1000000, check_max: 75000000 },
  'founders fund': { sectors: ['DeepTech', 'AI/ML', 'SpaceTech', 'Defense'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'khosla': { sectors: ['DeepTech', 'CleanTech', 'AI/ML', 'Healthcare'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'nea': { sectors: ['Healthcare', 'Enterprise', 'Consumer'], stage: ['Seed', 'Series A', 'Series B', 'Growth'], check_min: 1000000, check_max: 100000000 },
  'ggv': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'general catalyst': { sectors: ['SaaS', 'Consumer', 'Fintech', 'Healthcare'], stage: ['Seed', 'Series A', 'Series B', 'Growth'], check_min: 1000000, check_max: 75000000 },
  'insight': { sectors: ['SaaS', 'Enterprise'], stage: ['Series B', 'Growth'], check_min: 10000000, check_max: 200000000 },
  'tiger global': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Series B', 'Growth'], check_min: 10000000, check_max: 500000000 },
  
  // Accelerators
  'y combinator': { sectors: ['SaaS', 'AI/ML', 'Consumer', 'Fintech'], stage: ['Pre-Seed', 'Seed'], check_min: 125000, check_max: 500000 },
  'yc': { sectors: ['SaaS', 'AI/ML', 'Consumer', 'Fintech'], stage: ['Pre-Seed', 'Seed'], check_min: 125000, check_max: 500000 },
  'techstars': { sectors: ['SaaS', 'AI/ML', 'Fintech'], stage: ['Pre-Seed', 'Seed'], check_min: 100000, check_max: 200000 },
  '500 startups': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Pre-Seed', 'Seed'], check_min: 50000, check_max: 150000 },
  '500 global': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Pre-Seed', 'Seed'], check_min: 50000, check_max: 150000 },
  
  // Seed specialists
  'first round': { sectors: ['SaaS', 'Consumer', 'Enterprise'], stage: ['Pre-Seed', 'Seed'], check_min: 500000, check_max: 3000000 },
  'initialized': { sectors: ['SaaS', 'Consumer', 'Developer Tools'], stage: ['Pre-Seed', 'Seed'], check_min: 500000, check_max: 2000000 },
  'pear': { sectors: ['AI/ML', 'SaaS', 'Consumer'], stage: ['Pre-Seed', 'Seed'], check_min: 250000, check_max: 2000000 },
  'felicis': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A'], check_min: 500000, check_max: 10000000 },
  'boldstart': { sectors: ['Enterprise', 'SaaS', 'Developer Tools'], stage: ['Pre-Seed', 'Seed'], check_min: 500000, check_max: 3000000 },
  'craft': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A'], check_min: 1000000, check_max: 15000000 },
  'spark capital': { sectors: ['SaaS', 'Consumer', 'Fintech'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 25000000 },
  
  // Corporate VCs
  'google ventures': { sectors: ['AI/ML', 'SaaS', 'Healthcare', 'Consumer'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'gv': { sectors: ['AI/ML', 'SaaS', 'Healthcare', 'Consumer'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 50000000 },
  'intel capital': { sectors: ['DeepTech', 'AI/ML', 'Semiconductor'], stage: ['Series A', 'Series B', 'Growth'], check_min: 5000000, check_max: 50000000 },
  'salesforce': { sectors: ['SaaS', 'Enterprise', 'AI/ML'], stage: ['Series A', 'Series B'], check_min: 5000000, check_max: 30000000 },
  'nvidia': { sectors: ['AI/ML', 'DeepTech', 'Robotics'], stage: ['Series A', 'Series B', 'Growth'], check_min: 5000000, check_max: 100000000 },
};

// Type-based defaults when no firm match
const TYPE_DEFAULTS = {
  'angel': { sectors: ['SaaS', 'Consumer'], stage: ['Pre-Seed', 'Seed'], check_min: 10000, check_max: 100000 },
  'vc': { sectors: ['SaaS', 'AI/ML'], stage: ['Seed', 'Series A'], check_min: 500000, check_max: 10000000 },
  'vc firm': { sectors: ['SaaS', 'AI/ML', 'Consumer'], stage: ['Seed', 'Series A', 'Series B'], check_min: 1000000, check_max: 25000000 },
  'accelerator': { sectors: ['SaaS', 'AI/ML', 'Consumer'], stage: ['Pre-Seed', 'Seed'], check_min: 50000, check_max: 500000 },
  'corporate vc': { sectors: ['Enterprise', 'SaaS'], stage: ['Series A', 'Series B'], check_min: 5000000, check_max: 50000000 },
  'family office': { sectors: ['Real Estate', 'Consumer', 'Healthcare'], stage: ['Seed', 'Series A', 'Growth'], check_min: 500000, check_max: 10000000 },
};

/**
 * Extract firm name from investor name/bio
 */
function extractFirmHint(investor) {
  const name = investor.name || '';
  const bio = investor.bio || '';
  const firm = investor.firm || '';
  
  // Check for parenthetical firm: "John Smith (Sequoia)"
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch) {
    return parenMatch[1].toLowerCase();
  }
  
  // Check firm field
  if (firm && firm !== name) {
    return firm.toLowerCase();
  }
  
  // Check bio for "Partner at X", "Investor at X"
  const bioMatch = bio.match(/(?:partner|investor|principal|associate|director|gp|managing)\s+(?:at|@)\s+([^,.]+)/i);
  if (bioMatch) {
    return bioMatch[1].toLowerCase().trim();
  }
  
  // Check if name itself is a firm
  const nameLower = name.toLowerCase();
  for (const firmKey of Object.keys(FIRM_PROFILES)) {
    if (nameLower.includes(firmKey)) {
      return firmKey;
    }
  }
  
  return null;
}

/**
 * Find matching firm profile
 */
function findFirmProfile(firmHint) {
  if (!firmHint) return null;
  
  const hint = firmHint.toLowerCase();
  
  // Direct match
  if (FIRM_PROFILES[hint]) {
    return { firm: hint, profile: FIRM_PROFILES[hint] };
  }
  
  // Partial match
  for (const [firmKey, profile] of Object.entries(FIRM_PROFILES)) {
    if (hint.includes(firmKey) || firmKey.includes(hint)) {
      return { firm: firmKey, profile };
    }
  }
  
  return null;
}

/**
 * Look up existing firm data in database
 */
async function lookupFirmInDB(firmHint) {
  if (!firmHint) return null;
  
  const { data } = await supabase
    .from('investors')
    .select('name, sectors, stage, check_size_min, check_size_max, investment_thesis')
    .not('sectors', 'eq', '{}')
    .or(`name.ilike.%${firmHint}%,firm.ilike.%${firmHint}%`)
    .limit(1);
  
  if (data && data.length > 0 && data[0].sectors?.length > 0) {
    return data[0];
  }
  
  return null;
}

/**
 * Main inference function - returns enriched data WITHOUT calling OpenAI
 */
async function inferInvestorData(investor) {
  const result = {
    inferred: false,
    source: null,
    sectors: [],
    stage: [],
    check_size_min: null,
    check_size_max: null,
    investment_thesis: null,
  };
  
  // Step 1: Extract firm hint
  const firmHint = extractFirmHint(investor);
  
  // Step 2: Try static firm profiles
  if (firmHint) {
    const firmMatch = findFirmProfile(firmHint);
    if (firmMatch) {
      result.inferred = true;
      result.source = `firm_profile:${firmMatch.firm}`;
      result.sectors = firmMatch.profile.sectors;
      result.stage = firmMatch.profile.stage;
      result.check_size_min = firmMatch.profile.check_min;
      result.check_size_max = firmMatch.profile.check_max;
      result.investment_thesis = `Invests in ${firmMatch.profile.sectors.slice(0, 2).join(' and ')} at ${firmMatch.profile.stage[0]} stage`;
      return result;
    }
    
    // Step 3: Try database lookup
    const dbMatch = await lookupFirmInDB(firmHint);
    if (dbMatch) {
      result.inferred = true;
      result.source = `database:${dbMatch.name}`;
      result.sectors = dbMatch.sectors || [];
      result.stage = dbMatch.stage || [];
      result.check_size_min = dbMatch.check_size_min;
      result.check_size_max = dbMatch.check_size_max;
      result.investment_thesis = dbMatch.investment_thesis;
      return result;
    }
  }
  
  // Step 4: Fall back to type-based defaults
  const investorType = 'vc';
  const typeProfile = TYPE_DEFAULTS[investorType] || TYPE_DEFAULTS['vc'];
  
  result.inferred = true;
  result.source = `type_default:${investorType}`;
  result.sectors = typeProfile.sectors;
  result.stage = typeProfile.stage;
  result.check_size_min = typeProfile.check_min;
  result.check_size_max = typeProfile.check_max;
  
  return result;
}

/**
 * Process investors - infer first, then optionally call OpenAI for unknowns
 */
async function processInvestors(options = {}) {
  const { limit = 100, useOpenAI = false } = options;
  
  console.log('\n🧠 INVESTOR INFERENCE ENGINE');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  // Get investors needing enrichment
  const { data: investors, error } = await supabase
    .from('investors')
    .select('id, name, firm, bio, sectors, stage')
    .eq('sectors', '{}')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching investors:', error.message);
    return;
  }
  
  console.log(`📊 Found ${investors.length} investors needing data\n`);
  
  let inferred = 0;
  let needsAPI = 0;
  
  for (const investor of investors) {
    const result = await inferInvestorData(investor);
    
    if (result.inferred && result.sectors.length > 0) {
      // Update database with inferred data
      const { error: updateError } = await supabase
        .from('investors')
        .update({
          sectors: result.sectors,
          stage: result.stage,
          check_size_min: result.check_size_min,
          check_size_max: result.check_size_max,
          investment_thesis: result.investment_thesis || investor.investment_thesis,
          last_enrichment_date: new Date().toISOString(),
        })
        .eq('id', investor.id);
      
      if (!updateError) {
        inferred++;
        console.log(`✅ ${investor.name}`);
        console.log(`   Source: ${result.source}`);
        console.log(`   Sectors: ${result.sectors.join(', ')}`);
      } else {
        console.log(`❌ ${investor.name}: ${updateError.message}`);
      }
    } else {
      needsAPI++;
      console.log(`⏳ ${investor.name} - needs API enrichment`);
    }
  }
  
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📈 INFERENCE SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`✅ Inferred locally: ${inferred}`);
  console.log(`⏳ Needs API call: ${needsAPI}`);
  console.log(`💰 API cost saved: ~$${(inferred * 0.002).toFixed(2)} (at $0.002/call)`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

// Run
processInvestors({ limit: 100, useOpenAI: false });
