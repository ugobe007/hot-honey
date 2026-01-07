#!/usr/bin/env node

/**
 * Create Matches Table and Generate Initial Matches
 * 
 * This script:
 * 1. Creates the matches table in Supabase
 * 2. Generates matches for all approved/published startups
 * 3. Uses a simple matching algorithm based on investment focus
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Simple matching algorithm
function calculateMatchScore(startup, investor) {
  let score = 0;
  let reasons = [];

  // Base score
  score += 20;

  // Industry/Focus matching
  if (investor.investment_focus && startup.value_proposition) {
    const focus = investor.investment_focus.toLowerCase();
    const proposition = startup.value_proposition.toLowerCase();
    
    const keywords = ['ai', 'fintech', 'health', 'saas', 'crypto', 'climate', 'consumer', 'enterprise'];
    keywords.forEach(keyword => {
      if (focus.includes(keyword) && proposition.includes(keyword)) {
        score += 15;
        reasons.push('industry_match');
      }
    });
  }

  // Stage matching (if investor has stage preference)
  if (investor.investment_stage && startup.investment) {
    const invStage = investor.investment_stage.toLowerCase();
    const startupInv = startup.investment.toLowerCase();
    
    if (invStage.includes('seed') && startupInv.includes('seed')) {
      score += 20;
      reasons.push('stage_match');
    } else if (invStage.includes('series') && startupInv.includes('series')) {
      score += 15;
      reasons.push('stage_match');
    }
  }

  // Geography matching (if both have location data)
  if (investor.location && startup.team) {
    const invLocation = investor.location.toLowerCase();
    const startupInfo = startup.team.toLowerCase();
    
    const locations = ['san francisco', 'new york', 'boston', 'austin', 'seattle', 'london', 'singapore'];
    locations.forEach(loc => {
      if (invLocation.includes(loc) && startupInfo.includes(loc)) {
        score += 10;
        reasons.push('geography_match');
      }
    });
  }

  // Problem/Solution alignment
  if (investor.investment_thesis && startup.problem) {
    const thesis = investor.investment_thesis.toLowerCase();
    const problem = startup.problem.toLowerCase();
    
    // Simple keyword matching
    const commonWords = thesis.split(' ').filter(word => 
      word.length > 4 && problem.includes(word)
    );
    if (commonWords.length > 0) {
      score += Math.min(commonWords.length * 5, 15);
      reasons.push('thesis_alignment');
    }
  }

  // Random variance for diversity
  score += Math.random() * 10;

  // Cap at 100
  score = Math.min(Math.round(score), 100);

  return { score, reasons: [...new Set(reasons)] };
}

async function createMatchesTable() {
  console.log('📋 Creating matches table...');
  
  const sql = fs.readFileSync(
    path.join(__dirname, 'supabase-matches-table.sql'),
    'utf8'
  );

  try {
    // Execute the SQL via Supabase REST API is not directly possible
    // Instead, we'll check if table exists and skip if it does
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .limit(1);

    if (!error) {
      console.log('✅ Matches table already exists');
      return true;
    }

    console.log('⚠️  Please run the SQL migration manually:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy contents of supabase-matches-table.sql');
    console.log('   3. Execute the SQL');
    console.log('\n   Or use Supabase CLI: supabase db push');
    
    return false;
  } catch (error) {
    console.error('Error checking table:', error.message);
    return false;
  }
}

async function generateMatches() {
  console.log('\n🔄 Generating matches...\n');

  // Get startups (approved or published)
  const { data: startups, error: startupsError } = await supabase
    .from('startups')
    .select('*')
    .in('status', ['approved', 'published']);

  if (startupsError) {
    console.error('Error fetching startups:', startupsError.message);
    return;
  }

  // Get all investors
  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('*');

  if (investorsError) {
    console.error('Error fetching investors:', investorsError.message);
    return;
  }

  console.log(`📊 Found ${startups.length} startups and ${investors.length} investors`);

  // Generate matches
  const matches = [];
  let totalGenerated = 0;

  for (const startup of startups) {
    // Match with top 5-10 investors per startup
    const startupMatches = [];
    
    for (const investor of investors) {
      const { score, reasons } = calculateMatchScore(startup, investor);
      
      startupMatches.push({
        startup_id: startup.id,
        investor_id: investor.id,
        match_score: score,
        match_type: 'algorithm',
        status: 'suggested',
        match_reasons: reasons,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Sort by score and take top 10
    startupMatches.sort((a, b) => b.match_score - a.match_score);
    const topMatches = startupMatches.slice(0, 10);
    matches.push(...topMatches);

    console.log(`✅ ${startup.name}: ${topMatches.length} matches (top score: ${topMatches[0].match_score})`);
    totalGenerated += topMatches.length;
  }

  // Insert matches in batches
  console.log(`\n💾 Inserting ${matches.length} matches...`);
  
  const batchSize = 100;
  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('matches')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      console.log(`   Inserted batch ${i / batchSize + 1} (${batch.length} matches)`);
    }
  }

  console.log(`\n✅ Generated ${totalGenerated} total matches`);
}

async function showStats() {
  console.log('\n📊 Match Statistics:');
  console.log('='.repeat(60));

  // Get counts
  const { count: totalMatches } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });

  const { data: uniqueStartups } = await supabase
    .from('matches')
    .select('startup_id');
  
  const { data: uniqueInvestors } = await supabase
    .from('matches')
    .select('investor_id');

  const uniqueStartupCount = new Set(uniqueStartups?.map(m => m.startup_id)).size;
  const uniqueInvestorCount = new Set(uniqueInvestors?.map(m => m.investor_id)).size;

  console.log(`Total Matches: ${totalMatches}`);
  console.log(`Unique Startups Matched: ${uniqueStartupCount}`);
  console.log(`Unique Investors Matched: ${uniqueInvestorCount}`);

  // Top matches
  const { data: topMatches } = await supabase
    .from('matches')
    .select(`
      match_score,
      startups (name),
      investors (name)
    `)
    .order('match_score', { ascending: false })
    .limit(5);

  console.log('\n🏆 Top 5 Matches:');
  topMatches?.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.startups.name} ↔ ${m.investors.name} (${m.match_score})`);
  });

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('🚀 Matches Table Setup\n');

  // Check if we should create table
  const tableExists = await createMatchesTable();

  if (!tableExists) {
    console.log('\n⚠️  Please create the matches table first (see instructions above)');
    return;
  }

  // Check if matches already exist
  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`\n⚠️  Found ${count} existing matches.`);
    console.log('Do you want to regenerate? This will delete existing matches.');
    console.log('To regenerate, add --force flag');
    
    if (!process.argv.includes('--force')) {
      await showStats();
      return;
    }

    // Delete existing matches
    console.log('🗑️  Deleting existing matches...');
    await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Generate matches
  await generateMatches();

  // Show stats
  await showStats();
}

main();
