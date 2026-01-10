#!/usr/bin/env node
/**
 * FILL MISSING DATA
 * Comprehensive script to fill missing data for startups and investors
 * 
 * Usage:
 *   node scripts/fill-missing-data.js                    # Fill all missing data
 *   node scripts/fill-missing-data.js --startups-only    # Only startups
 *   node scripts/fill-missing-data.js --investors-only   # Only investors
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const args = process.argv.slice(2);
const startupsOnly = args.includes('--startups-only');
const investorsOnly = args.includes('--investors-only');

// Sector inference from description
function inferSectors(description, name) {
  if (!description && !name) return [];
  
  const text = ((description || '') + ' ' + (name || '')).toLowerCase();
  const sectors = [];
  
  const sectorKeywords = {
    'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural', 'gpt', 'llm', 'generative'],
    'FinTech': ['fintech', 'banking', 'payment', 'finance', 'credit', 'lending', 'insurance', 'insurtech', 'defi', 'crypto', 'blockchain'],
    'HealthTech': ['health', 'healthcare', 'medical', 'biotech', 'pharma', 'clinical', 'patient', 'diagnostic', 'therapeutics'],
    'SaaS': ['saas', 'software', 'platform', 'cloud', 'enterprise', 'b2b', 'automation', 'workflow'],
    'E-Commerce': ['ecommerce', 'e-commerce', 'marketplace', 'retail', 'shopping'],
    'EdTech': ['education', 'edtech', 'learning', 'school', 'student', 'course'],
    'CleanTech': ['climate', 'clean', 'green', 'carbon', 'sustainability', 'renewable', 'energy', 'solar'],
    'PropTech': ['real estate', 'proptech', 'property', 'housing', 'mortgage'],
    'FoodTech': ['food', 'restaurant', 'delivery', 'meal', 'grocery', 'agriculture'],
    'Cybersecurity': ['security', 'cyber', 'encryption', 'privacy', 'compliance'],
    'Developer Tools': ['developer', 'api', 'devops', 'infrastructure', 'code', 'sdk']
  };
  
  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      sectors.push(sector);
    }
  }
  
  return sectors.length > 0 ? sectors : ['Technology']; // Default
}

async function fillStartupData() {
  console.log('\n🚀 FILLING MISSING STARTUP DATA\n');
  console.log('═'.repeat(70));
  
  // Fetch startups with missing data
  const { data: startups, error } = await supabase
    .from('startup_uploads')
    .select('*')
    .eq('status', 'approved');
  
  if (error) {
    console.error('❌ Error fetching startups:', error);
    return;
  }
  
  if (!startups || startups.length === 0) {
    console.log('⚠️  No approved startups found!');
    return;
  }
  
  console.log(`📊 Processing ${startups.length} startups...\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const startup of startups) {
    const updates = {};
    let needsUpdate = false;
    
    // Fill missing sectors from description/name
    if (!startup.sectors || startup.sectors.length === 0) {
      const inferredSectors = inferSectors(startup.description || startup.pitch, startup.name);
      if (inferredSectors.length > 0) {
        updates.sectors = inferredSectors;
        needsUpdate = true;
      }
    }
    
    // Fill missing tagline from description
    if (!startup.tagline && startup.description) {
      updates.tagline = startup.description.substring(0, 200);
      needsUpdate = true;
    }
    
    // Use description as pitch if pitch is missing
    if (!startup.pitch && startup.description) {
      updates.pitch = startup.description;
      needsUpdate = true;
    }
    
    // Note: industries column doesn't exist in startup_uploads table
    // Only sectors is used
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('startup_uploads')
        .update(updates)
        .eq('id', startup.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${startup.name}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${startup.name}`);
        if (updates.sectors) console.log(`   → Sectors: ${updates.sectors.join(', ')}`);
        if (updates.tagline) console.log(`   → Tagline added`);
        updated++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
}

async function fillInvestorData() {
  console.log('\n💰 FILLING MISSING INVESTOR DATA\n');
  console.log('═'.repeat(70));
  
  // Fetch investors with missing data
  const { data: investors, error } = await supabase
    .from('investors')
    .select('*')
    .eq('status', 'active');
  
  if (error) {
    console.error('❌ Error fetching investors:', error);
    return;
  }
  
  if (!investors || investors.length === 0) {
    console.log('⚠️  No active investors found!');
    return;
  }
  
  console.log(`📊 Processing ${investors.length} investors...\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const investor of investors) {
    const updates = {};
    let needsUpdate = false;
    
    // Fill missing sectors from bio/name
    if (!investor.sectors || investor.sectors.length === 0) {
      const inferredSectors = inferSectors(investor.bio, investor.name);
      if (inferredSectors.length > 0) {
        updates.sectors = inferredSectors;
        needsUpdate = true;
      }
    }
    
    // Note: industries column may not exist in investors table
    // Only update if it exists - skip for now to avoid errors
    
    // Set default check sizes if missing (reasonable defaults)
    if (!investor.check_size_min && !investor.check_size_max) {
      // Default: $100K - $5M range for most VCs
      updates.check_size_min = 100000;
      updates.check_size_max = 5000000;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', investor.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${investor.name}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${investor.name}${investor.firm ? ` @ ${investor.firm}` : ''}`);
        if (updates.sectors) console.log(`   → Sectors: ${updates.sectors.join(', ')}`);
        if (updates.check_size_min) console.log(`   → Check size: $${updates.check_size_min.toLocaleString()} - $${updates.check_size_max.toLocaleString()}`);
        updated++;
      }
    } else {
      skipped++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
}

async function main() {
  console.log('\n🔧 FILL MISSING DATA SCRIPT');
  console.log('═'.repeat(70));
  
  if (!investorsOnly) {
    await fillStartupData();
  }
  
  if (!startupsOnly) {
    await fillInvestorData();
  }
  
  console.log('\n✅ Done!\n');
}

main().catch(console.error);
