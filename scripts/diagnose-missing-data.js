#!/usr/bin/env node
/**
 * DIAGNOSE MISSING DATA
 * Analyzes startups and investors to identify missing fields
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseMissingData() {
  console.log('🔍 Diagnosing Missing Data...\n');
  console.log('═'.repeat(70));

  // ============================================================
  // STARTUP DATA ANALYSIS
  // ============================================================
  console.log('\n📊 STARTUP DATA ANALYSIS\n');

  const { data: startups, error: startupsError } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved');

  if (startupsError) {
    console.error('❌ Error fetching startups:', startupsError);
    return;
  }

  const totalStartups = startups?.length || 0;
  console.log(`Total Approved Startups: ${totalStartups}\n`);

  if (totalStartups === 0) {
    console.log('⚠️  No approved startups found!');
  } else {
    // Analyze missing fields
    const missingFields = {
      sectors: 0,
      // industries: 0, // Column doesn't exist in startup_uploads
      stage: 0,
      raise_amount: 0,
      raise_type: 0,
      tagline: 0,
      pitch: 0,
      website: 0,
      linkedin: 0,
      location: 0,
      team_size: 0,
      mrr: 0,
      revenue_annual: 0,
      extracted_data: 0,
      total_god_score: 0
    };

    startups?.forEach(startup => {
      if (!startup.sectors || startup.sectors.length === 0) missingFields.sectors++;
      // if (!startup.industries || startup.industries.length === 0) missingFields.industries++; // Column doesn't exist
      if (!startup.stage && startup.stage !== 0) missingFields.stage++;
      if (!startup.raise_amount) missingFields.raise_amount++;
      if (!startup.raise_type) missingFields.raise_type++;
      if (!startup.tagline) missingFields.tagline++;
      if (!startup.pitch) missingFields.pitch++;
      if (!startup.website) missingFields.website++;
      if (!startup.linkedin) missingFields.linkedin++;
      if (!startup.location) missingFields.location++;
      if (!startup.team_size) missingFields.team_size++;
      if (!startup.mrr) missingFields.mrr++;
      if (!startup.revenue_annual) missingFields.revenue_annual++;
      if (!startup.extracted_data) missingFields.extracted_data++;
      if (!startup.total_god_score && startup.total_god_score !== 0) missingFields.total_god_score++;
    });

    console.log('Missing Fields (Count & Percentage):');
    Object.entries(missingFields).forEach(([field, count]) => {
      const percentage = ((count / totalStartups) * 100).toFixed(1);
      const status = count === 0 ? '✅' : count < totalStartups * 0.2 ? '⚠️' : '❌';
      console.log(`  ${status} ${field.padEnd(20)}: ${count.toString().padStart(4)} (${percentage.padStart(5)}%)`);
    });
  }

  // ============================================================
  // INVESTOR DATA ANALYSIS
  // ============================================================
  console.log('\n💰 INVESTOR DATA ANALYSIS\n');

  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('*')
    .eq('status', 'active');

  if (investorsError) {
    console.error('❌ Error fetching investors:', investorsError);
    return;
  }

  const totalInvestors = investors?.length || 0;
  console.log(`Total Active Investors: ${totalInvestors}\n`);

  if (totalInvestors === 0) {
    console.log('⚠️  No active investors found!');
  } else {
    // Analyze missing fields
    const missingFields = {
      sectors: 0,
      // industries: 0, // May not exist in investors table
      stage: 0,
      check_size_min: 0,
      check_size_max: 0,
      bio: 0,
      linkedin: 0,
      website: 0,
      location: 0,
      investment_thesis: 0,
      partners: 0
    };

    investors?.forEach(investor => {
      if (!investor.sectors || investor.sectors.length === 0) missingFields.sectors++;
      // if (!investor.industries || investor.industries.length === 0) missingFields.industries++; // May not exist
      if (!investor.stage) missingFields.stage++;
      if (!investor.check_size_min) missingFields.check_size_min++;
      if (!investor.check_size_max) missingFields.check_size_max++;
      if (!investor.bio) missingFields.bio++;
      if (!investor.linkedin) missingFields.linkedin++;
      if (!investor.website) missingFields.website++;
      if (!investor.location) missingFields.location++;
      if (!investor.investment_thesis) missingFields.investment_thesis++;
      if (!investor.partners || investor.partners.length === 0) missingFields.partners++;
    });

    console.log('Missing Fields (Count & Percentage):');
    Object.entries(missingFields).forEach(([field, count]) => {
      const percentage = ((count / totalInvestors) * 100).toFixed(1);
      const status = count === 0 ? '✅' : count < totalInvestors * 0.2 ? '⚠️' : '❌';
      console.log(`  ${status} ${field.padEnd(20)}: ${count.toString().padStart(4)} (${percentage.padStart(5)}%)`);
    });
  }

  // ============================================================
  // SUMMARY & RECOMMENDATIONS
  // ============================================================
  console.log('\n' + '═'.repeat(70));
  console.log('📋 RECOMMENDATIONS\n');
  console.log('For Startups:');
  console.log('  1. Run: node scripts/enrichment/enrich-startup-uploads.js');
  console.log('  2. Run: node scripts/enrichment/enrich-startups-ai.js');
  console.log('  3. Run: node scripts/enrichment/enrich-locations.js');
  console.log('  4. Run: node scripts/enrichment/enrich-taglines-pitches.js');
  console.log('\nFor Investors:');
  console.log('  1. Run: node scripts/enrichment/enrich-investor-websites.js');
  console.log('  2. Run: enrich-investor-data.ts (TypeScript)');
  console.log('  3. Run: scripts/enrichment/enrich-yc-style-metrics.js');
  console.log('\n' + '═'.repeat(70));
}

diagnoseMissingData().catch(console.error);
