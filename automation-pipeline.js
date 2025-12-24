#!/usr/bin/env node
// 🔥 HOT MATCH AUTOMATION PIPELINE
// ================================
// Runs the complete discovery → parsing → scoring → matching pipeline
// 
// STAGES:
// 1. DISCOVER - Scrape articles, extract startup names
// 2. IMPORT - Move discovered startups to startup_uploads
// 3. ENRICH - Fetch additional data (website, description, etc.)
// 4. SCORE - Calculate GOD scores for new startups
// 5. APPROVE - Auto-approve startups meeting quality threshold
// 6. MATCH - Generate matches with investors
// 
// Run: node automation-pipeline.js
// PM2: pm2 start automation-pipeline.js --name pipeline --cron "0 */6 * * *"

const { createClient } = require('@supabase/supabase-js');
const { extractInferenceData } = require('./lib/inference-extractor');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuration
const CONFIG = {
  AUTO_APPROVE_THRESHOLD: 50,  // Auto-approve startups with GOD score >= 50
  BATCH_SIZE: 50,              // Process in batches
  MIN_DESCRIPTION_LENGTH: 50,  // Minimum description to be considered valid
};

// ============================================================================
// STAGE 1: IMPORT - Move discovered startups to startup_uploads
// ============================================================================

async function importDiscoveredStartups() {
  console.log('\n📥 STAGE 1: IMPORTING DISCOVERED STARTUPS');
  
  // Get discovered startups not yet imported
  const { data: discovered, error } = await supabase
    .from('discovered_startups')
    .select('*')
    .or('imported_to_startups.is.null,imported_to_startups.eq.false')
    .limit(CONFIG.BATCH_SIZE);
  
  if (error) {
    console.log('   ❌ Error fetching:', error.message);
    return 0;
  }
  
  if (!discovered || discovered.length === 0) {
    console.log('   ✅ No new startups to import');
    return 0;
  }
  
  console.log(`   Found ${discovered.length} startups to import`);
  
  let imported = 0;
  for (const startup of discovered) {
    // Check if already exists in startup_uploads
    const { data: existing } = await supabase
      .from('startup_uploads')
      .select('id')
      .ilike('name', startup.name)
      .limit(1);
    
    if (existing && existing.length > 0) {
      // Mark as imported without creating duplicate
      await supabase
        .from('discovered_startups')
        .update({ imported_to_startups: true, startup_id: existing[0].id })
        .eq('id', startup.id);
      continue;
    }
    
    // Run inference extraction on description to populate extracted_data
    const textToAnalyze = [
      startup.name,
      startup.description,
      startup.tagline,
      startup.pitch
    ].filter(Boolean).join('. ');
    
    // Use existing inference extractor (pattern-based, FREE, no AI cost)
    const inferenceData = textToAnalyze.length > 50 
      ? extractInferenceData(textToAnalyze, startup.article_url || startup.source_url || '')
      : null;
    
    // Merge with any existing extracted_data from discovered_startups
    const discoveredData = startup.extracted_data || {};
    const extractedData = {
      ...discoveredData,
      ...(inferenceData || {}),
      source: 'discovered_startups',
      imported_at: new Date().toISOString()
    };
    
    // Create new startup_upload record WITH extracted_data populated
    const { data: newStartup, error: insertError } = await supabase
      .from('startup_uploads')
      .insert({
        name: startup.name,
        website: startup.website || '',
        description: startup.description || `Discovered from ${startup.rss_source || 'news'}`,
        status: 'pending',
        source: startup.rss_source || 'discovery',
        source_url: startup.article_url || '',
        // CRITICAL: Populate extracted_data with inference results
        extracted_data: extractedData,
        // Use inference data for sectors if available
        sectors: extractedData.sectors || discoveredData.sectors || ['Technology']
      })
      .select()
      .single();
    
    if (!insertError && newStartup) {
      // Mark as imported
      await supabase
        .from('discovered_startups')
        .update({ imported_to_startups: true, startup_id: newStartup.id })
        .eq('id', startup.id);
      imported++;
    }
  }
  
  console.log(`   ✅ Imported ${imported} new startups`);
  return imported;
}

// ============================================================================
// STAGE 2: ENRICH - Fetch additional data for startups
// ============================================================================

async function enrichStartups() {
  console.log('\n🔍 STAGE 2: ENRICHING STARTUP DATA');
  
  // Get startups that need enrichment (no description or very short)
  const { data: needsEnrichment } = await supabase
    .from('startup_uploads')
    .select('id, name, website, description')
    .eq('status', 'pending')
    .or(`description.is.null,description.eq.''`)
    .limit(CONFIG.BATCH_SIZE);
  
  if (!needsEnrichment || needsEnrichment.length === 0) {
    console.log('   ✅ No startups need basic enrichment');
  } else {
    console.log(`   Found ${needsEnrichment.length} startups needing basic enrichment`);
    
    let enriched = 0;
    for (const startup of needsEnrichment) {
      // Add a placeholder description if missing
      if (!startup.description || startup.description.length < CONFIG.MIN_DESCRIPTION_LENGTH) {
        const description = `${startup.name} is an innovative startup. Visit ${startup.website || 'their website'} to learn more.`;
        
        await supabase
          .from('startup_uploads')
          .update({ description })
          .eq('id', startup.id);
        
        enriched++;
      }
    }
    
    console.log(`   ✅ Basic enrichment: ${enriched} startups`);
  }
  
  // Now run AI inference enrichment for extracted_data
  return await enrichStartupsWithInference();
}

/**
 * Use AI inference to populate extracted_data for GOD scoring
 */
async function enrichStartupsWithInference() {
  console.log('\n   🤖 Running AI inference enrichment...');
  
  try {
    const { execSync } = require('child_process');
    const path = require('path');
    
    // Run the Node.js wrapper script
    const scriptPath = path.join(__dirname, 'scripts', 'enrich-startups-inference.js');
    const result = execSync(
      `node "${scriptPath}" --limit ${CONFIG.BATCH_SIZE} --missing`,
      { 
        encoding: 'utf-8',
        stdio: 'pipe',
        env: {
          ...process.env,
          SUPABASE_URL: SUPABASE_URL,
          SUPABASE_SERVICE_KEY: SUPABASE_KEY
        }
      }
    );
    
    // Parse result to get enriched count
    const match = result.match(/✅ Enriched: (\d+)/);
    const enriched = match ? parseInt(match[1]) : 0;
    
    if (enriched > 0) {
      console.log(`   ✅ Inference enrichment: ${enriched} startups enriched`);
    } else {
      console.log('   ✅ No startups needed inference enrichment');
    }
    
    return enriched;
  } catch (error) {
    console.error('   ⚠️  Inference enrichment failed (non-critical):', error.message);
    // Don't fail the pipeline if enrichment fails - it's handled by PM2 job
    return 0;
  }
}

// ============================================================================
// STAGE 3: SCORE - Calculate GOD scores
// ============================================================================

async function calculateGodScores() {
  console.log('\n📊 STAGE 3: CALCULATING GOD SCORES');
  
  // Get startups without GOD scores
  const { data: needsScoring } = await supabase
    .from('startup_uploads')
    .select('*')
    .or('total_god_score.is.null,total_god_score.eq.0')
    .limit(CONFIG.BATCH_SIZE);
  
  if (!needsScoring || needsScoring.length === 0) {
    console.log('   ✅ All startups have GOD scores');
    return 0;
  }
  
  console.log(`   Found ${needsScoring.length} startups to score`);
  
  let scored = 0;
  for (const startup of needsScoring) {
    // Calculate component scores based on available data
    const teamScore = calculateTeamScore(startup);
    const tractionScore = calculateTractionScore(startup);
    const marketScore = calculateMarketScore(startup);
    const productScore = calculateProductScore(startup);
    
    // Total GOD score (weighted average)
    const totalScore = Math.round(
      (teamScore * 0.25) + 
      (tractionScore * 0.25) + 
      (marketScore * 0.25) + 
      (productScore * 0.25)
    );
    
    await supabase
      .from('startup_uploads')
      .update({
        team_score: teamScore,
        traction_score: tractionScore,
        market_score: marketScore,
        product_score: productScore,
        total_god_score: totalScore,
      })
      .eq('id', startup.id);
    
    scored++;
  }
  
  console.log(`   ✅ Scored ${scored} startups`);
  return scored;
}

function calculateTeamScore(startup) {
  let score = 50; // Base score
  
  // Check for team info
  if (startup.team && startup.team.length > 0) score += 20;
  if (startup.founders_count > 1) score += 10;
  if (startup.technical_cofounders > 0) score += 10;
  
  // Check extracted data
  const ext = startup.extracted_data || {};
  if (ext.team) score += 10;
  
  return Math.min(score, 100);
}

function calculateTractionScore(startup) {
  let score = 40; // Base score
  
  // Revenue indicators
  if (startup.revenue > 0 || startup.arr > 0) score += 30;
  if (startup.mrr > 10000) score += 20;
  
  // User indicators
  if (startup.active_users > 0 || startup.users > 0) score += 15;
  if (startup.customers > 0) score += 15;
  
  // Growth
  if (startup.growth_rate > 0) score += 10;
  
  return Math.min(score, 100);
}

function calculateMarketScore(startup) {
  let score = 50; // Base score
  
  // Market size
  if (startup.market_size > 1000000000) score += 25; // $1B+
  else if (startup.market_size > 100000000) score += 15; // $100M+
  
  // Sectors (hot sectors get bonus)
  const hotSectors = ['ai', 'ml', 'fintech', 'healthtech', 'climate', 'saas'];
  const sectors = (startup.sectors || startup.industries || []).map(s => s.toLowerCase());
  if (sectors.some(s => hotSectors.some(hs => s.includes(hs)))) score += 20;
  
  return Math.min(score, 100);
}

function calculateProductScore(startup) {
  let score = 50; // Base score
  
  // Product info
  if (startup.description && startup.description.length > 100) score += 15;
  if (startup.demo_available) score += 15;
  if (startup.launched) score += 10;
  if (startup.website) score += 10;
  
  return Math.min(score, 100);
}

// ============================================================================
// STAGE 4: AUTO-APPROVE - Approve startups meeting threshold
// ============================================================================

async function autoApproveStartups() {
  console.log('\n✅ STAGE 4: AUTO-APPROVING QUALITY STARTUPS');
  
  // Get pending startups with good GOD scores
  const { data: candidates } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score')
    .eq('status', 'pending')
    .gte('total_god_score', CONFIG.AUTO_APPROVE_THRESHOLD);
  
  if (!candidates || candidates.length === 0) {
    console.log(`   ✅ No startups meet auto-approve threshold (${CONFIG.AUTO_APPROVE_THRESHOLD}+)`);
    return 0;
  }
  
  console.log(`   Found ${candidates.length} startups to auto-approve`);
  
  const ids = candidates.map(c => c.id);
  const { error } = await supabase
    .from('startup_uploads')
    .update({ status: 'approved' })
    .in('id', ids);
  
  if (error) {
    console.log('   ❌ Error approving:', error.message);
    return 0;
  }
  
  console.log(`   ✅ Auto-approved ${candidates.length} startups`);
  return candidates.length;
}

// ============================================================================
// STAGE 5: GENERATE MATCHES
// ============================================================================

async function generateMatches() {
  console.log('\n🤝 STAGE 5: GENERATING MATCHES');
  
  // Get approved startups that need matches
  const { data: startupsToMatch } = await supabase
    .from('startup_uploads')
    .select('id, name, total_god_score, sectors, industries, stage')
    .eq('status', 'approved')
    .gte('total_god_score', 50)
    .limit(50);
  
  if (!startupsToMatch || startupsToMatch.length === 0) {
    console.log('   ✅ No startups need new matches');
    return 0;
  }
  
  // Get all investors
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name, sectors, stage')
    .limit(200);
  
  if (!investors || investors.length === 0) {
    console.log('   ❌ No investors found');
    return 0;
  }
  
  let matchesCreated = 0;
  
  for (const startup of startupsToMatch) {
    // Check how many matches this startup already has
    const { count: existingMatches } = await supabase
      .from('startup_investor_matches')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', startup.id);
    
    if (existingMatches >= 50) continue; // Already has enough matches
    
    // Find matching investors
    for (const investor of investors) {
      // Skip if match already exists
      const { data: existing } = await supabase
        .from('startup_investor_matches')
        .select('id')
        .eq('startup_id', startup.id)
        .eq('investor_id', investor.id)
        .limit(1);
      
      if (existing && existing.length > 0) continue;
      
      // Calculate match score
      const matchScore = calculateMatchScore(startup, investor);
      
      if (matchScore >= 50) {
        await supabase.from('startup_investor_matches').insert({
          startup_id: startup.id,
          investor_id: investor.id,
          match_score: matchScore,
          confidence_level: matchScore >= 80 ? 'high' : matchScore >= 60 ? 'medium' : 'low',
          reasoning: `GOD Score: ${startup.total_god_score}. Sector and stage alignment.`,
          status: 'pending'
        });
        matchesCreated++;
      }
    }
  }
  
  console.log(`   ✅ Created ${matchesCreated} new matches`);
  return matchesCreated;
}

function calculateMatchScore(startup, investor) {
  let score = startup.total_god_score || 50;
  
  // Sector match bonus
  const startupSectors = (startup.sectors || startup.industries || []).map(s => String(s).toLowerCase());
  const investorSectors = (investor.sectors || []).map(s => String(s).toLowerCase());
  
  const sectorMatch = startupSectors.some(ss => 
    investorSectors.some(is => ss.includes(is) || is.includes(ss))
  );
  if (sectorMatch) score += 15;
  
  // Stage match bonus
  const startupStage = String(startup.stage || '').toLowerCase();
  const investorStages = (investor.stage || []).map(s => String(s).toLowerCase());
  
  if (investorStages.some(is => startupStage.includes(is) || is.includes(startupStage))) {
    score += 10;
  }
  
  return Math.min(Math.round(score), 100);
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function runPipeline() {
  console.log('═'.repeat(60));
  console.log('🔥 HOT MATCH AUTOMATION PIPELINE');
  console.log('═'.repeat(60));
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const stats = {
    imported: 0,
    enriched: 0,
    scored: 0,
    approved: 0,
    matched: 0,
  };
  
  try {
    // Run all stages
    stats.imported = await importDiscoveredStartups();
    stats.enriched = await enrichStartups();
    stats.scored = await calculateGodScores();
    stats.approved = await autoApproveStartups();
    stats.matched = await generateMatches();
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 PIPELINE COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Startups Imported: ${stats.imported}`);
    console.log(`   Startups Enriched: ${stats.enriched}`);
    console.log(`   Startups Scored: ${stats.scored}`);
    console.log(`   Startups Approved: ${stats.approved}`);
    console.log(`   Matches Created: ${stats.matched}`);
    console.log(`⏰ Completed: ${new Date().toISOString()}`);
    console.log('═'.repeat(60));
    
    // Log to database
    await supabase.from('ai_logs').insert({
      type: 'pipeline_run',
      input: { timestamp: new Date().toISOString() },
      output: stats,
      status: 'success'
    });
    
  } catch (error) {
    console.error('\n❌ Pipeline error:', error.message);
    
    await supabase.from('ai_logs').insert({
      type: 'pipeline_run',
      input: { timestamp: new Date().toISOString() },
      output: { error: error.message },
      status: 'error'
    });
  }
}

// Run if called directly
runPipeline().catch(console.error);
