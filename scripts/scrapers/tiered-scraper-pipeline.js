#!/usr/bin/env node
/**
 * Tiered Scraper Pipeline
 * 
 * Implements the 3-tier ingestion system:
 * Tier 0: RSS/APIs → Tier 1: HTML/JSON → Tier 2: Browser/AI (only when needed)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
const { Tier0Extractor, Tier1Extractor, SmartExtractor } = require('./lib/tiered-extractors');
const EntityResolver = require('./lib/entity-resolver');
const InferenceGate = require('./lib/inference-gate');
const QualityGate = require('./lib/quality-gate'); // QUALITY VALIDATION

// YOUR INFERENCE ENGINE - Intellectual Property
// This fills gaps without API calls using heuristics
// Note: The inference engine runs in unified-scraper-orchestrator.js Step 2
// We'll ensure extracted_data structure exists here, full inference runs later

// Inference engine integration
// The inference engine fills gaps using heuristics (no API calls)
// We'll use a simplified version inline since the full engine isn't exported

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const parser = new Parser({ 
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  }
});
const entityResolver = new EntityResolver(supabase);

/**
 * Process RSS feed (Tier 0)
 */
async function processRSSFeed(feedUrl, sourceName) {
  console.log(`\n📡 Processing RSS: ${sourceName}`);
  console.log('─'.repeat(60));
  
  try {
    const feed = await parser.parseURL(feedUrl);
    console.log(`   Found ${feed.items.length} items`);
    
    let processed = 0;
    let saved = 0;
    let duplicates = 0;
    let errors = 0;
    let skippedNoName = 0;
    let skippedQuality = 0;
    
    for (const item of feed.items.slice(0, 20)) { // Limit to 20 for testing
      try {
        // Skip items that don't look like funding/news (more lenient - check description too)
        const title = item.title?.toLowerCase() || '';
        const description = (item.contentSnippet || item.description || '').toLowerCase();
        const combined = title + ' ' + description;
        
        // More lenient: allow if it mentions funding OR startup/company names OR raises/launches
        const hasFundingKeywords = /funding|raised|series|seed|investment|venture|startup|launches|secures|closes|raises|€|\$|million|billion|pre-seed|seed round|series [a-z]|ipo/.test(combined);
        const hasCompanyName = /[A-Z][a-z]+ (?:startup|company|firm|raises|secures|launches|gets|receives)/i.test(combined);
        
        if (!hasFundingKeywords && !hasCompanyName) {
          skippedNoName++;
          if (skippedNoName <= 3) {
            console.log(`   ⏭️  Skipping non-funding article: "${item.title?.substring(0, 60)}"`);
          }
          continue;
        }
        
        // Tier 0 extraction
        const contract = await Tier0Extractor.fromRSS(feedUrl, item);
        
        if (!contract || !contract.name) {
          skippedNoName++;
          if (skippedNoName <= 3) {
            console.log(`   ⏭️  No company name extracted from: "${item.title?.substring(0, 60)}"`);
          }
          continue;
        }
        
        // QUALITY GATE #1: Validate contract before enrichment
        const qualityCheck = QualityGate.validate(contract);
        if (!qualityCheck.valid) {
          skippedQuality++;
          if (skippedQuality <= 3) {
            console.log(`   ⏭️  Quality gate failed: ${contract.name} - ${qualityCheck.reason} (score: ${qualityCheck.score})`);
          }
          continue; // Skip this item
        }
        
        // Check for duplicates (using QualityGate which uses EntityResolver internally)
        const duplicateCheck = await QualityGate.checkDuplicate(supabase, contract);
        if (duplicateCheck.isDuplicate) {
          console.log(`   ⏭️  Duplicate: ${contract.name} (${duplicateCheck.matchType})`);
          duplicates++;
          await entityResolver.mergeEvidence(duplicateCheck.existingId, contract);
          continue;
        }
        
        // Check if needs enrichment
        const gateDecision = InferenceGate.shouldEnrichWithLLM(contract);
        
        if (gateDecision.shouldEnrich && gateDecision.action === 'llm_enrich') {
          console.log(`   🔍 Low confidence (${contract.confidence_scores.overall.toFixed(2)}), enriching...`);
          
          // Try Tier 1 extraction from article URL
          if (item.link) {
            const tier1Contract = await Tier1Extractor.fromHTML(item.link);
            if (tier1Contract) {
              // Merge Tier 0 + Tier 1
              if (tier1Contract.name && !contract.name) {
                contract.setField('name', tier1Contract.name, tier1Contract.confidence_scores.name, tier1Contract.provenance);
              }
              if (tier1Contract.website && !contract.website) {
                contract.setField('website', tier1Contract.website, tier1Contract.confidence_scores.website, tier1Contract.provenance);
              }
            }
          }
        }
        
        // QUALITY GATE #2: Re-validate after enrichment
        const finalQualityCheck = QualityGate.validate(contract);
        if (!finalQualityCheck.valid) {
          console.log(`   ⏭️  Quality gate failed after enrichment: ${finalQualityCheck.reason}`);
          continue;
        }
        
        // Convert to database record
        const record = contract.toDatabaseRecord();
        record.source_type = 'rss';
        record.source_url = item.link || feedUrl;
        record.status = 'approved';
        
        // STEP: Prepare for YOUR inference engine (runs in unified-scraper-orchestrator.js Step 2)
        // The inference engine fills gaps using heuristics (FREE, no API calls)
        // It takes: name, description, tagline, website, sectors, pitch
        // It creates: extracted_data { team, market, funding, product, traction, fivePoints }
        
        // Store contract metadata for inference engine
        if (!record.extracted_data) {
          record.extracted_data = {};
        }
        
        // Add confidence and provenance to extracted_data
        record.extracted_data.confidence = contract.confidence_scores.overall;
        record.extracted_data.provenance = contract.provenance;
        record.extracted_data.traction_signals = contract.traction_signals;
        record.extracted_data.team_signals = contract.team_signals;
        record.extracted_data.investor_signals = contract.investor_signals;
        record.extracted_data.source_evidence = contract.source_evidence;
        
        // Note: Full inference enrichment happens in unified-scraper-orchestrator.js Step 2
        // This ensures the inference engine has all the data it needs
        
        // QUALITY GATE #3: Final validation before database insert
        const preInsertCheck = QualityGate.validate(contract);
        if (!preInsertCheck.valid) {
          console.log(`   ⏭️  Final quality check failed: ${preInsertCheck.reason}`);
          continue;
        }
        
        // Check for duplicate name before insert
        const { data: existing } = await supabase
          .from('startup_uploads')
          .select('id, name')
          .ilike('name', record.name)
          .limit(1);
        
        if (existing && existing.length > 0) {
          console.log(`   ⏭️  Duplicate: ${contract.name} (exact name match)`);
          duplicates++;
          continue;
        }
        
        // Insert
        const { error } = await supabase
          .from('startup_uploads')
          .insert(record);
        
        if (error) {
          // Handle duplicate key error gracefully
          if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
            console.log(`   ⏭️  Duplicate: ${contract.name} (database constraint)`);
            duplicates++;
          } else {
            console.error(`   ❌ ${contract.name}: ${error.message}`);
            errors++;
          }
        } else {
          console.log(`   ✅ ${contract.name} (quality: ${preInsertCheck.score}, confidence: ${contract.confidence_scores.overall.toFixed(2)})`);
          saved++;
        }
        
        processed++;
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
        
      } catch (err) {
        console.error(`   ❌ Error processing item: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n   📊 Results: ${processed} processed, ${saved} saved, ${duplicates} duplicates, ${errors} errors`);
    if (skippedNoName > 0) {
      console.log(`   ⚠️  ${skippedNoName} skipped (no company name extracted)`);
    }
    if (skippedQuality > 0) {
      console.log(`   ⚠️  ${skippedQuality} skipped (quality gate failed)`);
    }
    
    return { processed, saved, duplicates, errors };
    
  } catch (error) {
    // Handle 403 errors gracefully
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.log(`   ⚠️  RSS feed blocked (403) - may require authentication or different User-Agent`);
      console.log(`   💡 Tip: This feed may need to be accessed differently or skipped`);
      return { processed: 0, saved: 0, duplicates: 0, errors: 1, blocked: true };
    }
    console.error(`   ❌ RSS feed error: ${error.message}`);
    return { processed: 0, saved: 0, duplicates: 0, errors: 1 };
  }
}

/**
 * Main pipeline
 */
async function runPipeline() {
  console.log('🚀 Tiered Scraper Pipeline');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Get active RSS sources (skip blocked ones)
  const { data: sources } = await supabase
    .from('rss_sources')
    .select('id, name, url, active')
    .eq('active', true)
    .limit(20); // Process more sources now that broken ones are deactivated
  
  if (!sources || sources.length === 0) {
    console.log('❌ No active RSS sources found');
    return;
  }
  
  console.log(`📡 Processing ${sources.length} RSS sources\n`);
  
  let totalStats = {
    processed: 0,
    saved: 0,
    duplicates: 0,
    errors: 0
  };
  
  for (const source of sources) {
    const stats = await processRSSFeed(source.url, source.name);
    totalStats.processed += stats.processed;
    totalStats.saved += stats.saved;
    totalStats.duplicates += stats.duplicates;
    totalStats.errors += stats.errors;
    
    // Rate limiting between sources
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log('📊 PIPELINE SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ Processed: ${totalStats.processed}`);
  console.log(`✅ Saved: ${totalStats.saved}`);
  console.log(`⏭️  Duplicates: ${totalStats.duplicates}`);
  console.log(`❌ Errors: ${totalStats.errors}`);
  if (totalStats.blocked > 0) {
    console.log(`🚫 Blocked (403): ${totalStats.blocked} feeds`);
    console.log(`   💡 These feeds may require authentication or different access`);
  }
  console.log(`\n💰 Cost Efficiency:`);
  console.log(`   - Tier 0 (RSS): ${totalStats.processed} items (free)`);
  console.log(`   - Tier 1 (HTML): ${totalStats.saved} items (minimal cost)`);
  console.log(`   - Tier 2 (Browser/AI): 0 items (saved tokens!)`);
  
  if (totalStats.processed === 0 && totalStats.errors === 0) {
    console.log(`\n⚠️  WARNING: Found RSS items but processed 0`);
    console.log(`   This usually means:`);
    console.log(`   1. Company name extraction failing (check extractCompanyName)`);
    console.log(`   2. Quality gates too strict (check quality-gate.js)`);
    console.log(`   3. All items are duplicates`);
    console.log(`   💡 Check the skipped counts above for details`);
  }
}

runPipeline().catch(console.error);

