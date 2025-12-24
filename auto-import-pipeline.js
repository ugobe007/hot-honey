#!/usr/bin/env node
/**
 * AUTO-IMPORT PIPELINE
 * 
 * Runs automatically via PM2 to:
 * 1. Import quality startups from discovered_startups → startup_uploads
 * 2. Assign GOD scores to new imports
 * 3. Generate matches with investors
 * 
 * Schedule: Every 2 hours via PM2 cron
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Quality filters - reject junk names
const JUNK_PATTERNS = [
  /^[A-Z][a-z]+ [A-Z][a-z]+$/, // Personal names like "Kate Winslet"
  /^(The|A|An|In|On|At|For|With|About|This|That|These|Those)\s/i, // Articles at start
  /^(North|South|East|West)\s(Korea|America|Africa)/i, // Countries
  /^(State|Federal|Government|Department)/i, // Government entities
  /\b(ago|month|week|year|today|yesterday)\b/i, // Time references
  /^(CTO|CEO|CFO|COO|VP|Director|Manager)\s/i, // Job titles
  /^[A-Z]{2,3}$/,  // Just acronyms like "AI" or "ML"
  /^\d+/, // Starts with number
  /^(http|www\.)/i, // URLs
];

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;

function isQualityStartupName(name) {
  if (!name) return false;
  
  // Length check
  if (name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) return false;
  
  // Check against junk patterns
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(name)) return false;
  }
  
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  
  return true;
}

async function importDiscoveredStartups(limit = 50) {
  console.log(`\n📥 Importing up to ${limit} quality startups...`);
  
  // Get unimported discovered startups
  const { data: discovered, error } = await supabase
    .from('discovered_startups')
    .select('id, name, website, description')
    .eq('imported_to_startups', false)
    .order('created_at', { ascending: false })
    .limit(limit * 2); // Fetch extra to filter
  
  if (error) {
    console.error('Error fetching discovered startups:', error);
    return [];
  }
  
  if (!discovered || discovered.length === 0) {
    console.log('   No new startups to import');
    return [];
  }
  
  // Filter for quality names
  const quality = discovered.filter(s => isQualityStartupName(s.name));
  const toImport = quality.slice(0, limit);
  
  console.log(`   Found ${discovered.length} unimported, ${quality.length} quality names`);
  
  const imported = [];
  
  for (const startup of toImport) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .eq('name', startup.name)
      .single();
    
    if (existing) {
      // Mark as imported even if duplicate
      await supabase
        .from('discovered_startups')
        .update({ imported_to_startups: true, imported_at: new Date().toISOString() })
        .eq('id', startup.id);
      continue;
    }
    
    // Generate GOD score (55-75 range for RSS imports)
    const godScore = 55 + Math.floor(Math.random() * 20);
    
    // Insert into startup_uploads
    const { data: inserted, error: insertError } = await supabase
      .from('startup_uploads')
      .insert({
        name: startup.name,
        website: startup.website,
        description: startup.description || 'Startup discovered from news feeds',
        sectors: ['Technology'],
        status: 'approved',
        stage: 2, // Seed
        source_type: 'url',
        total_god_score: godScore,
        team_score: 50 + Math.floor(Math.random() * 20),
        traction_score: 45 + Math.floor(Math.random() * 25),
        market_score: 50 + Math.floor(Math.random() * 20),
        product_score: 50 + Math.floor(Math.random() * 20),
        vision_score: 50 + Math.floor(Math.random() * 20),
      })
      .select('id, name, total_god_score')
      .single();
    
    if (insertError) {
      console.error(`   ❌ Failed to import ${startup.name}:`, insertError.message);
      continue;
    }
    
    // Mark as imported
    await supabase
      .from('discovered_startups')
      .update({ 
        imported_to_startups: true, 
        imported_at: new Date().toISOString(),
        startup_id: inserted.id
      })
      .eq('id', startup.id);
    
    imported.push(inserted);
  }
  
  console.log(`   ✅ Imported ${imported.length} startups`);
  return imported;
}

async function generateMatchesForStartups(startups) {
  if (!startups || startups.length === 0) return 0;
  
  console.log(`\n🎯 Generating matches for ${startups.length} startups...`);
  
  // Get random investors for matching
  const { data: investors } = await supabase
    .from('investors')
    .select('id, sectors')
    .limit(100);
  
  if (!investors || investors.length === 0) {
    console.log('   No investors found');
    return 0;
  }
  
  let matchCount = 0;
  
  for (const startup of startups) {
    // Select 20 random investors for each startup
    const shuffled = investors.sort(() => Math.random() - 0.5).slice(0, 20);
    
    const matches = shuffled.map(investor => ({
      startup_id: startup.id,
      investor_id: investor.id,
      match_score: Math.max(40, Math.min(85, 
        Math.floor(startup.total_god_score * 0.6 + Math.random() * 15 + 
          (investor.sectors?.includes('Technology') ? 10 : 0))
      ))
    }));
    
    const { error } = await supabase
      .from('startup_investor_matches')
      .upsert(matches, { onConflict: 'startup_id,investor_id' });
    
    if (!error) {
      matchCount += matches.length;
    }
  }
  
  console.log(`   ✅ Generated ${matchCount} matches`);
  return matchCount;
}

async function logToDatabase(status, message, details = {}) {
  await supabase.from('ai_logs').insert({
    type: 'auto_import',
    action: 'pipeline_run',
    status,
    output: { message, ...details }
  });
}

async function runPipeline() {
  console.log('\n════════════════════════════════════════════');
  console.log('🚀 AUTO-IMPORT PIPELINE');
  console.log('════════════════════════════════════════════');
  console.log(`⏰ ${new Date().toISOString()}`);
  
  try {
    // Step 1: Import quality startups
    const imported = await importDiscoveredStartups(30);
    
    // Step 2: Generate matches for new imports
    const matchCount = await generateMatchesForStartups(imported);
    
    // Log results
    const summary = {
      startups_imported: imported.length,
      matches_generated: matchCount,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n════════════════════════════════════════════');
    console.log('✨ PIPELINE COMPLETE');
    console.log(`   Startups imported: ${imported.length}`);
    console.log(`   Matches generated: ${matchCount}`);
    console.log('════════════════════════════════════════════\n');
    
    await logToDatabase('success', 'Pipeline completed', summary);
    
  } catch (error) {
    console.error('Pipeline error:', error);
    await logToDatabase('error', error.message);
  }
}

// Run immediately
runPipeline();
