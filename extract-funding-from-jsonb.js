#!/usr/bin/env node
/**
 * Extract funding rounds from extracted_data JSONB fields
 * 
 * This script:
 * 1. Reads startups with funding info in extracted_data
 * 2. Parses funding amounts and rounds
 * 3. Creates funding_rounds records
 * 4. Handles various funding data formats
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Looking for:');
  console.error('   - VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Parse amount string (e.g., "$1.2M", "$500K", "1.5M") to numeric
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
 * Extract round type from funding stage or round info
 */
function extractRoundType(fundingStage, fundingRound, fundingAmount) {
  if (fundingRound) {
    const round = fundingRound.toLowerCase();
    if (round.includes('pre-seed') || round.includes('preseed')) return 'pre-seed';
    if (round.includes('seed')) return 'seed';
    if (round.includes('series a') || round.includes('series_a')) return 'series_a';
    if (round.includes('series b') || round.includes('series_b')) return 'series_b';
    if (round.includes('series c') || round.includes('series_c')) return 'series_c';
    if (round.includes('series d') || round.includes('series_d')) return 'series_d';
    if (round.includes('angel')) return 'angel';
    if (round.includes('bridge')) return 'bridge';
    return 'seed'; // default
  }
  
  if (fundingStage) {
    const stage = fundingStage.toLowerCase();
    if (stage.includes('pre-seed') || stage.includes('preseed')) return 'pre-seed';
    if (stage.includes('seed')) return 'seed';
    if (stage.includes('series a') || stage.includes('series_a')) return 'series_a';
    if (stage.includes('series b') || stage.includes('series_b')) return 'series_b';
    if (stage.includes('series c') || stage.includes('series_c')) return 'series_c';
    if (stage.includes('series d') || stage.includes('series_d')) return 'series_d';
  }
  
  // Infer from amount if available
  if (fundingAmount) {
    const amount = parseAmount(fundingAmount);
    if (amount) {
      if (amount < 100000) return 'pre-seed';
      if (amount < 5000000) return 'seed';
      if (amount < 15000000) return 'series_a';
      if (amount < 50000000) return 'series_b';
      return 'series_c';
    }
  }
  
  return 'seed'; // default
}

/**
 * Extract date from various sources
 */
function extractDate(extractedData) {
  // Try funding_date first
  if (extractedData.funding_date) {
    return extractedData.funding_date;
  }
  
  // Try latest_funding_date
  if (extractedData.latest_funding_date) {
    return extractedData.latest_funding_date;
  }
  
  // Try created_at as fallback (but this is less accurate)
  // We'll use null and let user fill in later
  return null;
}

/**
 * Main extraction function
 */
async function extractFundingRounds() {
  console.log('🔍 Extracting funding rounds from extracted_data...\n');
  
  // Get startups with funding info
  const { data: startups, error: fetchError } = await supabase
    .from('startup_uploads')
    .select('id, name, extracted_data, created_at')
    .not('extracted_data', 'is', null);
  
  if (fetchError) {
    console.error('❌ Error fetching startups:', fetchError);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('ℹ️  No startups with extracted_data found');
    return;
  }
  
  console.log(`📊 Found ${startups.length} startups with extracted_data\n`);
  
  let extracted = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const startup of startups) {
    try {
      const data = startup.extracted_data;
      if (!data) continue;
      
      // Check if we have any funding info
      const fundingAmount = data.funding_amount || data.latest_funding || data.total_funding;
      const fundingRound = data.funding_round;
      const fundingStage = data.funding_stage;
      
      if (!fundingAmount && !fundingRound && !fundingStage) {
        continue; // No funding info
      }
      
      // Check if round already exists
      const roundType = extractRoundType(fundingStage, fundingRound, fundingAmount);
      const amount = parseAmount(fundingAmount);
      const date = extractDate(data) || startup.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
      
      // Check for existing round
      const { data: existing } = await supabase
        .from('funding_rounds')
        .select('id')
        .eq('startup_id', startup.id)
        .eq('round_type', roundType)
        .eq('date', date)
        .limit(1)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create funding round
      const roundData = {
        startup_id: startup.id,
        round_type: roundType,
        amount: amount,
        valuation: null, // We don't have this in extracted_data usually
        date: date,
        lead_investor: data.lead_investor || null,
        investors: data.investors || (data.lead_investor ? [data.lead_investor] : []),
        source: 'extracted_data',
        source_url: null,
        announced: true
      };
      
      const { error: insertError } = await supabase
        .from('funding_rounds')
        .insert(roundData);
      
      if (insertError) {
        console.error(`❌ Error inserting ${startup.name}:`, insertError.message);
        errors++;
      } else {
        console.log(`✅ Extracted: ${startup.name} - ${roundType} (${fundingAmount || 'N/A'})`);
        extracted++;
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${startup.name}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n📈 Extraction Summary:');
  console.log(`   ✅ Extracted: ${extracted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total processed: ${startups.length}`);
}

// Run extraction
extractFundingRounds()
  .then(() => {
    console.log('\n✨ Extraction complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Extraction failed:', error);
    process.exit(1);
  });

