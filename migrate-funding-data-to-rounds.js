/**
 * Migrate funding_data table to funding_rounds table
 * 
 * This script:
 * 1. Reads funding rounds from funding_data table
 * 2. Matches companies to startups by name
 * 3. Inserts into funding_rounds table
 * 4. Handles duplicates and data quality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse amount string (e.g., "$1.2M", "$500K") to numeric
 */
function parseAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') return null;
  
  const cleaned = amountStr.replace(/[$,]/g, '').trim();
  const match = cleaned.match(/^([\d.]+)([KMkmB]?)$/);
  
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  const multipliers = {
    'K': 1000,
    'M': 1000000,
    'B': 1000000000
  };
  
  return value * (multipliers[unit] || 1);
}

/**
 * Parse valuation string to numeric
 */
function parseValuation(valuationStr) {
  return parseAmount(valuationStr);
}

/**
 * Normalize company name for matching
 */
function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find startup by name (fuzzy match)
 */
async function findStartupByName(companyName) {
  const normalized = normalizeName(companyName);
  
  // Try exact match first
  const { data: exact, error: exactError } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .ilike('name', companyName)
    .limit(1)
    .single();
  
  if (exact && !exactError) {
    return exact.id;
  }
  
  // Try normalized match
  const { data: normalizedMatch, error: normError } = await supabase
    .from('startup_uploads')
    .select('id, name')
    .limit(100);
  
  if (normalizedMatch) {
    const match = normalizedMatch.find(s => 
      normalizeName(s.name) === normalized
    );
    if (match) return match.id;
  }
  
  return null;
}

/**
 * Main migration function
 */
async function migrateFundingData() {
  console.log('🚀 Starting funding data migration...\n');
  
  // Get all funding data
  const { data: fundingData, error: fetchError } = await supabase
    .from('funding_data')
    .select('*')
    .order('date', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching funding_data:', fetchError);
    return;
  }
  
  if (!fundingData || fundingData.length === 0) {
    console.log('ℹ️  No funding data found in funding_data table');
    return;
  }
  
  console.log(`📊 Found ${fundingData.length} funding records\n`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const funding of fundingData) {
    try {
      // Find matching startup
      const startupId = await findStartupByName(funding.company_name);
      
      if (!startupId) {
        console.log(`⚠️  No startup found for: ${funding.company_name}`);
        skipped++;
        continue;
      }
      
      // Check if this round already exists
      const { data: existing } = await supabase
        .from('funding_rounds')
        .select('id')
        .eq('startup_id', startupId)
        .eq('round_type', funding.round_type)
        .eq('date', funding.date)
        .limit(1)
        .single();
      
      if (existing) {
        console.log(`⏭️  Skipping duplicate: ${funding.company_name} - ${funding.round_type} on ${funding.date}`);
        skipped++;
        continue;
      }
      
      // Prepare funding round data
      const roundData = {
        startup_id: startupId,
        round_type: funding.round_type,
        amount: parseAmount(funding.amount),
        valuation: parseValuation(funding.valuation),
        date: funding.date,
        lead_investor: funding.investors && funding.investors.length > 0 
          ? funding.investors[0] 
          : null,
        investors: funding.investors || [],
        source: funding.source || 'funding_data',
        source_url: funding.source_url || null,
        announced: true
      };
      
      // Insert into funding_rounds
      const { error: insertError } = await supabase
        .from('funding_rounds')
        .insert(roundData);
      
      if (insertError) {
        console.error(`❌ Error inserting ${funding.company_name}:`, insertError.message);
        errors++;
      } else {
        console.log(`✅ Migrated: ${funding.company_name} - ${funding.round_type} (${funding.amount})`);
        migrated++;
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${funding.company_name}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n📈 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${fundingData.length}`);
}

// Run migration
migrateFundingData()
  .then(() => {
    console.log('\n✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

